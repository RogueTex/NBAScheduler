"""
Validation: compare Ticketmaster API results against 5-venue scraper results.
For each of the 5 scraped venues, check:
  - Coverage: what % of scraper events appear in the API data?
  - API extras: events the API has that the scrapers missed
  - Scraper extras: events the scrapers have that the API missed
Output: validation_report.txt + validation_detail.csv
"""

import unicodedata
import pandas as pd
from datetime import timedelta

# ── Load data ──────────────────────────────────────────────────────────────────
api_df  = pd.read_csv("nba_playoff_events_2026.csv", parse_dates=["date"])
scr_df  = pd.read_csv("nba_playoff_scraped_2026.csv",  parse_dates=["Date"])

# Normalize scrapers df column names to match API
scr_df = scr_df.rename(columns={"Title": "name", "Date": "date", "Time": "time", "Venue": "venue"})

# Map scraper venue names to the canonical team → normalize both to lowercase stripped
SCRAPER_VENUES = [
    "State Farm Arena",
    "TD Garden",
    "Barclays Center",
    "Spectrum Center",
    # United Center skipped (Cloudflare blocked)
]

def normalize(s):
    """Lowercase, strip whitespace, and remove diacritics (e.g. 'í' -> 'i')."""
    s = str(s).lower().strip()
    return "".join(
        c for c in unicodedata.normalize("NFKD", s)
        if not unicodedata.combining(c)
    )

lines = []
detail_rows = []

lines.append("=" * 70)
lines.append("VALIDATION REPORT: Ticketmaster API vs. Venue Scrapers")
lines.append(f"API events total:     {len(api_df)}")
lines.append(f"Scraper events total: {len(scr_df)} (4 venues)")
lines.append("=" * 70)

for venue_name in SCRAPER_VENUES:
    lines.append(f"\n{'─'*60}")
    lines.append(f"Venue: {venue_name}")
    lines.append(f"{'─'*60}")

    # API events at this venue
    api_v = api_df[api_df["venue"].str.contains(venue_name, case=False, na=False)].copy()

    # Scraper events at this venue
    scr_v = scr_df[scr_df["venue"].str.contains(venue_name, case=False, na=False)].copy()

    lines.append(f"  API events:     {len(api_v)}")
    lines.append(f"  Scraper events: {len(scr_v)}")

    if scr_v.empty:
        lines.append("  No scraper events — skipping match analysis")
        continue

    # Match: for each scraper event, check if any API event is on the same date
    # with a similar name (fuzzy: at least 4 chars of the name overlap)
    matched   = []
    unmatched = []

    api_by_date = {}
    for _, row in api_v.iterrows():
        d = row["date"].date()
        api_by_date.setdefault(d, []).append(normalize(row["name"]))

    for _, srow in scr_v.iterrows():
        sdate = srow["date"].date()
        sname = normalize(srow["name"])

        # Check same date ± 1 day (time-zone drift)
        found = False
        for delta in [0, 1, -1]:
            check_date = sdate + timedelta(days=delta)
            api_names = api_by_date.get(check_date, [])
            # Simple overlap: first 6 chars match, or either name is substring of the other
            for aname in api_names:
                short_s = sname[:6]
                short_a = aname[:6]
                if (short_s and short_a and short_s == short_a) or \
                   (len(sname) > 4 and sname[:8] in aname) or \
                   (len(aname) > 4 and aname[:8] in sname):
                    found = True
                    break
            if found:
                break

        if found:
            matched.append(srow)
        else:
            unmatched.append(srow)

        detail_rows.append({
            "venue":        venue_name,
            "date":         srow["date"].date(),
            "scraper_name": srow["name"],
            "matched_in_api": found,
        })

    pct = len(matched) / len(scr_v) * 100 if scr_v.shape[0] > 0 else 0
    lines.append(f"  Matched in API: {len(matched)}/{len(scr_v)}  ({pct:.0f}%)")

    if unmatched:
        lines.append(f"  Scraper-only events (not found in API):")
        for row in unmatched:
            lines.append(f"    {row['date'].date()}  {row['name']}")

    # API-only events (in API but not in scrapers)
    scr_dates = set(scr_v["date"].dt.date)
    api_only = api_v[~api_v["date"].dt.date.isin(scr_dates)]
    if not api_only.empty:
        lines.append(f"  API-only events on dates not in scraper ({len(api_only)}):")
        for _, row in api_only.head(10).iterrows():
            lines.append(f"    {row['date'].date()}  {row['name'][:60]}")
        if len(api_only) > 10:
            lines.append(f"    ... and {len(api_only)-10} more")

lines.append("\n" + "=" * 70)
lines.append("SUMMARY")
lines.append("=" * 70)
lines.append(f"API total events in playoff window:    {len(api_df)}")
lines.append(f"Scraper total events (4 venues):       {len(scr_df)}")

report_text = "\n".join(lines)
print(report_text)

with open("validation_report.txt", "w", encoding="utf-8") as f:
    f.write(report_text)
print("\nSaved validation_report.txt")

if detail_rows:
    detail_df = pd.DataFrame(detail_rows)
    detail_df.to_csv("validation_detail.csv", index=False)
    print("Saved validation_detail.csv")
