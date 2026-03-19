# NBA Playoff Schedule Optimizer

Minimizes scheduling conflicts between NBA playoff games and competing events at the same arenas. Collects real event data via Ticketmaster API and venue scrapers, simulates 20,000 bracket outcomes via Monte Carlo, and outputs an LP/ILP-optimized schedule.

Planned: React + FastAPI web UI where you can select 8 teams per conference, visualize the bracket, and generate an optimal schedule interactively.

---

## Features

- **Event data collection** — Ticketmaster Discovery API for all 30 arenas (per-venue JSON cache); Selenium scrapers for 4 venue websites as supplemental validation
- **Monte Carlo bracket simulation** — 20,000 samples from a net-rating logistic model with Gaussian noise for realistic upsets
- **LP/ILP optimizer** — Gurobi (primary) or PuLP (fallback) minimizes total conflict score subject to NBA scheduling constraints
- **DP round propagation** — round-to-round date constraints enforced via dynamic programming
- **Conflict heatmap** — visualizes event density at each arena through the playoff window

---

## Project Structure

```
backend/                    ← FastAPI app (prior version; replaced by notebooks below)
  app.py                    ← REST endpoints: /teams, /events, /schedule
  scheduler.py              ← Naive greedy scheduler (replaced by LP/ILP)
  scraper.py                ← Stub scrapers (replaced by run_scrapers.py)

frontend/                   ← React app (in progress)

# Current working pipeline:
nba_venues.csv              ← 30 teams × arena name + lat/long
run_api.py                  ← Ticketmaster API collection (all 30 arenas, cached)
clean_events.py             ← Re-filter from cache without API calls
run_scrapers.py             ← Selenium scrapers for 4 venue websites
validate.py                 ← API vs scraper coverage comparison
ticketmaster_api.ipynb      ← Notebook version of API collection
scrapers_all.ipynb          ← Notebook version of scrapers
playoff_optimization.ipynb  ← Full optimizer (conflict matrix → Monte Carlo → LP/ILP → output)

# Data files:
nba_playoff_events_2026.csv     ← 338 arena-only events (Apr 14 – Jun 19, 2026)
nba_playoff_scraped_2026.csv    ← 56 scraped events (4 venues)
validation_report.txt           ← Coverage: 100% match on 3 venues, 70% Barclays
optimal_playoff_schedule_2026.csv ← LP/ILP optimized schedule output
conflict_heatmap.png            ← Arena × date event density
conflict_score_distribution.png ← Conflict score across 20k bracket samples
```

---

## Quickstart

```bash
pip install requests pandas tqdm selenium webdriver-manager beautifulsoup4 lxml scipy pulp python-dotenv

cp .env.example .env          # add your Ticketmaster API key

python run_api.py             # collect events (loads from cache/ on re-runs)
python run_scrapers.py        # optional: scrape 4 venue sites
python validate.py            # compare API vs scraper coverage
jupyter notebook playoff_optimization.ipynb
```

---

## Update Steps

Run these before each playoff round to keep data and seedings current.

### 1. Refresh event data (re-run any time)

```bash
python run_api.py        # hits API only for venues missing from cache/
python run_scrapers.py   # re-scrape 4 venue sites
python clean_events.py   # re-filter from cache if you changed keyword filters
python validate.py       # sanity check coverage
```

To force a full re-fetch for one team, delete its cache file:
```bash
rm cache/Oklahoma_City_Thunder.json
python run_api.py
```

### 2. Update bracket seedings (after play-in tournament, mid-April)

In `playoff_optimization.ipynb` cell 11, replace the projected seeds with actual play-in results:

```python
EAST_SEEDS = [
    'Actual 1 Seed',    # 1
    'Actual 2 Seed',    # 2
    ...
]
WEST_SEEDS = [
    'Actual 1 Seed',    # 1
    ...
]
```

Current projected seeds (Feb 27, 2026):
- **East:** Detroit (1), Boston (2), NY Knicks (3), Cleveland (4), Charlotte (5), Miami (6), Toronto (7\*), Philadelphia (8\*)
- **West:** OKC (1), San Antonio (2), Houston (3), Denver (4), Minnesota (5), Golden State (6), Phoenix (7\*), Clippers (8\*)

\* May change after play-in

### 3. Update net ratings (optional, before Finals)

In `playoff_optimization.ipynb` cell 10, refresh `NET_RTG` from [basketball-reference.com](https://www.basketball-reference.com/leagues/NBA_2026_ratings.html):

```python
NET_RTG = {
    'Oklahoma City Thunder': 11.24,  # update as season progresses
    ...
}
```

### 4. Re-run the optimizer

```bash
jupyter nbconvert --to notebook --execute playoff_optimization.ipynb --output playoff_optimization.ipynb
```

Or open in Jupyter and run all cells. Outputs: `optimal_playoff_schedule_2026.csv`, `conflict_heatmap.png`, `conflict_score_distribution.png`.

---

## Win Probability Model

Per-game win probability uses a logistic regression on net rating differential:

```
P(home wins) = 1 / (1 + exp(-0.15 × (NRtg_home − NRtg_away + 2.5)))
```

**Validation:** Harvard Sports Analysis (2024) found that margin of victory (≈ net rating) is the single best predictor of playoff performance, **r = 0.941** — higher than win-loss record (0.937) or shooting efficiency (0.686).

**Randomness:** each bracket simulation samples net ratings from `N(NRtg, σ=1.5)`, producing realistic upsets. Series lengths are derived from the exact combinatorial formula `P(win in g games) = C(g-1, 3) × p⁴ × (1-p)^(g-4)`.

**2025-26 Net Ratings** (basketball-reference.com, Feb 27, 2026):

| Rank | Team | NRtg |
|------|------|------|
| 1 | Oklahoma City Thunder | +11.24 |
| 2 | Detroit Pistons | +7.91 |
| 3 | Boston Celtics | +7.39 |
| 4 | San Antonio Spurs | +6.67 |
| 5 | Houston Rockets | +5.77 |
| 6 | New York Knicks | +5.51 |
| 7 | Denver Nuggets | +4.77 |
| 8 | Cleveland Cavaliers | +4.32 |
| 9 | Minnesota Timberwolves | +4.21 |
| 10 | Charlotte Hornets | +2.98 |

---

## API & Backend

The `backend/` FastAPI app exposes:

| Endpoint | Method | Description |
|---|---|---|
| `/teams` | GET | All 30 NBA teams with conference and venue |
| `/events?venue=X` | GET | Events at a specific venue |
| `/schedule` | POST | Generate optimal schedule for selected teams |

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

CORS is configured for `https://roguetex.github.io` (React frontend deploy target).

---

## React Frontend (planned)

```bash
cd frontend
npm install
npm start
```

Planned features:
- Select 8 teams per conference from a bracket UI
- Set minimum rest days between games
- View conflict heatmap by arena
- Visualize bracket and generated schedule
- Call `/schedule` endpoint and render results

---

## Environment

```bash
cp .env.example .env
# Edit .env and add:
TICKETMASTER_API_KEY=your_key_here
```

Free API key: [developer.ticketmaster.com](https://developer.ticketmaster.com)

---

## Known Limitations

- **FedExForum (Memphis):** No events returned by Ticketmaster during the playoff window — no conflicts to optimize for.
- **United Center (Chicago):** Selenium scraper blocked by Cloudflare. API data used instead.
- **Barclays Center:** 6 events (BLESSD, Alejandro Sanz, Carín León, Martin Garrix ×3) listed on AXS/Live Nation only — scraper data supplements the API for these.
- **Play-in results:** Seedings are projected pre-play-in. Update `EAST_SEEDS`/`WEST_SEEDS` in cell 11 before running the final optimizer.
