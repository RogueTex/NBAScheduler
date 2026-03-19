// ESPN 3-letter abbreviations for logo CDN — more stable than numeric IDs
const TEAM_ABBR = {
  'Atlanta Hawks': 'atl',
  'Boston Celtics': 'bos',
  'Brooklyn Nets': 'bkn',
  'Charlotte Hornets': 'cha',
  'Chicago Bulls': 'chi',
  'Cleveland Cavaliers': 'cle',
  'Dallas Mavericks': 'dal',
  'Denver Nuggets': 'den',
  'Detroit Pistons': 'det',
  'Golden State Warriors': 'gsw',
  'Houston Rockets': 'hou',
  'Indiana Pacers': 'ind',
  'Los Angeles Clippers': 'lac',
  'LA Clippers': 'lac',             // ESPN short-form alias
  'Los Angeles Lakers': 'lal',
  'LA Lakers': 'lal',               // ESPN short-form alias
  'Memphis Grizzlies': 'mem',
  'Miami Heat': 'mia',
  'Milwaukee Bucks': 'mil',
  'Minnesota Timberwolves': 'min',
  'New Orleans Pelicans': 'no',
  'New York Knicks': 'nyk',
  'Oklahoma City Thunder': 'okc',
  'Orlando Magic': 'orl',
  'Philadelphia 76ers': 'phi',
  'Phoenix Suns': 'phx',
  'Portland Trail Blazers': 'por',
  'Sacramento Kings': 'sac',
  'San Antonio Spurs': 'sas',
  'Toronto Raptors': 'tor',
  'Utah Jazz': 'utah',
  'Washington Wizards': 'was',
};

/** Returns the ESPN CDN logo URL for a team name. */
export function teamLogoUrl(teamName) {
  const abbr = TEAM_ABBR[teamName];
  if (!abbr) return null;
  return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;
}

export const ALL_TEAMS = [
  // East
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Detroit Pistons', 'Indiana Pacers',
  'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 'Orlando Magic',
  'Philadelphia 76ers', 'Toronto Raptors', 'Washington Wizards',
  // West
  'Dallas Mavericks', 'Denver Nuggets', 'Golden State Warriors', 'Houston Rockets',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
  'Minnesota Timberwolves', 'New Orleans Pelicans', 'Oklahoma City Thunder',
  'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings',
  'San Antonio Spurs', 'Utah Jazz',
].sort();

export const ROUND_LABELS = {
  0: 'Play-In',
  1: 'First Round',
  2: 'Second Round',
  3: 'Conf Finals',
  4: 'Finals',
};
export const ROUND_COLORS = {
  0: '#7c3aed',  // violet — play-in
  1: '#0284c7',  // sky    — R1
  2: '#16a34a',  // green  — R2
  3: '#d97706',  // amber  — Conf Finals
  4: '#dc2626',  // red    — Finals
};

/** Build the bracket series list from seeds + locked results.
 *  Returns: Array<{ key, round, conf, home, away, locked: bool }>
 */
export function buildBracketSeries(eastSeeds, westSeeds, lockedResults = {}) {
  const winner = (key) => lockedResults[key]?.winner ?? null;
  const label = (key, fallback) => winner(key) ?? fallback;
  const e = eastSeeds;
  const w = westSeeds;

  const abbr = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    return words[words.length - 1].slice(0, 3).toUpperCase();
  };

  const series = [
    // Round 1 — East
    { key: 'r1_0', round: 1, conf: 'East', home: e[0], away: e[7] },
    { key: 'r1_1', round: 1, conf: 'East', home: e[3], away: e[4] },
    { key: 'r1_2', round: 1, conf: 'East', home: e[2], away: e[5] },
    { key: 'r1_3', round: 1, conf: 'East', home: e[1], away: e[6] },
    // Round 1 — West
    { key: 'r1_4', round: 1, conf: 'West', home: w[0], away: w[7] },
    { key: 'r1_5', round: 1, conf: 'West', home: w[3], away: w[4] },
    { key: 'r1_6', round: 1, conf: 'West', home: w[2], away: w[5] },
    { key: 'r1_7', round: 1, conf: 'West', home: w[1], away: w[6] },
    // Round 2 — East
    {
      key: 'r2_0', round: 2, conf: 'East',
      home: label('r1_0', `${abbr(e[0])}/${abbr(e[7])}`),
      away: label('r1_1', `${abbr(e[3])}/${abbr(e[4])}`),
    },
    {
      key: 'r2_1', round: 2, conf: 'East',
      home: label('r1_2', `${abbr(e[2])}/${abbr(e[5])}`),
      away: label('r1_3', `${abbr(e[1])}/${abbr(e[6])}`),
    },
    // Round 2 — West
    {
      key: 'r2_2', round: 2, conf: 'West',
      home: label('r1_4', `${abbr(w[0])}/${abbr(w[7])}`),
      away: label('r1_5', `${abbr(w[3])}/${abbr(w[4])}`),
    },
    {
      key: 'r2_3', round: 2, conf: 'West',
      home: label('r1_6', `${abbr(w[2])}/${abbr(w[5])}`),
      away: label('r1_7', `${abbr(w[1])}/${abbr(w[6])}`),
    },
    // Round 3 — Conf Finals
    {
      key: 'r3_0', round: 3, conf: 'East',
      home: label('r2_0', 'ECF Home'),
      away: label('r2_1', 'ECF Away'),
    },
    {
      key: 'r3_1', round: 3, conf: 'West',
      home: label('r2_2', 'WCF Home'),
      away: label('r2_3', 'WCF Away'),
    },
    // Round 4 — Finals
    {
      key: 'r4_0', round: 4, conf: 'Finals',
      home: label('r3_0', 'East Champ'),
      away: label('r3_1', 'West Champ'),
    },
  ];

  return series.map((s) => ({
    ...s,
    locked: !!lockedResults[s.key],
    lockedResult: lockedResults[s.key] ?? null,
  }));
}

/** Generate a calendar grid (Sun–Sat rows) for any date range.
 *  Defaults to Apr 14 – Jun 19, 2026 (full playoff window).
 */
export function buildCalendarGrid(
  startStr = '2026-04-14',
  endStr   = '2026-06-19',
) {
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');

  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const startDow = start.getDay(); // 0=Sun … 6=Sat — computed dynamically
  const padded = [...Array(startDow).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}
