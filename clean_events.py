"""
Re-run the cleaning pipeline from cached JSON files (no API calls).
Use this after modifying filters to regenerate the API events CSV.
"""

import argparse
import json
import os

import pandas as pd


def parse_args():
    parser = argparse.ArgumentParser(description="Clean cached Ticketmaster events")
    parser.add_argument("--start-date", default=os.getenv("PLAYOFF_START", "2026-04-14"), help="YYYY-MM-DD")
    parser.add_argument("--end-date", default=os.getenv("PLAYOFF_END", "2026-06-19"), help="YYYY-MM-DD")
    parser.add_argument(
        "--output",
        default=os.getenv("API_EVENTS_OUTPUT", "nba_playoff_events_2026.csv"),
        help="Output CSV path",
    )
    parser.add_argument("--venues-csv", default="nba_venues.csv", help="Venue metadata CSV")
    parser.add_argument("--cache-dir", default="cache", help="Directory containing cached JSON files")
    return parser.parse_args()


def is_nba_arena(venue, nba_arena_names):
    normalized = str(venue).lower().strip()
    return any(arena in normalized or normalized in arena for arena in nba_arena_names)


def main():
    args = parse_args()

    venues_df = pd.read_csv(args.venues_csv)
    nba_arena_names = venues_df["Venue Name"].str.lower().str.strip().tolist()

    all_events = []
    for _, row in venues_df.iterrows():
        team = row["Team"]
        cache_file = os.path.join(args.cache_dir, f"{team.replace(' ', '_')}.json")
        if not os.path.exists(cache_file):
            print(f"  MISSING cache: {cache_file}")
            continue

        with open(cache_file, "r", encoding="utf-8") as file:
            venue_events = json.load(file)

        for event in venue_events:
            event["team"] = team

        all_events.extend(venue_events)

    print(f"Raw events from cache: {len(all_events)}")

    df = pd.DataFrame(all_events)
    if df.empty:
        print("No cached events found. Nothing to save.")
        return

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    start_ts = pd.Timestamp(args.start_date)
    end_ts = pd.Timestamp(args.end_date)
    df = df[(df["date"] >= start_ts) & (df["date"] <= end_ts)]
    print(f"After date filter: {len(df)}")

    exclude_kw = [
        "voucher",
        "suite pass",
        "post game",
        "item",
        "educator",
        "access only",
        "gift",
        "discount pass",
        "tour experience",
        " tour",
        "arena tour",
        "deposit",
        " offer",
        "testing",
        "halftime",
        "prospect deposit",
        "club deposit",
        "member offer",
        "member drop",
        "add on",
        "tshirt",
        "t-shirt",
        "dream team",
        "group deposit",
        "levy ticket",
        "season ticket",
    ]

    mask = ~df["name"].str.lower().apply(lambda value: any(keyword in str(value) for keyword in exclude_kw))
    df = df[mask]
    print(f"After keyword filter: {len(df)}")

    df = (
        df.drop_duplicates(subset=["team", "date", "time", "venue"])
        .sort_values(["date", "venue"])
        .reset_index(drop=True)
    )
    print(f"After dedup: {len(df)}")

    before = len(df)
    df = df[df["venue"].apply(lambda venue: is_nba_arena(venue, nba_arena_names))].reset_index(drop=True)
    print(f"After same-venue filter: {before} -> {len(df)}")

    df.to_csv(args.output, index=False)
    print(f"\nSaved {len(df)} events to {args.output}")

    print("\nEvents per team:")
    for _, row in venues_df.iterrows():
        team = row["Team"]
        team_count = len(df[df["team"] == team])
        if team_count > 0:
            print(f"  {team:35s}  {team_count}")


if __name__ == "__main__":
    main()
