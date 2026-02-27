# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project collects and organizes all events at NBA arenas during the 2025-26 season (Oct 21, 2025 – Apr 12, 2026) to support schedule optimization analysis. Data is acquired via the Ticketmaster Discovery API and/or Selenium web scrapers, then cleaned and stored as CSVs.

## Running the Notebooks

```bash
jupyter notebook ticketmaster_api.ipynb   # Preferred: API-based event collection
jupyter notebook scrapers_all.ipynb       # Alternative: Selenium web scraping
```

Both notebooks are self-contained — install dependencies within the first cell, then run cells sequentially.

## Key Dependencies

```bash
pip install requests pandas tqdm selenium webdriver-manager beautifulsoup4 lxml openpyxl psutil
```

- **Ticketmaster API key** is expected via `userdata.get('ticketmaster')` (Google Colab secrets). When running locally, replace with `os.environ.get('TICKETMASTER_API_KEY')` or a hardcoded key.

## Architecture

### Data Acquisition

Two parallel strategies produce the same output schema (`name`, `date`, `time`, `venue`, `team`):

1. **`ticketmaster_api.ipynb`** — Queries Ticketmaster Discovery API v2 with a 5-mile geolocation radius around each arena. Date ranges are split into weekly chunks to stay under the 1000-result API limit. Includes retry logic for 429/5xx responses.

2. **`scrapers_all.ipynb`** — Uses Selenium (headless Chrome) to scrape venue calendar websites month-by-month. Each venue has a custom scraper function because arena websites differ in DOM structure. Some venues (e.g., United Center) use iframes that break scraping.

### Reference Data

- **`nba_venues.csv`** — 30 teams with arena name and lat/long coordinates; used as the venue lookup table for API geolocation queries.

### Output Data

- **`nba_events.csv`** — ~2,500 events after cleaning. Key cleaning steps: remove add-on/package listings (vouchers, suite passes), deduplicate by `(team, date, time, venue)`, filter to season date range.

### Typical Workflow

```
nba_venues.csv  →  ticketmaster_api.ipynb  →  nba_events.csv
                        (or scrapers_all.ipynb)
```

## Season Date Range

```python
start_date = datetime(2025, 10, 21)
end_date   = datetime(2026, 4, 12)
```

## Known Issues

- **United Center** Selenium scraper fails due to iframe structure — use Ticketmaster API data for this venue.
- Ticketmaster API returns non-NBA events at the same venues; post-collection filtering is required.
- Rate limiting (HTTP 429) is handled by `safe_request()` with exponential backoff; do not remove this logic.
