# NBA Playoff Hold Release Tool — Product Spec

## Problem

NBA arenas hold April and May dates automatically every year. The real decision point is **June**: which dates are safe to book without a flexibility clause, and which still carry meaningful NBA game risk? As the bracket resolves, arenas of eliminated teams need to know immediately which holds to release.

The tool answers one question per date: **"Is it safe to book this date normally, or do we need a flexibility clause?"**

---

## Users

### Venue Ops Mode
An arena's booking or operations team. They pick their venue, set a risk tolerance (probability threshold), and get a color-coded June calendar. As playoff rounds complete, they lock in results and watch probabilities update in real time.

### League Mode (NBA Scheduling)
The NBA scheduling team inputs two proposed schedule configurations (e.g., different rest-day rules or round start dates) and compares total expected conflict score across all bracket scenarios side by side.

---

## Core User Flows

### Flow 1: Venue Ops (pre-playoffs)

1. User arrives at app → lands on **seed selection screen**
2. User confirms or edits the 16 playoff seeds (8 East, 8 West) — defaults to current projected seeds
3. App runs Monte Carlo (20k bracket samples) and caches results
4. User selects their venue from a dropdown
5. App shows a **calendar for late May + all of June**, each date colored by P(NBA game here):
   - Green: P < threshold (safe to book normally)
   - Yellow: P between threshold and 2× threshold (consider flexibility clause)
   - Red: P > 2× threshold (hold)
6. User adjusts probability threshold via a slider (default: 15%)
7. User clicks any date to see detail: which round could land here, which matchups drive the risk, expected series length distribution

### Flow 2: Venue Ops (mid-playoffs, live bracket locking)

1. User navigates to **Bracket Lock** panel
2. After each series completes, user inputs the result: winner + series length (e.g., "OKC won in 5")
3. App filters the cached 20k samples to only those consistent with all locked results
4. Calendar probabilities update instantly — eliminated team arenas collapse to P=0, deep-run arenas get sharper estimates
5. Dates that cross below threshold turn green → venue releases the hold

### Flow 3: League Mode (schedule stress-test)

1. User selects **League View**
2. App shows a **30-arena heatmap**: rows = arenas, columns = dates, color = P(game here) averaged across all bracket samples
3. User can define **Schedule Config A vs. Config B**:
   - Inputs: First Round start date, minimum rest days between rounds, Finals fixed dates
4. App computes expected total conflict score for each config across all 20k bracket samples
5. Side-by-side comparison: mean conflict score, worst-case bracket, which arenas drive the difference

---

## Data & Computation Layer

### Monte Carlo

- **Input**: 16 seeds (8 East, 8 West)
- **Model**: logistic win probability on net rating differential + HCA (2.5 pts), noise σ=1.5
- **Output**: 20,000 complete bracket samples, each containing series winner, length, and scheduled game dates per the DP scheduler
- **Storage**: samples held in memory server-side, keyed by session (or globally if seeds are shared)
- **Latency**: ~2-5 seconds for 20k samples; runs on seed confirmation, not on page load

### Hold Probability Calculation

For venue V on date D:
```
P(game | V, D) = count(samples where any game is scheduled at V on D) / 20,000
```

When series results are locked:
```
filtered_samples = [s for s in samples if s matches all locked results]
P(game | V, D) = count(filtered_samples where game at V on D) / len(filtered_samples)
```

No re-simulation on lock — filter only. This keeps updates instant.

### Conflict Score (League Mode)

For a schedule config with round start dates R1_start, R2_start, etc.:
```
conflict_score(sample) = sum over all games of conflict_matrix[venue][game_date]
expected_conflict(config) = mean(conflict_score(s) for s in all samples)
```

Uses the existing `conflict_matrix` (venue × date count of competing events) already built in `playoff_optimization.ipynb`.

### Net Ratings

Stored as a dict in the backend (sourced from basketball-reference.com). Updated manually before each round by editing `backend/net_ratings.py`. Not user-editable in the UI.

---

## Frontend Spec (React)

### Pages / Views

```
/                   → Seed selection screen (entry point every session)
/venue              → Venue ops calendar view
/venue/bracket      → Bracket lock panel
/league             → 30-arena heatmap
/league/stress-test → Schedule config comparison
```

### Seed Selection Screen (`/`)

- Two columns: East seeds 1-8, West seeds 1-8
- Each slot is a dropdown of all 30 NBA teams
- Default: current projected seeds (hardcoded in frontend config, updated each season)
- "Run Simulation" button → POST to `/api/simulate` → loading state → redirect to `/venue`

### Venue Calendar (`/venue`)

- Venue selector dropdown (top of page)
- Date range: May 15 – June 19 (covers late R2 through Finals)
- Calendar grid: each date is a colored chip
  - Color maps to P(game): green / yellow / red based on threshold
  - Chip shows the probability as a number (e.g., "8%")
- Threshold slider: 5% – 40%, default 15%
- Date detail panel (click any date):
  - Which round(s) could land here
  - Top 3 matchups most likely to generate a game on this date
  - Series length distribution for the driving matchup
- Bracket lock status bar: shows which results have been locked, sample count remaining

### Bracket Lock Panel (`/venue/bracket`)

- Visual bracket (static layout, not interactive drag-drop)
- Each series has: home team, away team, status (pending / locked)
- Lock a series: click series → modal → select winner + length (4/5/6/7 games) → confirm
- After lock: sample count updates, calendar auto-refreshes
- "Reset all locks" button

### League Heatmap (`/league`)

- 30-row × date-column heatmap (seaborn-style, rendered as SVG or via a charting lib)
- Color: P(game) averaged across all bracket samples
- Filterable by conference (East / West / All)
- Click a cell → shows same date detail panel as venue view

### Schedule Stress-Test (`/league/stress-test`)

- Two config panels side by side (Config A | Config B)
- Each config: First Round start date, min rest days between games (1-3), min rest between rounds (2-4)
- "Compare" button → POST to `/api/stress-test` → results panel below
- Results: mean conflict score, std dev, worst-case sample, best-case sample, bar chart of score distributions

---

## Backend Spec (FastAPI)

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/simulate` | Accept seeds, run Monte Carlo, cache samples, return session ID |
| GET | `/api/probabilities` | Return P(game) per venue per date for a session |
| POST | `/api/lock` | Accept a series result, filter samples, return updated probabilities |
| POST | `/api/stress-test` | Accept two schedule configs, return conflict score comparison |
| GET | `/api/venues` | Return list of 30 venues with team names |
| GET | `/api/seeds/default` | Return current default projected seeds |

### Session Model

- Each call to `/api/simulate` returns a `session_id` (UUID)
- Samples stored in a dict: `sessions[session_id] = list[BracketSample]`
- Sessions expire after 2 hours of inactivity (simple TTL dict, no Redis needed for demo)
- Lock state stored alongside samples: `sessions[session_id].locked_results = {}`

### File Structure

```
backend/
  main.py              ← FastAPI app, route definitions
  simulator.py         ← Monte Carlo: build_bracket(), sample_series(), series_win_prob()
  scheduler.py         ← DP scheduler: dp_optimal_conflict(), game date assignment
  conflict.py          ← Load conflict_matrix from CSV, get_conflict() lookup
  net_ratings.py       ← NET_RTG dict, updated manually each round
  sessions.py          ← In-memory session store with TTL
  models.py            ← Pydantic request/response models
  seeds.py             ← Default projected seeds (EAST_SEEDS, WEST_SEEDS)

frontend/
  src/
    pages/
      SeedSelection.jsx
      VenueCalendar.jsx
      BracketLock.jsx
      LeagueHeatmap.jsx
      StressTest.jsx
    components/
      CalendarGrid.jsx
      DateDetailPanel.jsx
      BracketPanel.jsx
      ThresholdSlider.jsx
      Heatmap.jsx
    api/
      client.js         ← axios wrapper for all backend calls
    store/
      session.js        ← session ID + locked results state (Zustand or Context)
```

### Key Logic Extracted from Notebook

The following functions move from `playoff_optimization.ipynb` into Python modules with no behavior change:

- `series_win_prob()` → `simulator.py`
- `sample_series()` → `simulator.py`
- `build_bracket()` → `simulator.py`
- `dp_optimal_conflict()` → `scheduler.py`
- `get_conflict()` + conflict matrix load → `conflict.py`

---

## Phased Build Plan

### Phase 1 — Backend core (start here)

1. Extract simulator + scheduler + conflict logic from notebook into `backend/` modules
2. Implement `/api/simulate` and `/api/probabilities`
3. Test: hit simulate with default seeds, verify probabilities match notebook output
4. Implement `/api/lock` with sample filtering

### Phase 2 — Venue frontend

1. Seed selection screen (hardcoded defaults, confirm button)
2. Venue calendar with threshold slider (static colors, no locking yet)
3. Date detail panel
4. Wire bracket lock panel to `/api/lock`

### Phase 3 — League view

1. 30-arena heatmap
2. `/api/stress-test` endpoint
3. Stress-test comparison UI

### Phase 4 — Deploy

1. FastAPI on Railway (or Render)
2. React on Vercel
3. CORS configured for Vercel domain
4. Environment: `TICKETMASTER_API_KEY` not needed at runtime (conflict matrix is pre-built CSV)

---

## Key Decisions & Constraints

- **No re-simulation on lock.** Filtering 20k samples is O(n) and instant. Re-running Monte Carlo on every lock would be 2-5 seconds per click.
- **Conflict matrix is static.** It's built from `nba_playoff_events_2026.csv` once and loaded at startup. It does not update live.
- **Net ratings are static per round.** Updated manually in `net_ratings.py` before each round; not user-editable.
- **June is the primary calendar window.** April-May are held by default industry-wide. The tool focuses on the decision zone: late May (R3 spillover) through June (Finals).
- **No auth for demo.** Single shared simulation keyed by seed selection. Multiple users with the same seeds share a cached result.
- **Competing events can shift.** The conflict matrix counts events at arenas, but the real risk model is NBA game probability, not event density. The conflict matrix is used for the League stress-test only — not for the venue hold-probability calendar.
