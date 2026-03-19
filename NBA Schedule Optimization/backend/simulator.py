"""
Monte Carlo bracket simulator.
Extracted from playoff_optimization.ipynb sections 3-4.

Entry point: run_simulation(east_seeds, west_seeds, n_samples) -> list[BracketSample]
"""

import numpy as np
from math import exp
from datetime import datetime
from scipy.special import comb as ncomb
from dataclasses import dataclass, field

from net_ratings import NET_RTG
from seeds import default_first_round

HCA = 2.5        # Home court advantage in net rating points
NOISE_SIG = 1.5  # Per-series Gaussian noise on net ratings

# Play-in tournament dates (before Round 1 starts Apr 19)
PLAYIN_DAY1 = datetime(2026, 4, 14)  # 7v8 games — 7 seed hosts
PLAYIN_DAY2 = datetime(2026, 4, 15)  # 9v10 games — 9 seed hosts
PLAYIN_DAY3 = datetime(2026, 4, 17)  # final games — game-1 loser hosts (higher seed)


@dataclass
class SeriesResult:
    round: int
    home: str
    away: str
    winner: str
    length: int  # 4, 5, 6, or 7


@dataclass
class BracketSample:
    # Keys: "r1_0".."r1_7", "r2_0".."r2_3", "r3_0".."r3_1", "r4_0"
    series: dict[str, SeriesResult] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Per-game and per-series win probability
# ---------------------------------------------------------------------------

def series_win_prob(
    home_team: str,
    away_team: str,
    noise_sigma: float = NOISE_SIG,
) -> tuple[float, dict[int, float]]:
    """
    Returns (p_home_wins_series, length_distribution).
    length_distribution maps {4: p, 5: p, 6: p, 7: p}.
    """
    h_nrtg = NET_RTG.get(home_team, 0.0) + np.random.normal(0, noise_sigma)
    a_nrtg = NET_RTG.get(away_team, 0.0) + np.random.normal(0, noise_sigma)

    p = 1.0 / (1.0 + exp(-0.15 * (h_nrtg - a_nrtg + HCA)))
    q = 1.0 - p

    p_series = sum(int(ncomb(g - 1, 3)) * (p ** 4) * (q ** (g - 4)) for g in [4, 5, 6, 7])

    raw_len = {
        g: int(ncomb(g - 1, 3)) * (p ** 4 * q ** (g - 4) + q ** 4 * p ** (g - 4))
        for g in [4, 5, 6, 7]
    }
    total = sum(raw_len.values())
    length_dist = {g: v / total for g, v in raw_len.items()}

    return p_series, length_dist


def sample_series(home_team: str, away_team: str) -> tuple[str, int]:
    """Draw one series outcome: (winner, series_length)."""
    p_win, length_dist = series_win_prob(home_team, away_team)
    winner = home_team if np.random.random() < p_win else away_team
    lengths = [4, 5, 6, 7]
    probs = [length_dist[g] for g in lengths]
    length = int(np.random.choice(lengths, p=probs))
    return winner, length


# ---------------------------------------------------------------------------
# Full bracket sampler
# ---------------------------------------------------------------------------

def build_bracket(first_round_matchups: list[tuple[str, str]]) -> BracketSample:
    """
    Sample one complete bracket. Returns a BracketSample with all 15 series results.
    Bracket structure: 8 R1 series -> 4 R2 -> 2 R3 (conf finals) -> 1 Finals.
    """
    sample = BracketSample()

    # Round 1
    r1_winners = []
    for i, (home, away) in enumerate(first_round_matchups):
        winner, length = sample_series(home, away)
        sample.series[f"r1_{i}"] = SeriesResult(round=1, home=home, away=away,
                                                 winner=winner, length=length)
        r1_winners.append(winner)

    # Round 2: winners of (1v8 vs 4v5) and (3v6 vs 2v7) per conference
    r2_matchups = [
        (r1_winners[0], r1_winners[1]),  # East top bracket
        (r1_winners[2], r1_winners[3]),  # East bottom bracket
        (r1_winners[4], r1_winners[5]),  # West top bracket
        (r1_winners[6], r1_winners[7]),  # West bottom bracket
    ]
    r2_winners = []
    for i, (home, away) in enumerate(r2_matchups):
        winner, length = sample_series(home, away)
        sample.series[f"r2_{i}"] = SeriesResult(round=2, home=home, away=away,
                                                 winner=winner, length=length)
        r2_winners.append(winner)

    # Conference Finals
    r3_matchups = [
        (r2_winners[0], r2_winners[1]),  # ECF
        (r2_winners[2], r2_winners[3]),  # WCF
    ]
    r3_winners = []
    for i, (home, away) in enumerate(r3_matchups):
        winner, length = sample_series(home, away)
        sample.series[f"r3_{i}"] = SeriesResult(round=3, home=home, away=away,
                                                 winner=winner, length=length)
        r3_winners.append(winner)

    # NBA Finals
    winner, length = sample_series(r3_winners[0], r3_winners[1])
    sample.series["r4_0"] = SeriesResult(round=4, home=r3_winners[0], away=r3_winners[1],
                                          winner=winner, length=length)

    return sample


# ---------------------------------------------------------------------------
# Play-in tournament simulator
# ---------------------------------------------------------------------------

def simulate_playin(
    east_seeds: list[str],
    west_seeds: list[str],
    team_venue: dict[str, str],
) -> tuple[list[str], list[str], list[tuple]]:
    """
    Simulate one play-in tournament (both conferences).

    Games:
      Day 1: 7 (home) vs 8  -> winner = 7th playoff seed
      Day 2: 9 (home) vs 10 -> loser eliminated
      Day 3: loser of Day1 (home) vs winner of Day2 -> winner = 8th playoff seed

    Returns:
      actual_east  : 8-team list (seeds 1-6 unchanged; 7/8 determined by play-in)
      actual_west  : same for West
      playin_games : list of (venue, date_str, round=0, home, away) tuples
    """
    playin_games: list[tuple] = []

    def sim_conf(seeds: list[str]) -> tuple[str, str]:
        s7, s8, s9, s10 = seeds[6], seeds[7], seeds[8], seeds[9]
        v7 = team_venue.get(s7, s7)
        v9 = team_venue.get(s9, s9)

        # Game 1: 7 seed hosts 8 seed
        w1, _ = sample_series(s7, s8)
        l1 = s8 if w1 == s7 else s7
        playin_games.append((v7, PLAYIN_DAY1.strftime("%Y-%m-%d"), 0, s7, s8))

        # Game 2: 9 seed hosts 10 seed
        w2, _ = sample_series(s9, s10)
        playin_games.append((v9, PLAYIN_DAY2.strftime("%Y-%m-%d"), 0, s9, s10))

        # Game 3: loser of Game 1 hosts (they're the higher seed vs 9/10 winner)
        v_g3 = team_venue.get(l1, l1)
        w3, _ = sample_series(l1, w2)
        playin_games.append((v_g3, PLAYIN_DAY3.strftime("%Y-%m-%d"), 0, l1, w2))

        return w1, w3  # (7th seed, 8th seed)

    e7, e8 = sim_conf(east_seeds)
    w7, w8 = sim_conf(west_seeds)

    actual_east = list(east_seeds[:6]) + [e7, e8]
    actual_west = list(west_seeds[:6]) + [w7, w8]
    return actual_east, actual_west, playin_games


# ---------------------------------------------------------------------------
# Simulation entry point
# ---------------------------------------------------------------------------

def run_simulation(
    east_seeds: list[str],
    west_seeds: list[str],
    n_samples: int = 20_000,
    seed: int = 42,
) -> list[BracketSample]:
    """
    Run Monte Carlo simulation and return n_samples bracket outcomes.
    """
    np.random.seed(seed)
    first_round = default_first_round(east_seeds, west_seeds)
    return [build_bracket(first_round) for _ in range(n_samples)]


def filter_samples(
    samples: list[BracketSample],
    locked: dict[str, dict],
) -> list[BracketSample]:
    """
    Filter samples to only those consistent with locked series results.
    locked format: {"r1_0": {"winner": "Detroit Pistons", "length": 5}, ...}
    Returns filtered list; always keeps at least 1 sample to avoid division by zero.
    """
    if not locked:
        return samples

    filtered = []
    for s in samples:
        match = True
        for key, result in locked.items():
            sr = s.series.get(key)
            if sr is None:
                match = False
                break
            if result.get("winner") and sr.winner != result["winner"]:
                match = False
                break
            if result.get("length") and sr.length != result["length"]:
                match = False
                break
        if match:
            filtered.append(s)

    return filtered if filtered else samples[:1]
