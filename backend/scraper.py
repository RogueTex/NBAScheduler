# scraper.py
# Functions to scrape events for NBA stadiums
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup

# Map venue names to their event calendar URLs and a parser function
VENUE_EVENT_URLS = {
    # EASTERN CONFERENCE
    "TD Garden": {
        "url": "https://www.tdgarden.com/events",
        "parser": "parse_tdgarden"
    },
    "Barclays Center": {
        "url": "https://www.barclayscenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Madison Square Garden": {
        "url": "https://www.msg.com/calendar",
        "parser": "parse_msg"
    },
    "Wells Fargo Center": {
        "url": "https://www.wellsfargocenterphilly.com/events/all",
        "parser": None  # TODO: Add parser
    },
    "Scotiabank Arena": {
        "url": "https://www.scotiabankarena.com/events",
        "parser": None  # TODO: Add parser
    },
    "United Center": {
        "url": "https://www.unitedcenter.com/events/",
        "parser": None  # TODO: Add parser
    },
    "Rocket Mortgage FieldHouse": {
        "url": "https://www.rocketmortgagefieldhouse.com/events/all",
        "parser": None  # TODO: Add parser
    },
    "Little Caesars Arena": {
        "url": "https://www.313presents.com/events",
        "parser": None  # TODO: Add parser
    },
    "Gainbridge Fieldhouse": {
        "url": "https://www.gainbridgefieldhouse.com/events",
        "parser": None  # TODO: Add parser
    },
    "Fiserv Forum": {
        "url": "https://www.fiservforum.com/events",
        "parser": None  # TODO: Add parser
    },
    "State Farm Arena": {
        "url": "https://www.statefarmarena.com/events",
        "parser": None  # TODO: Add parser
    },
    "Spectrum Center": {
        "url": "https://www.spectrumcentercharlotte.com/events",
        "parser": None  # TODO: Add parser
    },
    "Kaseya Center": {
        "url": "https://www.kaseyacenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Amway Center": {
        "url": "https://www.amwaycenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Capital One Arena": {
        "url": "https://www.capitalonearena.com/events",
        "parser": None  # TODO: Add parser
    },
    # WESTERN CONFERENCE
    "Ball Arena": {
        "url": "https://www.ballarena.com/events",
        "parser": None  # TODO: Add parser
    },
    "Target Center": {
        "url": "https://www.targetcenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Paycom Center": {
        "url": "https://www.paycomcenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Moda Center": {
        "url": "https://www.rosequarter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Delta Center": {
        "url": "https://www.delta-center.com/events",
        "parser": None  # TODO: Add parser
    },
    "Chase Center": {
        "url": "https://www.chasecenter.com/events",
        "parser": "parse_chasecenter"
    },
    # Crypto.com Arena (shared by Lakers and Clippers)
    "Crypto.com Arena": {
        "url": "https://www.cryptoarena.com/events",
        "parser": None  # TODO: Add parser
    },
    "Footprint Center": {
        "url": "https://www.footprintcenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Golden 1 Center": {
        "url": "https://www.golden1center.com/events",
        "parser": None  # TODO: Add parser
    },
    "American Airlines Center": {
        "url": "https://www.americanairlinescenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Toyota Center": {
        "url": "https://www.toyotacenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "FedExForum": {
        "url": "https://www.fedexforum.com/events",
        "parser": None  # TODO: Add parser
    },
    "Smoothie King Center": {
        "url": "https://www.smoothiekingcenter.com/events",
        "parser": None  # TODO: Add parser
    },
    "Frost Bank Center": {
        "url": "https://www.frostbankcenter.com/events",
        "parser": None  # TODO: Add parser
    },
}

def parse_msg(soup):
    # Madison Square Garden event calendar
    events = []
    for event in soup.select('div.event-listing__event'):
        name = event.select_one('span.event-listing__event-title')
        date = event.select_one('span.event-listing__event-date')
        if name and date:
            events.append({
                "event": name.text.strip(),
                "date": date.text.strip()
            })
    return events

def parse_tdgarden(soup):
    # TD Garden event calendar
    events = []
    for event in soup.select('div.event-listing__item'):
        name = event.select_one('span.event-listing__title')
        date = event.select_one('span.event-listing__date')
        if name and date:
            events.append({
                "event": name.text.strip(),
                "date": date.text.strip()
            })
    return events

def parse_chasecenter(soup):
    # Chase Center event calendar
    events = []
    for event in soup.select('div.event-listing__item'):
        name = event.select_one('div.event-listing__title')
        date = event.select_one('div.event-listing__date')
        if name and date:
            events.append({
                "event": name.text.strip(),
                "date": date.text.strip()
            })
    return events

def get_venue_events(venue_name):
    venue = VENUE_EVENT_URLS.get(venue_name)
    if venue:
        try:
            resp = requests.get(venue["url"], timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            parser_func = globals()[venue["parser"]]
            events = parser_func(soup)
            # Try to parse date to YYYY-MM-DD if possible
            for e in events:
                try:
                    # Try to parse date string to standard format
                    dt = datetime.strptime(e["date"], "%a, %b %d, %Y")
                    e["date"] = dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
            return events
        except Exception as e:
            print(f"Error scraping {venue_name}: {e}")
    # Fallback: return mock events
    today = datetime.today()
    return [
        {"event": "Concert", "date": (today + timedelta(days=5)).strftime('%Y-%m-%d')},
        {"event": "Hockey Game", "date": (today + timedelta(days=12)).strftime('%Y-%m-%d')},
    ] 