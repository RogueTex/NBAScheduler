# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NBA Playoff Schedule Optimizer for 2026. Minimizes scheduling conflicts between playoff games and competing events at the same arenas. Two pipelines: (1) regular-season event collection (Oct 21, 2025 – Apr 12, 2026) and (2) playoff-window optimization (Apr 14 – Jun 19, 2026).

## Running the Pipeline

### Event collection (playoff window)

```bash
# Requires TICKETMASTER_API_KEY in .env
cp .env.example .env

python run_api.py          # fetch all 30 arenas; loads from cache/ on re-runs
python run_scrapers.py     # optional: scrape 4 venue sites (Atlanta, Boston, Brooklyn, Charlotte)
python validate.py         # compare API vs scraper coverage; outputs validation_report.txt
```

To force a re-fetch for one team:
```bash
rm cache/Oklahoma_City_Thunder.json && python run_api.py
```

To re-filter from cache without hitting the API (e.g., after changing keyword filters):
```bash
python clean_events.py
```

### Optimizer

```bash
jupyter notebook playoff_optimization.ipynb
# or non-interactive:
jupyter nbconvert --to notebook --execute playoff_optimization.ipynb --output playoff_optimization.ipynb
```

### Regular-season collection (alternate entry point)

```bash
jupyter notebook ticketmaster_api.ipynb   # API-based
jupyter notebook scrapers_all.ipynb       # Selenium scrapers
```

## Dependencies

```bash
pip install requests pandas tqdm selenium webdriver-manager beautifulsoup4 lxml scipy pulp python-dotenv
# Gurobi 11.0.3 for ILP (optional; falls back to PuLP/CBC if unavailable)
```

## Architecture

### Two separate datasets

- **Regular-season pipeline** (`ticketmaster_api.ipynb`, `scrapers_all.ipynb`) → `nba_events.csv` (~2,500 events, Oct 2025 – Apr 2026)
- **Playoff pipeline** (`run_api.py`, `run_scrapers.py`) → `nba_playoff_events_2026.csv` (338 events, Apr–Jun 2026) + `nba_playoff_scraped_2026.csv` (56 events, 4 venues)

### Cache layer

`run_api.py` saves one JSON file per team to `cache/` (e.g., `cache/Oklahoma_City_Thunder.json`). Subsequent runs skip cached venues entirely. `clean_events.py` re-runs filtering from cache without any API calls.

### Filtering logic

Both `run_api.py` and `clean_events.py` apply the same pipeline: date range filter → keyword exclusion list (vouchers, suite passes, deposits, etc.) → deduplication on `(team, date, time, venue)` → same-venue filter (keeps only events at the 30 NBA arenas, not nearby venues within the 5-mile radius).

### Optimizer internals (`playoff_optimization.ipynb`)

Six sequential sections:

1. **Data load** — merges API + scraper data; strips NBA game listings by keyword
2. **Conflict matrix** — `venue × date` pivot counting competing events per slot; used as cost lookup
3. **Monte Carlo simulation** — 20,000 bracket samples using a logistic model on net ratings (`P = 1/(1+exp(-0.15×(NRtg_home − NRtg_away + 2.5)))`); each sample draws noisy net ratings `~N(NRtg, σ=1.5)`; series lengths from exact combinatorial formula
4. **LP/ILP** — Gurobi (primary) or PuLP fallback; `build_series_schedule()` implements the scheduler
5. **DP round propagation** — `dp_optimal_conflict()` propagates round-end dates forward through the bracket tree, picking the lowest-conflict date within a ±3-day lookahead window per game
6. **Results** — saves `optimal_playoff_schedule_2026.csv`, `conflict_heatmap.png`, `conflict_score_distribution.png`

The optimizer runs the DP over 500 MCMC samples (not all 20,000) and selects the bracket with the lowest total conflict score.

### Key constants to update before each round

In `playoff_optimization.ipynb`:

- **Cell 10 (`NET_RTG`)**: refresh net ratings from basketball-reference.com
- **Cell 11 (`EAST_SEEDS`, `WEST_SEEDS`)**: update with actual play-in results after mid-April
- **`FINALS_DATES`**: hard-coded fixed game dates for the Finals (Jun 3, 5, 8, 10, 13, 16, 19)

### Scheduling constraints encoded in the optimizer

- 2-2-1-1-1 home/away format per series
- Minimum 2 days between games (1 rest day)
- +1 travel day when the venue changes between consecutive games
- Minimum 3 rest days after a 7-game series before the next round
- Finals dates are fixed (hard constraints, bypasses conflict minimization)

## Known Issues

- **FedExForum (Memphis):** Ticketmaster returns no events during the playoff window.
- **United Center (Chicago):** Selenium scraper blocked by Cloudflare; use API data only.
- **Barclays Center:** 6 events only on AXS/Live Nation; scraper data supplements API for these.
- Ticketmaster's 5-mile radius returns non-arena events; the same-venue filter in `run_api.py:193-199` handles this.
- API rate-limiting (HTTP 429) handled by `safe_request()` with exponential backoff in `run_api.py:36-60` — do not remove.

## Data Files

| File | Description |
|---|---|
| `nba_venues.csv` | 30 teams × arena name + lat/long |
| `nba_playoff_events_2026.csv` | 338 cleaned events at NBA arenas (playoff window) |
| `nba_playoff_scraped_2026.csv` | 56 scraped events (4 venues) |
| `optimal_playoff_schedule_2026.csv` | LP/ILP output (game, date, venue, conflict score) |
| `validation_report.txt` | API vs scraper coverage comparison |
| `cache/` | Per-team raw JSON from Ticketmaster API |
