"""
Validation: compare Ticketmaster API results against venue scraper results.
For each scraped venue, check coverage and unmatched events.
Output: validation_report.txt + validation_detail.csv
"""

import argparse
import unicodedata
from datetime import timedelta

import pandas as pd


def parse_args():
    parser = argparse.ArgumentParser(description="Validate Ticketmaster API data against scraper data")
    parser.add_argument(
        "--api-csv",
        default="nba_playoff_events_2026.csv",
        help="API events CSV path",
    )
    parser.add_argument(
        "--scraper-csv",
        default="nba_playoff_scraped_2026.csv",
        help="Scraper events CSV path",
    )
    parser.add_argument("--report-out", default="validation_report.txt", help="Text report output path")
    parser.add_argument("--detail-out", default="validation_detail.csv", help="Detailed CSV output path")
    return parser.parse_args()


def normalize(value):
    """Lowercase, strip whitespace, and remove diacritics (e.g. 'í' -> 'i')."""
    normalized = str(value).lower().strip()
    return "".join(
        character for character in unicodedata.normalize("NFKD", normalized) if not unicodedata.combining(character)
    )


def main():
    args = parse_args()

    api_df = pd.read_csv(args.api_csv, parse_dates=["date"])
    scr_df = pd.read_csv(args.scraper_csv, parse_dates=["Date"])

    scr_df = scr_df.rename(columns={"Title": "name", "Date": "date", "Time": "time", "Venue": "venue"})

    scraper_venues = [
        "State Farm Arena",
        "TD Garden",
        "Barclays Center",
        "Spectrum Center",
        # United Center intentionally skipped (Cloudflare blocking)
    ]

    lines = []
    detail_rows = []

    lines.append("=" * 70)
    lines.append("VALIDATION REPORT: Ticketmaster API vs. Venue Scrapers")
    lines.append(f"API events total:     {len(api_df)}")
    lines.append(f"Scraper events total: {len(scr_df)} ({len(scraper_venues)} venues)")
    lines.append("=" * 70)

    for venue_name in scraper_venues:
        lines.append(f"\n{'-' * 60}")
        lines.append(f"Venue: {venue_name}")
        lines.append(f"{'-' * 60}")

        api_v = api_df[api_df["venue"].str.contains(venue_name, case=False, na=False)].copy()
        scr_v = scr_df[scr_df["venue"].str.contains(venue_name, case=False, na=False)].copy()

        lines.append(f"  API events:     {len(api_v)}")
        lines.append(f"  Scraper events: {len(scr_v)}")

        if scr_v.empty:
            lines.append("  No scraper events, skipping match analysis")
            continue

        matched = []
        unmatched = []

        api_by_date = {}
        for _, row in api_v.iterrows():
            event_date = row["date"].date()
            api_by_date.setdefault(event_date, []).append(normalize(row["name"]))

        for _, srow in scr_v.iterrows():
            sdate = srow["date"].date()
            sname = normalize(srow["name"])

            found = False
            for delta in [0, 1, -1]:
                check_date = sdate + timedelta(days=delta)
                api_names = api_by_date.get(check_date, [])

                for aname in api_names:
                    short_s = sname[:6]
                    short_a = aname[:6]
                    if (
                        (short_s and short_a and short_s == short_a)
                        or (len(sname) > 4 and sname[:8] in aname)
                        or (len(aname) > 4 and aname[:8] in sname)
                    ):
                        found = True
                        break

                if found:
                    break

            if found:
                matched.append(srow)
            else:
                unmatched.append(srow)

            detail_rows.append(
                {
                    "venue": venue_name,
                    "date": srow["date"].date(),
                    "scraper_name": srow["name"],
                    "matched_in_api": found,
                }
            )

        pct = len(matched) / len(scr_v) * 100 if scr_v.shape[0] > 0 else 0
        lines.append(f"  Matched in API: {len(matched)}/{len(scr_v)} ({pct:.0f}%)")

        if unmatched:
            lines.append("  Scraper-only events (not found in API):")
            for row in unmatched:
                lines.append(f"    {row['date'].date()}  {row['name']}")

        scr_dates = set(scr_v["date"].dt.date)
        api_only = api_v[~api_v["date"].dt.date.isin(scr_dates)]
        if not api_only.empty:
            lines.append(f"  API-only events on dates not in scraper ({len(api_only)}):")
            for _, row in api_only.head(10).iterrows():
                lines.append(f"    {row['date'].date()}  {row['name'][:60]}")
            if len(api_only) > 10:
                lines.append(f"    ... and {len(api_only) - 10} more")

    lines.append("\n" + "=" * 70)
    lines.append("SUMMARY")
    lines.append("=" * 70)
    lines.append(f"API total events in playoff window:    {len(api_df)}")
    lines.append(f"Scraper total events ({len(scraper_venues)} venues):       {len(scr_df)}")

    report_text = "\n".join(lines)
    print(report_text)

    with open(args.report_out, "w", encoding="utf-8") as file:
        file.write(report_text)
    print(f"\nSaved {args.report_out}")

    if detail_rows:
        detail_df = pd.DataFrame(detail_rows)
        detail_df.to_csv(args.detail_out, index=False)
        print(f"Saved {args.detail_out}")


if __name__ == "__main__":
    main()
