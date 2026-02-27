"""
Re-runs the cleaning pipeline from cached JSON files (no API calls).
Use this after modifying filters in run_api.py to regenerate nba_playoff_events_2026.csv.
"""

import os, json
import pandas as pd

venues_df = pd.read_csv("nba_venues.csv")

CACHE_DIR  = "cache"
PLAYOFF_START = pd.Timestamp("2026-04-14")
PLAYOFF_END   = pd.Timestamp("2026-06-19")

exclude_kw = ["voucher", "suite pass", "post game", "item", "educator",
              "access only", "gift", "discount pass", "tour experience",
              " tour", "arena tour", "deposit", " offer", "testing",
              "halftime", "prospect deposit", "club deposit", "member offer",
              "member drop", "add on", "tshirt", "t-shirt", "dream team",
              "group deposit", "levy ticket", "season ticket"]

nba_arena_names = venues_df["Venue Name"].str.lower().str.strip().tolist()

def is_nba_arena(venue):
    v = str(venue).lower().strip()
    return any(arena in v or v in arena for arena in nba_arena_names)

all_events = []
for _, row in venues_df.iterrows():
    team = row["Team"]
    cache_file = os.path.join(CACHE_DIR, f"{team.replace(' ', '_')}.json")
    if not os.path.exists(cache_file):
        print(f"  MISSING cache: {cache_file}")
        continue
    with open(cache_file, "r", encoding="utf-8") as f:
        venue_events = json.load(f)
    for ev in venue_events:
        ev["team"] = team
    all_events.extend(venue_events)

print(f"Raw events from cache: {len(all_events)}")

df = pd.DataFrame(all_events)
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Filter to playoff window
df = df[(df["date"] >= PLAYOFF_START) & (df["date"] <= PLAYOFF_END)]
print(f"After date filter: {len(df)}")

# Drop upsell / package listings
mask = ~df["name"].str.lower().apply(lambda x: any(kw in str(x) for kw in exclude_kw))
df = df[mask]
print(f"After keyword filter: {len(df)}")

# Deduplicate
df = (df.drop_duplicates(subset=["team", "date", "time", "venue"])
        .sort_values(["date", "venue"])
        .reset_index(drop=True))
print(f"After dedup: {len(df)}")

# Same-venue filter: keep only events at actual NBA arenas
before = len(df)
df = df[df["venue"].apply(is_nba_arena)].reset_index(drop=True)
print(f"After same-venue filter: {before} -> {len(df)} (kept only NBA arenas)")

df.to_csv("nba_playoff_events_2026.csv", index=False)
print(f"\nSaved {len(df)} events to nba_playoff_events_2026.csv")

print("\nEvents per team:")
for _, row in venues_df.iterrows():
    team = row["Team"]
    n = len(df[df["team"] == team])
    if n > 0:
        print(f"  {team:35s}  {n}")
