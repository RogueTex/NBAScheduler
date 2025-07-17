# NBA Playoff Scheduler

This project scrapes events from NBA stadium venues and generates an optimal playoff schedule, accounting for venue availability and user-defined constraints. It features an interactive UI to select playoff teams and visualize the bracket and schedule.

## Features
- Webscrapes events for each NBA stadium
- Generates optimal playoff schedule (minimizing series duration, enforcing rest days, avoiding venue conflicts)
- Interactive UI to select 8 teams per conference and visualize bracket/schedule

## Project Structure
- `backend/`: FastAPI app for scraping, scheduling, and API endpoints
- `frontend/`: React app for interactive UI

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Usage
1. Start both backend and frontend servers.
2. In the UI, select 8 teams from each conference.
3. Click 'Generate Schedule' to view the playoff bracket and optimal schedule.
