from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from scraper import get_venue_events
from scheduler import generate_playoff_schedule

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://roguetex.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NBA teams with conference and venue info
NBA_TEAMS = [
    {"name": "Boston Celtics", "conference": "East", "venue": "TD Garden"},
    {"name": "Brooklyn Nets", "conference": "East", "venue": "Barclays Center"},
    {"name": "New York Knicks", "conference": "East", "venue": "Madison Square Garden"},
    {"name": "Philadelphia 76ers", "conference": "East", "venue": "Wells Fargo Center"},
    {"name": "Toronto Raptors", "conference": "East", "venue": "Scotiabank Arena"},
    {"name": "Chicago Bulls", "conference": "East", "venue": "United Center"},
    {"name": "Cleveland Cavaliers", "conference": "East", "venue": "Rocket Mortgage FieldHouse"},
    {"name": "Detroit Pistons", "conference": "East", "venue": "Little Caesars Arena"},
    {"name": "Indiana Pacers", "conference": "East", "venue": "Gainbridge Fieldhouse"},
    {"name": "Milwaukee Bucks", "conference": "East", "venue": "Fiserv Forum"},
    {"name": "Atlanta Hawks", "conference": "East", "venue": "State Farm Arena"},
    {"name": "Charlotte Hornets", "conference": "East", "venue": "Spectrum Center"},
    {"name": "Miami Heat", "conference": "East", "venue": "Kaseya Center"},
    {"name": "Orlando Magic", "conference": "East", "venue": "Amway Center"},
    {"name": "Washington Wizards", "conference": "East", "venue": "Capital One Arena"},
    {"name": "Denver Nuggets", "conference": "West", "venue": "Ball Arena"},
    {"name": "Minnesota Timberwolves", "conference": "West", "venue": "Target Center"},
    {"name": "Oklahoma City Thunder", "conference": "West", "venue": "Paycom Center"},
    {"name": "Portland Trail Blazers", "conference": "West", "venue": "Moda Center"},
    {"name": "Utah Jazz", "conference": "West", "venue": "Delta Center"},
    {"name": "Golden State Warriors", "conference": "West", "venue": "Chase Center"},
    {"name": "LA Clippers", "conference": "West", "venue": "Crypto.com Arena"},
    {"name": "Los Angeles Lakers", "conference": "West", "venue": "Crypto.com Arena"},
    {"name": "Phoenix Suns", "conference": "West", "venue": "Footprint Center"},
    {"name": "Sacramento Kings", "conference": "West", "venue": "Golden 1 Center"},
    {"name": "Dallas Mavericks", "conference": "West", "venue": "American Airlines Center"},
    {"name": "Houston Rockets", "conference": "West", "venue": "Toyota Center"},
    {"name": "Memphis Grizzlies", "conference": "West", "venue": "FedExForum"},
    {"name": "New Orleans Pelicans", "conference": "West", "venue": "Smoothie King Center"},
    {"name": "San Antonio Spurs", "conference": "West", "venue": "Frost Bank Center"},
]

@app.get("/teams")
def get_teams():
    return {"teams": NBA_TEAMS}

@app.get("/events")
def get_events(venue: str):
    events = get_venue_events(venue)
    return {"events": events}

@app.post("/schedule")
def generate_schedule(
    east_teams: List[str] = Query(...),
    west_teams: List[str] = Query(...),
    min_days_between_games: int = Query(1)
):
    # Gather all venues for selected teams
    selected_teams = [t for t in NBA_TEAMS if t["name"] in east_teams + west_teams]
    venues = {t["venue"] for t in selected_teams}
    # Get events for each venue (mocked for now)
    events = {venue: get_venue_events(venue) for venue in venues}
    result = generate_playoff_schedule(east_teams, west_teams, events, min_days_between_games)
    return result 