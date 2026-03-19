# NBA Playoff Schedule Optimizer

Optimize NBA playoff scheduling conflicts by combining:
- Ticketmaster event collection across all 30 arenas
- Supplemental venue scrapers for selected arenas
- Monte Carlo bracket simulation + LP/ILP optimization (notebook)

## Current Repository Layout

- `run_api.py` - Collect Ticketmaster events, cache by team, clean/filter to arena-level events
- `clean_events.py` - Re-run cleaning from cached JSON without API calls
- `run_scrapers.py` - Selenium scrapers for selected venue calendars
- `validate.py` - Compare API results against scraper results
- `playoff_optimization.ipynb` - Bracket simulation and schedule optimization
- `nba_venues.csv` - Team/arena metadata
- Generated outputs (CSV/PNG) from latest run

Note: earlier FastAPI/React app code was removed from `main` in commit `706d93b`. A static frontend build still exists on the `gh-pages` branch.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# add TICKETMASTER_API_KEY=...
```

## Run Pipeline

```bash
python run_api.py
python run_scrapers.py
python validate.py
jupyter notebook playoff_optimization.ipynb
```

## Script Options

### `run_api.py`

```bash
python run_api.py \
  --start-date 2026-04-14 \
  --end-date 2026-06-19 \
  --output nba_playoff_events_2026.csv \
  --cache-dir cache
```

Useful refresh flags:

```bash
python run_api.py --refresh-all
python run_api.py --refresh-team "Oklahoma City Thunder"
```

### `clean_events.py`

```bash
python clean_events.py --start-date 2026-04-14 --end-date 2026-06-19
```

### `run_scrapers.py`

```bash
python run_scrapers.py --start-date 2026-04-14 --end-date 2026-06-19
```

### `validate.py`

```bash
python validate.py \
  --api-csv nba_playoff_events_2026.csv \
  --scraper-csv nba_playoff_scraped_2026.csv
```

## Environment

`.env.example`:

```bash
TICKETMASTER_API_KEY=your_key_here
```

## Known Limitations

- United Center scraping is blocked by Cloudflare in automated sessions.
- Some events appear on venue-specific providers before Ticketmaster indexing.
- Scraper selectors may need updates when venue sites change DOM structure.

## Development Checks

```bash
python -m py_compile run_api.py run_scrapers.py clean_events.py validate.py
pytest
```
