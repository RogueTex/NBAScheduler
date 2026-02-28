from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_venues_csv_shape_and_columns():
    df = pd.read_csv(REPO_ROOT / "nba_venues.csv")
    expected = {"Team", "Venue Name", "Lat", "Long"}
    assert expected.issubset(df.columns)
    assert len(df) == 30
