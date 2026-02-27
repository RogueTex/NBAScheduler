# NBA 2026 Playoff Schedule Optimizer

Minimizes scheduling conflicts between NBA playoff games and competing events at the same arenas. Uses Ticketmaster API data, Monte Carlo bracket simulation, and LP/ILP optimization.

## How it works

```
nba_venues.csv  →  run_api.py          →  nba_playoff_events_2026.csv
                   run_scrapers.py     →  nba_playoff_scraped_2026.csv
                   validate.py         →  validation_report.txt
                       ↓
              playoff_optimization.ipynb
                  • Conflict matrix (events per arena per date)
                  • Monte Carlo bracket simulation (net-rating logistic model)
                  • LP/ILP optimizer (Gurobi / PuLP fallback)
                  • DP round-to-round scheduling
```

## Quickstart

```bash
pip install requests pandas tqdm selenium webdriver-manager beautifulsoup4 lxml scipy python-dotenv
cp .env.example .env          # add your Ticketmaster API key
python run_api.py             # collect events for all 30 arenas (cached)
python run_scrapers.py        # optional: scrape 4 venue websites for validation
python validate.py            # compare API vs scraper coverage
jupyter notebook playoff_optimization.ipynb
```

## Data pipeline

| Script / File | Purpose |
|---|---|
| `run_api.py` | Ticketmaster Discovery API v2 — all 30 arenas, playoff window (Apr 14 – Jun 19, 2026). Per-venue JSON cache in `cache/` avoids repeat API calls. Filters to same-arena events only. |
| `clean_events.py` | Re-runs cleaning from cache (no API calls). Run after changing keyword filters. |
| `run_scrapers.py` | Selenium scrapers for State Farm Arena, TD Garden, Barclays Center, Spectrum Center. United Center blocked by Cloudflare — use API data. |
| `validate.py` | Compares scraper results against API data; outputs `validation_report.txt` and `validation_detail.csv`. |
| `nba_venues.csv` | 30 teams with arena name and lat/long coordinates. |
| `nba_playoff_events_2026.csv` | 338 events at NBA arenas during the playoff window (same-venue filter applied). |
| `nba_playoff_scraped_2026.csv` | 56 events scraped from 4 venue websites. |

## Win probability model

Per-game win probability uses a logistic regression on net rating differential:

```
P(home wins) = 1 / (1 + exp(-0.15 × (NRtg_home − NRtg_away + 2.5)))
```

**Validation:** Harvard Sports Analysis (2024) found that margin of victory (≈ net rating) is the single best predictor of playoff performance, r = 0.941 — higher than win-loss record (0.937) or shooting efficiency (0.686).

**Randomness:** each bracket simulation samples net ratings from `N(NRtg, σ=1.5)`, so upsets occur naturally. Series lengths are derived from the exact combinatorial formula `P(win in g games) = C(g-1,3) × p⁴ × (1-p)^(g-4)`.

**2025-26 Net Ratings** (source: basketball-reference.com, Feb 27, 2026):

| Rank | Team | NRtg |
|------|------|------|
| 1 | Oklahoma City Thunder | +11.24 |
| 2 | Detroit Pistons | +7.91 |
| 3 | Boston Celtics | +7.39 |
| 4 | San Antonio Spurs | +6.67 |
| 5 | Houston Rockets | +5.77 |
| 6 | New York Knicks | +5.51 |
| 7 | Cleveland Cavaliers | +4.32 |
| 8 | Denver Nuggets | +4.77 |

## Optimization

The `playoff_optimization.ipynb` notebook:
1. Builds a conflict matrix (events per arena × date)
2. Simulates 20,000 bracket outcomes via Monte Carlo
3. For each bracket sample, uses LP/ILP (Gurobi primary, PuLP fallback) to find the game schedule minimizing total conflict score
4. Applies DP to propagate round-to-round date constraints
5. Reports the optimal schedule across all simulated brackets

## Environment

Create a `.env` file:
```
TICKETMASTER_API_KEY=your_key_here
```

Get a free API key at [developer.ticketmaster.com](https://developer.ticketmaster.com).

## Known limitations

- **FedExForum (Memphis):** No events returned by Ticketmaster during the playoff window — no conflicts to optimize for.
- **United Center (Chicago):** Selenium scraper blocked by Cloudflare. API data is used instead.
- **Barclays Center:** 6 events (BLESSD, Alejandro Sanz, Carín León, Martin Garrix ×3) are on AXS/Live Nation and don't appear in Ticketmaster — scraped data supplements the API.
- **Play-in tournament:** Seedings in `playoff_optimization.ipynb` are projected pre-play-in. Update `EAST_SEEDS` / `WEST_SEEDS` with actual play-in results before running.
