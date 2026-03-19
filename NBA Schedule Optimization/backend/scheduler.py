"""
DP scheduler: assigns game dates to each series in a bracket sample,
minimizing total conflict score with a ±3-day lookahead per game.
Extracted from playoff_optimization.ipynb section 5.

Entry point: schedule_bracket(sample, team_venue, conflict_fn) -> ScheduledBracket
"""

from datetime import datetime, timedelta
from dataclasses import dataclass

from simulator import BracketSample, SeriesResult

# Fixed NBA Finals dates (hard constraints)
FINALS_DATES = [
    datetime(2026, 6, 3),
    datetime(2026, 6, 5),
    datetime(2026, 6, 8),
    datetime(2026, 6, 10),
    datetime(2026, 6, 13),
    datetime(2026, 6, 16),
    datetime(2026, 6, 19),
]

ROUND_1_START = datetime(2026, 4, 19)


@dataclass
class ScheduledGame:
    series_key: str
    round: int
    game_num: int
    home: str
    away: str
    date: datetime
    venue: str
    conflict_score: float


@dataclass
class ScheduledBracket:
    games: list[ScheduledGame]
    total_conflict: float


def _game_venues(home_venue: str, away_venue: str, n_games: int) -> list[str]:
    """2-2-1-1-1 home/away format."""
    pattern = [home_venue, home_venue, away_venue, away_venue,
                home_venue, away_venue, home_venue]
    return pattern[:n_games]


def schedule_bracket(
    sample: BracketSample,
    team_venue: dict[str, str],
    conflict_fn,
    lookahead_days: int = 3,
    rng=None,
) -> ScheduledBracket:
    """
    DP over rounds 1->4. For each game, picks the lowest-conflict date
    within [cur, cur + lookahead_days]. Respects rest + travel constraints.

    conflict_fn(venue, date) -> float
    """
    games: list[ScheduledGame] = []
    total_conflict = 0.0
    round_end_dates: dict[str, datetime] = {}

    for round_num in [1, 2, 3, 4]:
        series_in_round = {k: v for k, v in sample.series.items()
                           if v.round == round_num}

        for key, sr in series_in_round.items():
            hv = team_venue.get(sr.home, sr.home)
            av = team_venue.get(sr.away, sr.away)
            n = sr.length

            # Finals: fixed dates, no conflict optimization
            if round_num == 4:
                venues = _game_venues(hv, av, n)
                for g, (date, venue) in enumerate(zip(FINALS_DATES[:n], venues)):
                    c = conflict_fn(venue, date)
                    games.append(ScheduledGame(
                        series_key=key, round=round_num, game_num=g + 1,
                        home=sr.home, away=sr.away,
                        date=date, venue=venue, conflict_score=c,
                    ))
                    total_conflict += c
                round_end_dates[key] = FINALS_DATES[n - 1]
                continue

            # Determine earliest start date
            if round_num == 1:
                base = ROUND_1_START
            else:
                prev_round_keys = [k for k, v in sample.series.items()
                                   if v.round == round_num - 1]
                max_end = max(round_end_dates[k] for k in prev_round_keys
                              if k in round_end_dates)
                had_seven = any(sample.series[k].length == 7 for k in prev_round_keys
                                if k in round_end_dates)
                rest = 3 if had_seven else 2
                base = max_end + timedelta(days=rest)

            # Stagger series starts within rounds 1-3 (0-2 day offset per series)
            stagger = int(rng.integers(0, 3)) if rng is not None and round_num <= 3 else 0
            earliest = base + timedelta(days=stagger)

            venues = _game_venues(hv, av, n)
            cur = earliest
            game_dates: list[datetime] = []

            for g in range(n):
                venue = venues[g]
                candidates = [cur + timedelta(days=d) for d in range(lookahead_days + 1)]
                scores = [conflict_fn(venue, d) for d in candidates]
                best_idx = int(min(range(len(scores)), key=lambda i: scores[i]))
                best_date = candidates[best_idx]
                game_dates.append(best_date)

                c = scores[best_idx]
                games.append(ScheduledGame(
                    series_key=key, round=round_num, game_num=g + 1,
                    home=sr.home, away=sr.away,
                    date=best_date, venue=venue, conflict_score=c,
                ))
                total_conflict += c

                travel = 1 if g + 1 < n and venues[g + 1] != venue else 0
                cur = best_date + timedelta(days=2 + travel)

            round_end_dates[key] = game_dates[-1]

    return ScheduledBracket(games=games, total_conflict=total_conflict)
