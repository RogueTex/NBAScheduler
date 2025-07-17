# scheduler.py
# Functions to generate optimal NBA playoff schedule
from datetime import datetime, timedelta

def generate_playoff_schedule(east_teams, west_teams, events, min_days_between_games):
    # Assume playoffs start today
    start_date = datetime.today()
    rounds = [
        ("Quarterfinals", 8),
        ("Semifinals", 4),
        ("Conference Finals", 2),
        ("NBA Finals", 1)
    ]
    bracket = {"East": [], "West": [], "Finals": None}
    schedule = []
    # Helper to get next available date for a venue
    def next_available(venue, after_date):
        busy = set(e['date'] for e in events.get(venue, []))
        d = after_date
        while d.strftime('%Y-%m-%d') in busy:
            d += timedelta(days=1)
        return d
    # Simulate each conference
    for conf, teams in [("East", east_teams), ("West", west_teams)]:
        round_teams = teams[:]
        round_start = start_date
        for rnd, num in rounds[:-1]:
            matchups = [(round_teams[i], round_teams[-(i+1)]) for i in range(num//2)]
            rnd_games = []
            for high, low in matchups:
                venue = None
                # Find venue for high seed
                for t in events:
                    if t == high or t == low:
                        venue = t
                        break
                # Each series goes 7 games, alternate venues (simplified)
                game_dates = []
                d = round_start
                for g in range(7):
                    d = next_available(venue, d)
                    game_dates.append(d.strftime('%Y-%m-%d'))
                    d += timedelta(days=min_days_between_games)
                rnd_games.append({"teams": [high, low], "dates": game_dates})
                schedule.append({"round": rnd, "teams": [high, low], "dates": game_dates})
            # Top seeds win
            round_teams = [m[0] for m in matchups]
            round_start = d
            bracket[conf].append(rnd_games)
    # NBA Finals
    east_champ = east_teams[0]
    west_champ = west_teams[0]
    finals_venue = east_champ
    d = round_start
    finals_games = []
    for g in range(7):
        d = next_available(finals_venue, d)
        finals_games.append(d.strftime('%Y-%m-%d'))
        d += timedelta(days=min_days_between_games)
    schedule.append({"round": "NBA Finals", "teams": [east_champ, west_champ], "dates": finals_games})
    bracket["Finals"] = {"teams": [east_champ, west_champ], "dates": finals_games}
    return {"schedule": schedule, "bracket": bracket} 