# Default projected playoff seeds (pre-play-in, as of Feb 27, 2026)
# Update EAST_SEEDS and WEST_SEEDS with actual play-in results after mid-April.

EAST_SEEDS: list[str] = [
    "Detroit Pistons",       # 1
    "Boston Celtics",        # 2
    "New York Knicks",       # 3
    "Cleveland Cavaliers",   # 4
    "Charlotte Hornets",     # 5
    "Miami Heat",            # 6
    "Toronto Raptors",       # 7
    "Philadelphia 76ers",    # 8
]

WEST_SEEDS: list[str] = [
    "Oklahoma City Thunder",  # 1
    "San Antonio Spurs",      # 2
    "Houston Rockets",        # 3
    "Denver Nuggets",         # 4
    "Minnesota Timberwolves", # 5
    "Golden State Warriors",  # 6
    "Phoenix Suns",           # 7
    "Los Angeles Clippers",   # 8
]

# First-round matchups: 1v8, 4v5, 3v6, 2v7 (higher seed = home team)
def default_first_round(east: list[str], west: list[str]) -> list[tuple[str, str]]:
    return [
        (east[0], east[7]),
        (east[3], east[4]),
        (east[2], east[5]),
        (east[1], east[6]),
        (west[0], west[7]),
        (west[3], west[4]),
        (west[2], west[5]),
        (west[1], west[6]),
    ]
