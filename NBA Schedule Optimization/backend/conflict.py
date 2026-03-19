"""
Loads the venue x date conflict matrix from nba_playoff_events_2026.csv and
nba_venues.csv. Provides get_conflict() for use by the scheduler and stress-test.
"""

import os
import pandas as pd

_conflict_matrix: pd.DataFrame | None = None


def _load_matrix(data_dir: str = "") -> pd.DataFrame:
    events_path = os.path.join(data_dir, "nba_playoff_events_2026.csv")
    venues_path = os.path.join(data_dir, "nba_venues.csv")

    venues_df = pd.read_csv(venues_path)
    events_df = pd.read_csv(events_path, parse_dates=["date"])

    # Strip NBA game listings from events
    nba_keywords = [
        "vs.", "vs ", " at ", " @ ", "nba", "hawks", "celtics", "nets",
        "hornets", "bulls", "cavaliers", "mavericks", "nuggets", "pistons",
        "warriors", "rockets", "pacers", "clippers", "lakers", "grizzlies",
        "heat", "bucks", "timberwolves", "pelicans", "knicks", "thunder",
        "magic", "76ers", "suns", "trail blazers", "blazers", "kings", "spurs",
        "raptors", "jazz", "wizards",
    ]
    title_col = "name" if "name" in events_df.columns else "title"
    mask = ~events_df[title_col].str.lower().apply(
        lambda x: any(kw in str(x) for kw in nba_keywords)
    )
    competing_df = events_df[mask].copy()

    # Venue x date conflict counts
    conflict = (
        competing_df.groupby(["venue", "date"])
        .size()
        .reset_index(name="conflict_count")
    )

    playoff_start = pd.Timestamp("2026-04-14")
    playoff_end = pd.Timestamp("2026-06-19")
    all_dates = pd.date_range(playoff_start, playoff_end)
    all_venues = venues_df["Venue Name"].tolist()

    matrix = pd.DataFrame(0, index=all_venues, columns=all_dates)
    for _, row in conflict.iterrows():
        if row["venue"] in matrix.index and row["date"] in matrix.columns:
            matrix.loc[row["venue"], row["date"]] = row["conflict_count"]

    return matrix


def get_matrix(data_dir: str = "") -> pd.DataFrame:
    global _conflict_matrix
    if _conflict_matrix is None:
        _conflict_matrix = _load_matrix(data_dir)
    return _conflict_matrix


def get_conflict(venue: str, date, data_dir: str = "") -> float:
    matrix = get_matrix(data_dir)
    d = pd.Timestamp(date)
    if venue in matrix.index and d in matrix.columns:
        return float(matrix.loc[venue, d])
    return 0.0
