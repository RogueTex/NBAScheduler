"""
Ticketmaster API collection for all 30 NBA arenas — 2026 playoff window.
Caches per-venue JSON to ./cache/ so re-runs skip already-fetched venues.
Output: nba_playoff_events_2026.csv
"""

import os, json, time, requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()
API_KEY = os.environ.get("TICKETMASTER_API_KEY")
if not API_KEY:
    raise ValueError("TICKETMASTER_API_KEY not found in .env")
print(f"API key loaded: {API_KEY[:8]}...")

PLAYOFF_START = "2026-04-14"
PLAYOFF_END   = "2026-06-19"

DATE_RANGES = [
    ("2026-04-14", "2026-04-30"),
    ("2026-05-01", "2026-05-31"),
    ("2026-06-01", "2026-06-19"),
]

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)

venues_df = pd.read_csv("nba_venues.csv")
print(f"Loaded {len(venues_df)} venues from nba_venues.csv")

# ── API helpers ────────────────────────────────────────────────────────────────

def safe_request(url, params, retry_delay=2.0, max_retries=6):
    retries = 0
    while True:
        try:
            r = requests.get(url, params=params, timeout=30)
        except requests.RequestException as e:
            print(f"  Request error: {e}")
            return None
        if r.status_code == 429:
            print(f"  429 rate-limit — sleeping {retry_delay:.1f}s...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
            continue
        if r.status_code in (502, 503, 504):
            if retries >= max_retries:
                print(f"  Server error {r.status_code} — giving up after {max_retries} retries")
                return None
            print(f"  Server error {r.status_code} — retrying in {retry_delay}s...")
            time.sleep(retry_delay)
            retries += 1
            continue
        if r.status_code != 200:
            print(f"  HTTP {r.status_code}: {r.text[:200]}")
            return None
        return r


def split_weekly(start_str, end_str):
    start = datetime.strptime(start_str, "%Y-%m-%d")
    end   = datetime.strptime(end_str,   "%Y-%m-%d")
    ranges = []
    cur = start
    while cur <= end:
        nxt = min(cur + timedelta(days=6), end)
        ranges.append((cur.strftime("%Y-%m-%d"), nxt.strftime("%Y-%m-%d")))
        cur = nxt + timedelta(days=1)
    return ranges


def fetch_venue_range(lat, lon, start, end, size=50):
    """Fetch all pages for one lat/lon + date range. Auto-splits if near 1000-result cap."""
    url = "https://app.ticketmaster.com/discovery/v2/events.json"
    all_events = []
    page = 0

    while True:
        params = {
            "apikey":        API_KEY,
            "latlong":       f"{lat},{lon}",
            "radius":        5,
            "unit":          "miles",
            "startDateTime": f"{start}T00:00:00Z",
            "endDateTime":   f"{end}T23:59:59Z",
            "size":          size,
            "page":          page,
        }
        r = safe_request(url, params)
        if r is None:
            break

        data       = r.json()
        page_info  = data.get("page", {})
        total_pages = page_info.get("totalPages", 1)

        # Split into weekly chunks if we're near the 1000-result API cap
        if total_pages * size >= 1000:
            for ws, we in split_weekly(start, end):
                all_events.extend(fetch_venue_range(lat, lon, ws, we, size))
            return all_events

        events = data.get("_embedded", {}).get("events", [])
        for e in events:
            all_events.append({
                "name":  e.get("name"),
                "date":  e.get("dates", {}).get("start", {}).get("localDate"),
                "time":  e.get("dates", {}).get("start", {}).get("localTime"),
                "venue": e.get("_embedded", {}).get("venues", [{}])[0].get("name"),
            })

        if page >= total_pages - 1:
            break
        page += 1
        time.sleep(1.2)

    return all_events


# ── Main collection loop ───────────────────────────────────────────────────────

all_events = []
summary = {}

print(f"\nCollecting events for {len(venues_df)} venues × {len(DATE_RANGES)} date ranges")
print(f"Cache directory: {CACHE_DIR}/\n")

for _, row in tqdm(venues_df.iterrows(), total=len(venues_df), desc="Venues"):
    team  = row["Team"]
    venue = row["Venue Name"]
    lat   = row["Lat"]
    lon   = row["Long"]

    cache_file = os.path.join(CACHE_DIR, f"{team.replace(' ', '_')}.json")

    # ── Load from cache if available ─────────────────────────────────────────
    if os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as f:
            venue_events = json.load(f)
        tqdm.write(f"  [cache] {team}: {len(venue_events)} events")
    else:
        # ── Hit the API ───────────────────────────────────────────────────────
        venue_events = []
        for start, end in DATE_RANGES:
            tqdm.write(f"  [api]   {team}  {start} -> {end}")
            chunk = fetch_venue_range(lat, lon, start, end)
            venue_events.extend(chunk)
            time.sleep(1.2)

        # Save to cache
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(venue_events, f)
        tqdm.write(f"  [saved] {team}: {len(venue_events)} raw events -> {cache_file}")

    # Tag with team name
    for ev in venue_events:
        ev["team"] = team

    all_events.extend(venue_events)
    summary[team] = len(venue_events)

# ── Clean and save ────────────────────────────────────────────────────────────

print(f"\nRaw events collected: {len(all_events)}")

df = pd.DataFrame(all_events)
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Filter to playoff window
start_ts = pd.Timestamp("2026-04-14")
end_ts   = pd.Timestamp("2026-06-19")
df = df[(df["date"] >= start_ts) & (df["date"] <= end_ts)]

# Drop add-on / package listings
exclude_kw = ["voucher", "suite pass", "post game", "item", "educator",
              "access only", "gift", "discount pass", "tour experience",
              " tour", "arena tour", "deposit", " offer", "testing",
              "halftime", "prospect deposit", "club deposit", "member offer",
              "member drop", "add on", "tshirt", "t-shirt", "dream team",
              "group deposit", "levy ticket", "season ticket"]
mask = ~df["name"].str.lower().apply(lambda x: any(kw in str(x) for kw in exclude_kw))
df = df[mask]

# Deduplicate across venues
df = (df.drop_duplicates(subset=["team", "date", "time", "venue"])
        .sort_values(["date", "venue"])
        .reset_index(drop=True))

# Keep only events at the 30 NBA arenas (filter out nearby venues in the 5-mile radius)
nba_arena_names = venues_df["Venue Name"].str.lower().str.strip().tolist()
def is_nba_arena(venue):
    v = str(venue).lower().strip()
    return any(arena in v or v in arena for arena in nba_arena_names)

before_venue = len(df)
df = df[df["venue"].apply(is_nba_arena)].reset_index(drop=True)
print(f"Same-venue filter: {before_venue} -> {len(df)} events (kept only NBA arenas)")

df.to_csv("nba_playoff_events_2026.csv", index=False)
print(f"Saved {len(df)} events to nba_playoff_events_2026.csv")

print("\nEvents per team:")
for team, count in sorted(summary.items()):
    in_window = len(df[df["team"] == team])
    print(f"  {team:35s}  raw={count:4d}  in_window={in_window}")
