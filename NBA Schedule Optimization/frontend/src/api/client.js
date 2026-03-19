import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 180_000,   // 3 min — simulate now includes game-cache build (~10-20s)
  headers: { 'Content-Type': 'application/json' },
});

export const api = {
  /** GET /api/seeds/default */
  getDefaultSeeds: () =>
    http.get('/seeds/default').then((r) => r.data),

  /** GET /api/seeds/live — ESPN standings with hardcoded fallback */
  getLiveSeeds: () =>
    http.get('/seeds/live').then((r) => r.data),

  /** GET /api/venues → [{ team, venue, lat, lon }] */
  getVenues: () =>
    http.get('/venues').then((r) => r.data),

  /** POST /api/simulate → { session_id, n_samples, east_seeds, west_seeds } */
  simulate: (eastSeeds, westSeeds, nSamples = 20000) =>
    http
      .post('/simulate', { east_seeds: eastSeeds, west_seeds: westSeeds, n_samples: nSamples })
      .then((r) => r.data),

  /** GET /api/probabilities?session_id=X&venue=Y → VenueProbabilities */
  getProbabilities: (sessionId, venue) =>
    http
      .get('/probabilities', { params: { session_id: sessionId, venue } })
      .then((r) => r.data),

  /** POST /api/lock → { session_id, series_key, sample_count } */
  lock: (sessionId, seriesKey, winner, length) =>
    http
      .post('/lock', { session_id: sessionId, series_key: seriesKey, winner, length })
      .then((r) => r.data),

  /** POST /api/unlock */
  unlock: (sessionId, seriesKey) =>
    http
      .post('/unlock', { session_id: sessionId, series_key: seriesKey })
      .then((r) => r.data),

  /** POST /api/reset-locks?session_id=X */
  resetLocks: (sessionId) =>
    http
      .post('/reset-locks', null, { params: { session_id: sessionId } })
      .then((r) => r.data),

  /** GET /api/events?venue=X&date=Y → { events: string[] } */
  getEvents: (venue, date) =>
    http.get('/events', { params: { venue, date } }).then((r) => r.data),

  /** POST /api/stress-test → StressTestResponse */
  stressTest: (sessionId, configA, configB) =>
    http
      .post('/stress-test', { session_id: sessionId, config_a: configA, config_b: configB })
      .then((r) => r.data),

  /** GET /api/net-ratings */
  getNets: () => http.get('/net-ratings').then((r) => r.data),

  /** POST /api/net-ratings */
  updateNets: (ratings) => http.post('/net-ratings', { ratings }).then((r) => r.data),

  /** GET /api/calibration */
  getCalibration: (sessionId) =>
    http.get('/calibration', { params: { session_id: sessionId } }).then((r) => r.data),

  /** GET /api/bracket/live */
  getLiveBracket: (sessionId) =>
    http.get('/bracket/live', { params: { session_id: sessionId } }).then((r) => r.data),
};
