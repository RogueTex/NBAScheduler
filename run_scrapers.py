"""
Run and test all 5 NBA venue scrapers for the 2026 playoff window.
Outputs: nba_playoff_scraped_2026.csv

Troubleshooting notes (updated after live DOM inspection):
- State Farm / TD Garden: month header is div.month_name, next btn is div.cal-next (a div, not button)
- Barclays Center: date span.dt format is "Feb 1, 2026 -" (strip " -", parse %b %d, %Y)
- United Center: Cloudflare bot-detection blocks all automated access; use Ticketmaster API data
"""

import argparse
import os, sys, time, re
import pandas as pd
from datetime import datetime, timedelta
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

def parse_args():
    parser = argparse.ArgumentParser(description="Run NBA venue scrapers for a playoff window")
    parser.add_argument("--start-date", default=os.getenv("PLAYOFF_START", "2026-04-14"), help="YYYY-MM-DD")
    parser.add_argument("--end-date", default=os.getenv("PLAYOFF_END", "2026-06-19"), help="YYYY-MM-DD")
    parser.add_argument(
        "--output",
        default=os.getenv("SCRAPER_EVENTS_OUTPUT", "nba_playoff_scraped_2026.csv"),
        help="Output CSV path",
    )
    return parser.parse_args()

# ── Driver factory ────────────────────────────────────────────────────────────
def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    options.add_argument("--window-size=1920,1080")
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    service = Service(ChromeDriverManager().install(), log_path=os.devnull)
    return webdriver.Chrome(options=options, service=service)


# ── Shared: read current month from div.month_name, click div.cal-next ────────
def get_month_year(driver, timeout=8):
    """Return current calendar datetime from div.month_name, or None."""
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.month_name"))
        )
        return datetime.strptime(el.text.strip(), "%B %Y")
    except Exception:
        return None


def click_next_month(driver, timeout=5):
    """Click the div.cal-next button (a div with role=button, not an <a>)."""
    try:
        btn = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.cal-next"))
        )
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(2)
        return True
    except Exception:
        return False


def navigate_to_month(driver, target_month, max_clicks=8):
    """Advance calendar forward until we reach target_month (datetime)."""
    for _ in range(max_clicks):
        cur = get_month_year(driver)
        if cur is None:
            print("  Warning: could not read current month")
            return
        if cur >= target_month:
            return
        print(f"  Navigating: {cur.strftime('%B %Y')} -> next")
        if not click_next_month(driver):
            print("  No next button found during navigation")
            return
    print("  Reached max navigation clicks")


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER 1 — State Farm Arena  (statefarmarena.com)
# ═══════════════════════════════════════════════════════════════════════════════
def scrape_state_farm(driver, venue_name, url, start_date, end_date):
    print(f"\n{'='*60}")
    print(f"Scraping: {venue_name}  ({url})")
    events_data = []

    driver.get(url)
    time.sleep(3)

    # Navigate to start month
    navigate_to_month(driver, start_date.replace(day=1))

    # Scrape month by month through the window
    while True:
        cur = get_month_year(driver)
        if cur is None:
            print("  Could not read month — stopping")
            break
        print(f"  Month: {cur.strftime('%B %Y')}")
        if cur > end_date.replace(day=1):
            break

        event_elements = driver.find_elements(By.CLASS_NAME, "hasEvent")
        print(f"  Found {len(event_elements)} hasEvent elements")

        for event in event_elements:
            try:
                date_str = event.get_attribute("data-fulldate")
                if not date_str:
                    continue
                event_date = datetime.strptime(date_str, "%m-%d-%Y")
                if not (start_date <= event_date <= end_date):
                    continue

                try:
                    event_desc = event.find_element(By.CLASS_NAME, "desc")
                    a_tag = event_desc.find_element(By.TAG_NAME, "a")
                    title = a_tag.get_attribute("textContent").strip()
                    link  = a_tag.get_attribute("href") or ""
                    aria  = a_tag.get_attribute("aria-label") or ""
                    etime = aria.split("Showings at")[-1].strip() if "Showings at" in aria else "TBA"
                except Exception:
                    title, link, etime = "Unknown", "", "TBA"

                events_data.append({
                    "Venue": venue_name, "Title": title,
                    "Date":  event_date.strftime("%Y-%m-%d"), "Time": etime, "Link": link,
                })
            except Exception as e:
                print(f"  Event error: {e}")

        if not click_next_month(driver):
            print("  No next button — done")
            break

    print(f"  Total collected: {len(events_data)} events")
    return events_data


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER 2 — TD Garden  (tdgarden.com)
# ═══════════════════════════════════════════════════════════════════════════════
def scrape_td_garden(driver, venue_name, url, start_date, end_date):
    print(f"\n{'='*60}")
    print(f"Scraping: {venue_name}  ({url})")
    events_data = []

    driver.get(url)
    time.sleep(3)

    navigate_to_month(driver, start_date.replace(day=1))

    while True:
        cur = get_month_year(driver)
        if cur is None:
            print("  Could not read month — stopping")
            break
        print(f"  Month: {cur.strftime('%B %Y')}")
        if cur > end_date.replace(day=1):
            break

        event_elements = driver.find_elements(By.CLASS_NAME, "hasEvent")
        print(f"  Found {len(event_elements)} hasEvent elements")

        for event in event_elements:
            try:
                date_str = event.get_attribute("data-fulldate")
                if not date_str:
                    continue
                event_date = datetime.strptime(date_str, "%m-%d-%Y")
                if not (start_date <= event_date <= end_date):
                    continue

                try:
                    desc = event.find_element(By.CLASS_NAME, "desc")
                    a_tag = desc.find_element(By.TAG_NAME, "a")
                    title = a_tag.text.strip()
                    link  = a_tag.get_attribute("href") or ""
                except Exception:
                    title, link = "Unknown", ""

                try:
                    etime = event.find_element(By.CLASS_NAME, "showings").text.strip()
                except Exception:
                    etime = "TBA"

                events_data.append({
                    "Venue": venue_name, "Title": title,
                    "Date":  event_date.strftime("%Y-%m-%d"), "Time": etime, "Link": link,
                })
            except Exception as e:
                print(f"  Event error: {e}")

        if not click_next_month(driver):
            print("  No next button — done")
            break

    print(f"  Total collected: {len(events_data)} events")
    return events_data


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER 3 — Barclays Center  (barclayscenter.com)
# Date format on live site: "Feb 1, 2026 -" → strip " -" → parse "%b %d, %Y"
# ═══════════════════════════════════════════════════════════════════════════════
def scrape_barclays(driver, venue_name, url, start_date, end_date):
    print(f"\n{'='*60}")
    print(f"Scraping: {venue_name}  ({url})")
    events_data = []

    driver.get(url)
    time.sleep(3)

    def get_barclays_month(driver):
        """Barclays uses .cal-month with text like 'APRIL 2026'."""
        try:
            el = WebDriverWait(driver, 8).until(
                EC.presence_of_element_located((By.CLASS_NAME, "cal-month"))
            )
            txt = el.text.strip()  # e.g. "APRIL 2026"
            return datetime.strptime(txt.title(), "%B %Y")
        except Exception:
            return None

    def click_barclays_next(driver):
        try:
            btn = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CLASS_NAME, "cal-next"))
            )
            driver.execute_script("arguments[0].click();", btn)
            time.sleep(2)
            return True
        except Exception:
            return False

    def parse_barclays_date(raw):
        """Parse 'Feb 1, 2026 -' or 'Feb 1, 2026' → datetime or None."""
        raw = raw.strip().rstrip(" -").strip()
        if not raw:
            return None
        for fmt in ["%b %d, %Y", "%B %d, %Y", "%b. %d, %Y"]:
            try:
                return datetime.strptime(raw, fmt)
            except ValueError:
                continue
        return None

    # Navigate from current month to April 2026
    for _ in range(10):
        cur = get_barclays_month(driver)
        if cur is None:
            break
        if cur >= start_date.replace(day=1):
            break
        print(f"  Navigating: {cur.strftime('%B %Y')} -> next")
        click_barclays_next(driver)

    while True:
        cur = get_barclays_month(driver)
        if cur is None:
            print("  Could not read Barclays month — stopping")
            break
        print(f"  Month: {cur.strftime('%B %Y')}")
        if cur > end_date.replace(day=1):
            break

        # Use BeautifulSoup on page source for reliable parsing
        soup = BeautifulSoup(driver.page_source, "html.parser")
        wrappers = soup.select("div.event_item_wrapper")
        print(f"  Found {len(wrappers)} event wrappers")

        for wrapper in wrappers:
            try:
                date_el = wrapper.select_one("div.date span.dt")
                raw_date = date_el.get_text(strip=True) if date_el else ""
                event_date = parse_barclays_date(raw_date)
                if event_date is None:
                    continue
                if not (start_date <= event_date <= end_date):
                    continue

                title_el = wrapper.select_one("h3 a")
                title = title_el.get_text(strip=True) if title_el else "Unknown"
                link  = title_el.get("href", "") if title_el else ""

                time_el = wrapper.select_one("div.date span.time, span.time")
                etime = time_el.get_text(strip=True) if time_el else "TBA"

                events_data.append({
                    "Venue": venue_name, "Title": title,
                    "Date":  event_date.strftime("%Y-%m-%d"), "Time": etime, "Link": link,
                })
            except Exception as e:
                print(f"  Event parse error: {e}")

        if not click_barclays_next(driver):
            print("  No next button — done")
            break

    print(f"  Total collected: {len(events_data)} events")
    return events_data


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER 4 — Spectrum Center  (spectrumcentercharlotte.com)
# ═══════════════════════════════════════════════════════════════════════════════
def scrape_spectrum(driver, venue_name, url, start_date, end_date):
    print(f"\n{'='*60}")
    print(f"Scraping: {venue_name}  ({url})")
    results = []

    driver.get(url)
    time.sleep(3)

    def get_spectrum_month(soup):
        el = (soup.select_one("h2#cal-month") or
              soup.select_one(".cal-month") or
              soup.select_one("h2.month-year"))
        if el:
            try:
                return datetime.strptime(el.get_text(strip=True), "%B %Y")
            except ValueError:
                return None
        return None

    def click_spectrum_next(driver):
        for sel in [".cal-next", "a.next", "button.next-month", "div.cal-next"]:
            try:
                btn = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, sel))
                )
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(2)
                return True
            except Exception:
                continue
        return False

    # Navigate to start month
    for _ in range(10):
        soup = BeautifulSoup(driver.page_source, "html.parser")
        cur = get_spectrum_month(soup)
        if cur is None or cur >= start_date.replace(day=1):
            break
        print(f"  Navigating: {cur.strftime('%B %Y')} -> next")
        if not click_spectrum_next(driver):
            break

    for _ in range(6):  # max 6 months
        soup = BeautifulSoup(driver.page_source, "html.parser")
        cur = get_spectrum_month(soup)
        if cur is None:
            print("  No month found — stopping")
            break
        print(f"  Month: {cur.strftime('%B %Y')}")
        if cur > end_date.replace(day=1):
            break

        wrappers = soup.select("div.event_item_wrapper")
        print(f"  Found {len(wrappers)} event wrappers")

        for wrapper in wrappers:
            try:
                date_tag = wrapper.select_one("div.info .date .dt")
                time_tag = wrapper.select_one("div.info .date .time")
                if not date_tag:
                    continue
                event_date = datetime.strptime(date_tag.get_text(strip=True), "%b %d, %Y").date()
                if not (start_date.date() <= event_date <= end_date.date()):
                    continue
                etime = time_tag.get_text(strip=True).lstrip("- ").strip() if time_tag else "TBA"
                title_tag = wrapper.select_one("h3 a")
                title = title_tag.get_text(strip=True) if title_tag else "Untitled"
                link  = urljoin(url, title_tag["href"]) if title_tag and title_tag.get("href") else ""
                results.append({
                    "Venue": venue_name, "Title": title,
                    "Date":  event_date.strftime("%Y-%m-%d"), "Time": etime, "Link": link,
                })
            except Exception as e:
                print(f"  Event parse error: {e}")

        if not click_spectrum_next(driver):
            print("  No next button — done")
            break

    print(f"  Total collected: {len(results)} events")
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER 5 — United Center  (unitedcenter.com)
# NOTE: site is protected by Cloudflare bot detection; Selenium is blocked.
# The calendar iframe contains only a Cloudflare JS challenge, not event data.
# Recommendation: use Ticketmaster API data for United Center (as noted in CLAUDE.md).
# ═══════════════════════════════════════════════════════════════════════════════
def scrape_united_center(driver, venue_name, url, start_date, end_date):
    print(f"\n{'='*60}")
    print(f"Scraping: {venue_name}  ({url})")
    print("  NOTE: unitedcenter.com is protected by Cloudflare bot detection.")
    print("  The calendar iframe is a Cloudflare JS challenge, not event data.")
    print("  SKIP — use Ticketmaster API data for United Center instead (see CLAUDE.md).")
    return []


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN RUNNER
# ═══════════════════════════════════════════════════════════════════════════════
SCRAPERS = [
    ("State Farm Arena",  "https://www.statefarmarena.com/events/calendar",    scrape_state_farm),
    ("TD Garden",         "https://www.tdgarden.com/calendar",                 scrape_td_garden),
    ("Barclays Center",   "https://www.barclayscenter.com/events/event-calendar", scrape_barclays),
    ("Spectrum Center",   "https://www.spectrumcentercharlotte.com/events",    scrape_spectrum),
    ("United Center",     "https://www.unitedcenter.com/events/month/",        scrape_united_center),
]


def main():
    args = parse_args()
    start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    end_date = datetime.strptime(args.end_date, "%Y-%m-%d")

    print("NBA Playoff Scraper")
    print(f"Window: {start_date.date()} to {end_date.date()}")
    print("="*60)

    all_results = []
    summary = {}

    for venue_name, url, fn in SCRAPERS:
        driver = setup_driver()
        try:
            events = fn(driver, venue_name, url, start_date, end_date)
            all_results.extend(events)
            summary[venue_name] = {"status": "OK", "count": len(events)}
        except Exception as e:
            print(f"\nFATAL ERROR for {venue_name}: {e}")
            import traceback; traceback.print_exc()
            summary[venue_name] = {"status": f"FAILED: {e}", "count": 0}
        finally:
            try:
                driver.quit()
            except Exception:
                pass

    # Save
    if all_results:
        df = pd.DataFrame(all_results)
        df["Date"] = pd.to_datetime(df["Date"])
        df = (df.drop_duplicates(subset=["Venue", "Title", "Date"])
                .sort_values(["Date", "Venue"])
                .reset_index(drop=True))
        df.to_csv(args.output, index=False)
        print(f"\nSaved {len(df)} events to {args.output}")
        print(df.groupby("Venue").size().to_string())
    else:
        print("\nNo events collected.")

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for venue, info in summary.items():
        status_icon = "OK  " if info["status"] == "OK" else "FAIL"
        print(f"  [{status_icon}]  {venue:30s}  {info['count']:3d} events  {info['status'] if info['status'] != 'OK' else ''}")

    return summary


if __name__ == "__main__":
    main()
