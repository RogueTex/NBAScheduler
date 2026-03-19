"""
Ticketmaster API collection for NBA arenas in a playoff window.
Caches per-venue JSON to ./cache/ so re-runs can skip already-fetched venues.
"""

import argparse
import json
import os
import time
from datetime import datetime, timedelta

import pandas as pd
import requests
from dotenv import load_dotenv
from tqdm import tqdm


def parse_args():
    parser = argparse.ArgumentParser(description="Collect Ticketmaster events for NBA playoff scheduling")
    parser.add_argument("--start-date", default=os.getenv("PLAYOFF_START", "2026-04-14"), help="YYYY-MM-DD")
    parser.add_argument("--end-date", default=os.getenv("PLAYOFF_END", "2026-06-19"), help="YYYY-MM-DD")
    parser.add_argument(
        "--output",
        default=os.getenv("API_EVENTS_OUTPUT", "nba_playoff_events_2026.csv"),
        help="Output CSV path",
    )
    parser.add_argument("--venues-csv", default="nba_venues.csv", help="Venue metadata CSV")
    parser.add_argument("--cache-dir", default="cache", help="Directory for per-team cached API responses")
    parser.add_argument(
        "--refresh-all",
        action="store_true",
        help="Ignore cache and re-fetch all teams",
    )
    parser.add_argument(
        "--refresh-team",
        action="append",
        default=[],
        help="Team name to refresh (repeatable). Example: --refresh-team 'Oklahoma City Thunder'",
    )
    parser.add_argument("--radius-miles", type=int, default=5, help="Ticketmaster search radius around arena lat/lon")
    return parser.parse_args()


def build_date_ranges(start_date, end_date):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    ranges = []
    current = start

    while current <= end:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        range_end = min(month_end, end)
        ranges.append((current.strftime("%Y-%m-%d"), range_end.strftime("%Y-%m-%d")))
        current = range_end + timedelta(days=1)

    return ranges


def safe_request(url, params, retry_delay=2.0, max_retries=6):
    retries = 0
    while True:
        try:
            response = requests.get(url, params=params, timeout=30)
        except requests.RequestException as exc:
            print(f"  Request error: {exc}")
            return None

        if response.status_code == 429:
            print(f"  429 rate-limit, sleeping {retry_delay:.1f}s...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
            continue

        if response.status_code in (502, 503, 504):
            if retries >= max_retries:
                print(f"  Server error {response.status_code}, giving up after {max_retries} retries")
                return None
            print(f"  Server error {response.status_code}, retrying in {retry_delay}s...")
            time.sleep(retry_delay)
            retries += 1
            continue

        if response.status_code != 200:
            print(f"  HTTP {response.status_code}: {response.text[:200]}")
            return None

        return response


def split_weekly(start_str, end_str):
    start = datetime.strptime(start_str, "%Y-%m-%d")
    end = datetime.strptime(end_str, "%Y-%m-%d")
    ranges = []
    current = start

    while current <= end:
        next_date = min(current + timedelta(days=6), end)
        ranges.append((current.strftime("%Y-%m-%d"), next_date.strftime("%Y-%m-%d")))
        current = next_date + timedelta(days=1)

    return ranges


def fetch_venue_range(api_key, lat, lon, start, end, radius_miles=5, size=50):
    """Fetch all pages for one lat/lon + date range. Auto-splits if near 1000-result cap."""
    url = "https://app.ticketmaster.com/discovery/v2/events.json"
    all_events = []
    page = 0

    while True:
        params = {
            "apikey": api_key,
            "latlong": f"{lat},{lon}",
            "radius": radius_miles,
            "unit": "miles",
            "startDateTime": f"{start}T00:00:00Z",
            "endDateTime": f"{end}T23:59:59Z",
            "size": size,
            "page": page,
        }

        response = safe_request(url, params)
        if response is None:
            break

        data = response.json()
        page_info = data.get("page", {})
        total_pages = page_info.get("totalPages", 1)

        if total_pages * size >= 1000:
            for weekly_start, weekly_end in split_weekly(start, end):
                all_events.extend(fetch_venue_range(api_key, lat, lon, weekly_start, weekly_end, radius_miles, size))
            return all_events

        events = data.get("_embedded", {}).get("events", [])
        for event in events:
            all_events.append(
                {
                    "name": event.get("name"),
                    "date": event.get("dates", {}).get("start", {}).get("localDate"),
                    "time": event.get("dates", {}).get("start", {}).get("localTime"),
                    "venue": event.get("_embedded", {}).get("venues", [{}])[0].get("name"),
                }
            )

        if page >= total_pages - 1:
            break

        page += 1
        time.sleep(1.2)

    return all_events


def should_use_cache(cache_file, refresh_all, refresh_teams, team_name):
    if refresh_all:
        return False
    if team_name in refresh_teams:
        return False
    return os.path.exists(cache_file)


def is_nba_arena(venue, nba_arena_names):
    normalized = str(venue).lower().strip()
    return any(arena in normalized or normalized in arena for arena in nba_arena_names)


def collect_events(args):
    load_dotenv()
    api_key = os.environ.get("TICKETMASTER_API_KEY")
    if not api_key:
        raise ValueError("TICKETMASTER_API_KEY not found in environment or .env")

    venues_df = pd.read_csv(args.venues_csv)
    date_ranges = build_date_ranges(args.start_date, args.end_date)
    refresh_teams = set(args.refresh_team)

    os.makedirs(args.cache_dir, exist_ok=True)

    all_events = []
    summary = {}

    print(f"Loaded {len(venues_df)} venues from {args.venues_csv}")
    print(f"Collecting events for {len(venues_df)} venues x {len(date_ranges)} date ranges")
    print(f"Window: {args.start_date} to {args.end_date}")
    print(f"Cache directory: {args.cache_dir}/")

    for _, row in tqdm(venues_df.iterrows(), total=len(venues_df), desc="Venues"):
        team = row["Team"]
        lat = row["Lat"]
        lon = row["Long"]

        cache_file = os.path.join(args.cache_dir, f"{team.replace(' ', '_')}.json")

        if should_use_cache(cache_file, args.refresh_all, refresh_teams, team):
            with open(cache_file, "r", encoding="utf-8") as file:
                venue_events = json.load(file)
            tqdm.write(f"  [cache] {team}: {len(venue_events)} events")
        else:
            venue_events = []
            for start, end in date_ranges:
                tqdm.write(f"  [api]   {team}  {start} -> {end}")
                chunk = fetch_venue_range(api_key, lat, lon, start, end, args.radius_miles)
                venue_events.extend(chunk)
                time.sleep(1.2)

            with open(cache_file, "w", encoding="utf-8") as file:
                json.dump(venue_events, file)
            tqdm.write(f"  [saved] {team}: {len(venue_events)} raw events -> {cache_file}")

        for event in venue_events:
            event["team"] = team

        all_events.extend(venue_events)
        summary[team] = len(venue_events)

    return all_events, summary, venues_df


def clean_and_save(all_events, summary, venues_df, args):
    print(f"\nRaw events collected: {len(all_events)}")

    df = pd.DataFrame(all_events)
    if df.empty:
        print("No events collected. Nothing to save.")
        return df

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    start_ts = pd.Timestamp(args.start_date)
    end_ts = pd.Timestamp(args.end_date)
    df = df[(df["date"] >= start_ts) & (df["date"] <= end_ts)]

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

    df = (
        df.drop_duplicates(subset=["team", "date", "time", "venue"])
        .sort_values(["date", "venue"])
        .reset_index(drop=True)
    )

    nba_arena_names = venues_df["Venue Name"].str.lower().str.strip().tolist()
    before_venue = len(df)
    df = df[df["venue"].apply(lambda venue: is_nba_arena(venue, nba_arena_names))].reset_index(drop=True)
    print(f"Same-venue filter: {before_venue} -> {len(df)} events")

    df.to_csv(args.output, index=False)
    print(f"Saved {len(df)} events to {args.output}")

    print("\nEvents per team:")
    for team, count in sorted(summary.items()):
        in_window = len(df[df["team"] == team])
        print(f"  {team:35s}  raw={count:4d}  in_window={in_window}")

    return df


def main():
    args = parse_args()
    all_events, summary, venues_df = collect_events(args)
    clean_and_save(all_events, summary, venues_df, args)


if __name__ == "__main__":
    main()
