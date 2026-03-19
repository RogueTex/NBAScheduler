# Net ratings (ORtg - DRtg per 100 possessions)
# Source: basketball-reference.com, as of Feb 27, 2026
# Update manually before each playoff round.

NET_RTG: dict[str, float] = {
    # East
    "Detroit Pistons":          7.91,
    "Boston Celtics":           7.39,
    "New York Knicks":          5.51,
    "Cleveland Cavaliers":      4.32,
    "Charlotte Hornets":        2.98,
    "Miami Heat":               2.51,
    "Toronto Raptors":          1.71,
    "Philadelphia 76ers":       0.87,
    "Orlando Magic":            0.22,
    "Atlanta Hawks":           -0.52,
    # West
    "Oklahoma City Thunder":   11.24,
    "San Antonio Spurs":        6.67,
    "Houston Rockets":          5.77,
    "Denver Nuggets":           4.77,
    "Minnesota Timberwolves":   4.21,
    "Golden State Warriors":    2.13,
    "Phoenix Suns":             0.73,
    "Los Angeles Clippers":    -0.54,
    "Los Angeles Lakers":      -0.54,
    "Portland Trail Blazers":  -2.22,
    "Memphis Grizzlies":       -2.67,
    "Milwaukee Bucks":         -3.23,
    "Dallas Mavericks":        -3.29,
    "Chicago Bulls":           -4.73,
    "New Orleans Pelicans":    -5.42,
    "Utah Jazz":               -7.77,
    "Indiana Pacers":          -7.85,
    "Brooklyn Nets":           -8.43,
    "Sacramento Kings":       -10.75,
    "Washington Wizards":     -10.77,
}
