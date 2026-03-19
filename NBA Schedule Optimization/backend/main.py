"""
FastAPI backend for the NBA Playoff Hold Release Tool.
Run with: uvicorn main:app --reload
"""

import os
import pandas as pd
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    SimulateRequest, SimulateResponse,
    LockRequest, LockResponse, UnlockRequest,
    StressTestRequest, StressTestResponse, StressTestResult,
    VenueProbabilities, DateProbability, MatchupCount,
    VenueInfo, DefaultSeedsResponse,
    NetRatingsUpdateRequest,
)
import numpy as np
from simulator import run_simulation, filter_samples, build_bracket, simulate_playin
from scheduler import schedule_bracket, FINALS_DATES
from seeds import default_first_round as _default_first_round
from conflict import get_conflict, get_matrix
from sessions import create_session, get_session, lock_series, unlock_series, reset_locks, set_game_cache
from seeds import EAST_SEEDS, WEST_SEEDS
import net_ratings as _net_ratings_module

# Path to data files (one directory up from backend/)
DATA_DIR = os.path.join(os.path.dirname(__file__), "..")

# Venue lookup: team name -> venue name
_venues_df: pd.DataFrame | None = None


def get_venues_df() -> pd.DataFrame:
    global _venues_df
    if _venues_df is None:
        _venues_df = pd.read_csv(os.path.join(DATA_DIR, "nba_venues.csv"))
    return _venues_df


def get_team_venue() -> dict[str, str]:
    df = get_venues_df()
    return dict(zip(df["Team"], df["Venue Name"]))


# Pre-warm conflict matrix on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    get_matrix(DATA_DIR)  # load and cache
    yield


app = FastAPI(title="NBA Playoff Hold Release API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to Vercel domain before production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/venues", response_model=list[VenueInfo])
def list_venues():
    df = get_venues_df()
    return [
        VenueInfo(team=row["Team"], venue=row["Venue Name"],
                  lat=row["Lat"], lon=row["Long"])
        for _, row in df.iterrows()
    ]


@app.get("/api/seeds/default", response_model=DefaultSeedsResponse)
def default_seeds():
    return DefaultSeedsResponse(east_seeds=EAST_SEEDS, west_seeds=WEST_SEEDS)


@app.get("/api/seeds/live")
def live_seeds():
    """Fetch current playoff seeds from ESPN standings. Falls back to hardcoded defaults."""
    import urllib.request
    import json as _json

    url = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = _json.loads(resp.read())

        east: list[str] = []
        west: list[str] = []

        for conf in data.get("children", []):
            conf_name = conf.get("name", "")
            entries = conf.get("standings", {}).get("entries", [])

            # Sort by playoffSeed stat; fall back to list order
            def seed_key(e):
                for stat in e.get("stats", []):
                    if stat.get("name") == "playoffSeed":
                        return float(stat.get("value", 99))
                return 99.0

            sorted_entries = sorted(entries, key=seed_key)
            teams = [e["team"]["displayName"] for e in sorted_entries[:10]]

            if "East" in conf_name:
                east = teams
            elif "West" in conf_name:
                west = teams

        if len(east) >= 8 and len(west) >= 8:
            return {"east_seeds": east, "west_seeds": west, "live": True}
    except Exception:
        pass

    return {"east_seeds": EAST_SEEDS, "west_seeds": WEST_SEEDS, "live": False}


@app.get("/api/events")
def get_events(venue: str, date: str):
    """Return competing (non-NBA) events at a venue on a given date."""
    NBA_KEYWORDS = [
        "vs.", "vs ", " at ", " @ ", "nba", "hawks", "celtics", "nets",
        "hornets", "bulls", "cavaliers", "mavericks", "nuggets", "pistons",
        "warriors", "rockets", "pacers", "clippers", "lakers", "grizzlies",
        "heat", "bucks", "timberwolves", "pelicans", "knicks", "thunder",
        "magic", "76ers", "suns", "trail blazers", "blazers", "kings", "spurs",
        "raptors", "jazz", "wizards",
    ]
    try:
        events_path = os.path.join(DATA_DIR, "nba_playoff_events_2026.csv")
        df = pd.read_csv(events_path, parse_dates=["date"])
        title_col = "name" if "name" in df.columns else "title"
        d = pd.Timestamp(date)
        filtered = df[(df["venue"] == venue) & (df["date"] == d)].copy()
        mask = ~filtered[title_col].str.lower().apply(
            lambda x: any(kw in str(x) for kw in NBA_KEYWORDS)
        )
        names = filtered[mask][title_col].dropna().tolist()
        return {"venue": venue, "date": date, "events": names[:10]}
    except Exception:
        return {"venue": venue, "date": date, "events": []}


@app.post("/api/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    east = req.east_seeds
    west = req.west_seeds
    has_playin = len(east) >= 10 and len(west) >= 10

    # Pre-compute conflict lookup dict (faster than DataFrame.loc in a tight loop)
    matrix = get_matrix(DATA_DIR)
    fast_conflict: dict[str, dict[str, float]] = {
        vname: {
            d.strftime("%Y-%m-%d"): float(v)
            for d, v in zip(matrix.columns, matrix.loc[vname].values)
            if v > 0
        }
        for vname in matrix.index
    }

    def conflict_fn(v: str, d) -> float:
        return fast_conflict.get(v, {}).get(d.strftime("%Y-%m-%d"), 0.0)

    team_venue = get_team_venue()

    # Seed global RNG for reproducibility; use per-sample RNG only for stagger offsets
    np.random.seed(42)
    samples = []
    game_cache = []

    for i in range(req.n_samples):
        stagger_rng = np.random.default_rng(i)

        if has_playin:
            # Simulate play-in to determine actual 7/8 seeds for this bracket sample
            actual_east, actual_west, playin_games = simulate_playin(
                east, west, team_venue
            )
        else:
            actual_east, actual_west, playin_games = east, west, []

        # Draw one bracket outcome with the determined seeds
        first_round = _default_first_round(actual_east[:8], actual_west[:8])
        sample = build_bracket(first_round)
        samples.append(sample)

        # Schedule bracket games with per-series stagger (rounds 1-3)
        scheduled = schedule_bracket(sample, team_venue, conflict_fn, rng=stagger_rng)
        bracket_games = [
            (g.venue, g.date.strftime("%Y-%m-%d"), g.round, g.home, g.away)
            for g in scheduled.games
        ]
        game_cache.append(playin_games + bracket_games)

    session_id = create_session(samples)
    set_game_cache(session_id, game_cache)

    return SimulateResponse(
        session_id=session_id,
        n_samples=len(samples),
        east_seeds=east[:8],
        west_seeds=west[:8],
    )


@app.get("/api/probabilities", response_model=VenueProbabilities)
def probabilities(session_id: str, venue: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if not session.game_cache:
        raise HTTPException(status_code=503, detail="Game schedule cache not ready — re-run simulation.")

    # Filter sample indices by locked results (same logic as filter_samples, by index)
    locked = session.locked
    active_indices: list[int] = []
    for i, s in enumerate(session.samples):
        match = True
        for key, result in locked.items():
            sr = s.series.get(key)
            if not sr:
                match = False
                break
            if result.get("winner") and sr.winner != result["winner"]:
                match = False
                break
            if result.get("length") and sr.length != result["length"]:
                match = False
                break
        if match:
            active_indices.append(i)

    if not active_indices:
        active_indices = [0]
    n = len(active_indices)

    # Count games at this venue per date using the pre-built cache — O(n * games_per_sample)
    date_counts: dict[str, int] = {}
    date_round_ceiling: dict[str, int] = {}
    date_matchups: dict[str, dict[tuple, int]] = {}
    cutoff = "2026-04-14"  # full playoff window including Round 1

    for idx in active_indices:
        for item in session.game_cache[idx]:
            if len(item) == 5:
                game_venue, date_str, round_num, home, away = item
            else:
                game_venue, date_str, round_num = item
                home, away = '', ''
            if game_venue == venue and date_str >= cutoff:
                date_counts[date_str] = date_counts.get(date_str, 0) + 1
                if round_num > date_round_ceiling.get(date_str, -1):
                    date_round_ceiling[date_str] = round_num
                if home and away:
                    dm = date_matchups.setdefault(date_str, {})
                    key = (home, away)
                    dm[key] = dm.get(key, 0) + 1

    date_range = pd.date_range("2026-04-14", "2026-06-19")
    dates = []
    for d in date_range:
        d_str = d.strftime("%Y-%m-%d")
        count = date_counts.get(d_str, 0)
        matchups_raw = date_matchups.get(d_str, {})
        top3 = sorted(matchups_raw.items(), key=lambda x: x[1], reverse=True)[:3]
        top_matchups = [
            MatchupCount(home=h, away=a, count=c, probability=round(c / n, 4))
            for (h, a), c in top3
        ]
        dates.append(DateProbability(
            date=d_str,
            probability=round(count / n, 4),
            round_ceiling=date_round_ceiling.get(d_str, -1),
            sample_count=n,
            top_matchups=top_matchups,
        ))

    return VenueProbabilities(
        session_id=session_id,
        venue=venue,
        locked_count=len(session.locked),
        sample_count=n,
        dates=dates,
    )


@app.post("/api/lock", response_model=LockResponse)
def lock(req: LockRequest):
    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    ok = lock_series(req.session_id, req.series_key, req.winner, req.length)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to lock series")

    # Return how many samples survive the new lock set
    active = filter_samples(session.samples, session.locked)
    return LockResponse(
        session_id=req.session_id,
        series_key=req.series_key,
        sample_count=len(active),
    )


@app.post("/api/unlock")
def unlock(req: UnlockRequest):
    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    unlock_series(req.session_id, req.series_key)
    active = filter_samples(session.samples, session.locked)
    return {"session_id": req.session_id, "series_key": req.series_key,
            "sample_count": len(active)}


@app.post("/api/reset-locks")
def reset(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    reset_locks(session_id)
    return {"session_id": session_id, "sample_count": len(session.samples)}


@app.post("/api/stress-test", response_model=StressTestResponse)
def stress_test(req: StressTestRequest):
    import numpy as np

    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    active_samples = filter_samples(session.samples, session.locked)
    team_venue = get_team_venue()

    def conflict_with_penalty(venue, date, weekend_penalty):
        base = get_conflict(venue, date, DATA_DIR)
        if date.weekday() >= 4:  # Fri=4, Sat=5, Sun=6
            return base * weekend_penalty
        return base

    def score_config(config) -> list[float]:
        import numpy as np
        r1_start = datetime.fromisoformat(config.r1_start)
        rng = np.random.default_rng(42)

        # Re-simulate brackets with this config's HCA if it differs from default
        hca = config.hca
        coeff = 0.15

        def win_prob(net_home, net_away):
            return 1.0 / (1.0 + np.exp(-coeff * (net_home - net_away + hca)))

        def sim_series_length(p_home_win):
            # Exact combinatorial series length distribution
            lengths = []
            probs = []
            p = p_home_win
            q = 1 - p
            for n in [4, 5, 6, 7]:
                games_before = n - 1
                # home wins in n: C(n-1,3) * p^4 * q^(n-4)
                from math import comb
                prob_home = comb(games_before, 3) * p**4 * q**(n - 4)
                prob_away = comb(games_before, 3) * q**4 * p**(n - 4)
                lengths.append(n)
                probs.append(prob_home + prob_away)
            probs = np.array(probs)
            probs /= probs.sum()
            return int(rng.choice(lengths, p=probs))

        net_ratings = dict(_net_ratings_module.NET_RTG)

        scores = []
        sample_pool = active_samples[:config.n_samples]
        for sample in sample_pool:
            total = 0.0
            round_end_dates: dict[str, datetime] = {}

            for round_num in [1, 2, 3, 4]:
                series_in_round = {k: v for k, v in sample.series.items()
                                   if v.round == round_num}
                for key, sr in series_in_round.items():
                    hv = team_venue.get(sr.home, sr.home)
                    av = team_venue.get(sr.away, sr.away)

                    # Recompute series length with this config's HCA
                    nr_home = net_ratings.get(sr.home, 0.0)
                    nr_away = net_ratings.get(sr.away, 0.0)
                    p = win_prob(nr_home, nr_away)
                    n = sim_series_length(p)

                    if round_num == 4:
                        venues = [hv, hv, av, av, hv, av, hv][:n]
                        for date, venue in zip(FINALS_DATES[:n], venues):
                            total += conflict_with_penalty(venue, date, config.weekend_penalty)
                        round_end_dates[key] = FINALS_DATES[n - 1]
                        continue

                    if round_num == 1:
                        earliest = r1_start
                    else:
                        prev_keys = [k for k, v in sample.series.items()
                                     if v.round == round_num - 1]
                        max_end = max(round_end_dates[k] for k in prev_keys
                                      if k in round_end_dates)
                        earliest = max_end + timedelta(days=config.min_round_rest)

                    venues = [hv, hv, av, av, hv, av, hv][:n]
                    cur = earliest
                    last_date = cur
                    for g in range(n):
                        venue = venues[g]
                        total += conflict_with_penalty(venue, cur, config.weekend_penalty)
                        travel = 1 if g + 1 < n and venues[g + 1] != venue else 0
                        last_date = cur
                        cur += timedelta(days=config.min_rest_days + 1 + travel)
                    round_end_dates[key] = last_date

            scores.append(total)
        return scores

    scores_a = score_config(req.config_a)
    scores_b = score_config(req.config_b)

    def summarize(scores: list[float]) -> StressTestResult:
        arr = scores
        return StressTestResult(
            mean_conflict=round(sum(arr) / len(arr), 4),
            std_conflict=round(float(pd.Series(arr).std()), 4),
            min_conflict=round(min(arr), 4),
            max_conflict=round(max(arr), 4),
        )

    return StressTestResponse(
        session_id=req.session_id,
        config_a=summarize(scores_a),
        config_b=summarize(scores_b),
    )


@app.get("/api/net-ratings")
def get_net_ratings():
    return {"ratings": dict(_net_ratings_module.NET_RTG)}


@app.post("/api/net-ratings")
def update_net_ratings(req: NetRatingsUpdateRequest):
    for team, rating in req.ratings.items():
        if team in _net_ratings_module.NET_RTG:
            _net_ratings_module.NET_RTG[team] = round(float(rating), 2)
    return {"ratings": dict(_net_ratings_module.NET_RTG)}


@app.get("/api/calibration")
def calibration(session_id: str):
    from math import exp
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    HCA = 2.5
    COEFF = 0.15
    # Historical NBA series length distribution (approx, 2010-2024)
    HISTORICAL_LENGTHS = {4: 0.195, 5: 0.247, 6: 0.287, 7: 0.271}

    bins: dict[int, dict] = {i: {"predicted": [], "actual": []} for i in range(10)}
    length_counts = {4: 0, 5: 0, 6: 0, 7: 0}
    total_series = 0

    # Use a sample of up to 5000 for speed
    sample_limit = min(5000, len(session.samples))
    for sample in session.samples[:sample_limit]:
        for key, sr in sample.series.items():
            if sr.round == 4:
                continue  # Finals skipped (fixed dates)
            h = _net_ratings_module.NET_RTG.get(sr.home, 0.0)
            a = _net_ratings_module.NET_RTG.get(sr.away, 0.0)
            p_home = 1.0 / (1.0 + exp(-COEFF * (h - a + HCA)))
            bin_idx = min(int(p_home * 10), 9)
            bins[bin_idx]["predicted"].append(p_home)
            bins[bin_idx]["actual"].append(1 if sr.winner == sr.home else 0)
            length_counts[sr.length] = length_counts.get(sr.length, 0) + 1
            total_series += 1

    calibration_data = []
    for i in range(10):
        b = bins[i]
        if b["predicted"]:
            calibration_data.append({
                "bin_center": round((i + 0.5) / 10, 2),
                "bin_label": f"{i*10}–{(i+1)*10}%",
                "mean_predicted": round(sum(b["predicted"]) / len(b["predicted"]), 4),
                "actual_rate": round(sum(b["actual"]) / len(b["actual"]), 4),
                "count": len(b["predicted"]),
            })

    sim_lengths = {k: round(v / total_series, 4) for k, v in length_counts.items()} if total_series else {}

    return {
        "calibration": calibration_data,
        "sim_lengths": sim_lengths,
        "historical_lengths": HISTORICAL_LENGTHS,
        "total_series": total_series,
        "sample_count": sample_limit,
        "model_params": {
            "logistic_coefficient": COEFF,
            "home_court_advantage_pts": HCA,
            "noise_sigma": 1.5,
            "source": "basketball-reference.com",
        },
    }


@app.get("/api/bracket/live")
def live_bracket(session_id: str):
    """Fetch completed series from ESPN playoffs API and match to session series keys."""
    import urllib.request
    import json as _json

    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    # Try ESPN's playoff bracket
    urls_to_try = [
        "https://site.api.espn.com/apis/v2/sports/basketball/nba/playoffs",
        "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/playoff-bracket",
    ]
    data = None
    for url in urls_to_try:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = _json.loads(resp.read())
            break
        except Exception:
            continue

    if data is None:
        return {"completed": [], "live": False, "message": "ESPN bracket not available yet"}

    # Parse completed series from ESPN response
    # Handles multiple possible ESPN response shapes
    completed_raw = []

    def parse_series_list(series_list):
        for s in series_list:
            try:
                competitors = s.get("competitors", [])
                if len(competitors) < 2:
                    continue
                c1, c2 = competitors[0], competitors[1]
                w1 = int(c1.get("wins", 0))
                w2 = int(c2.get("wins", 0))
                if w1 < 4 and w2 < 4:
                    continue  # Not finished
                t1 = c1.get("team", {}).get("displayName", "")
                t2 = c2.get("team", {}).get("displayName", "")
                winner = t1 if w1 == 4 else t2
                length = w1 + w2
                if 4 <= length <= 7 and (t1 and t2):
                    completed_raw.append({"team_a": t1, "team_b": t2, "winner": winner, "length": length})
            except Exception:
                continue

    # Try different ESPN bracket structures
    for key in ["bracket", "rounds", "series"]:
        if key in data:
            val = data[key]
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        parse_series_list(item.get("series", []))
                        parse_series_list(item.get("competitors", []))
            elif isinstance(val, dict):
                for round_val in val.get("rounds", []):
                    parse_series_list(round_val.get("series", []))

    return {"completed": completed_raw, "live": True}
