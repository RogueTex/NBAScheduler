import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../store/session';
import { useIsMobile } from '../hooks/useBreakpoint';
import CalendarGrid from '../components/CalendarGrid';
import ThresholdSlider from '../components/ThresholdSlider';
import DateDetailPanel from '../components/DateDetailPanel';

const S = {
  page: {
    padding: '32px 24px',
    maxWidth: 1200,
    margin: '0 auto',
    animation: 'fadeIn 0.25s ease',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 28,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginRight: 8,
  },
  venueSelect: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 14,
    cursor: 'pointer',
    minWidth: 240,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b85a0'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    appearance: 'none',
    paddingRight: 30,
  },
  calendarCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '20px',
  },
  thresholdRow: {
    marginBottom: 20,
    padding: '12px 16px',
    background: 'var(--surface-alt)',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 16px',
    background: 'var(--surface-alt)',
    borderRadius: 6,
    border: '1px solid var(--border)',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
  },
  statusVal: {
    color: 'var(--text)',
    fontWeight: 500,
  },
  loadingMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
    padding: '40px 0',
    justifyContent: 'center',
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 0.7s linear infinite',
  },
  emptyMsg: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--muted)',
    fontFamily: 'var(--font-data)',
    fontSize: 13,
  },
  bracketLink: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '7px 14px',
    borderRadius: 4,
    border: '1px solid var(--border-hi)',
    color: 'var(--muted)',
    transition: 'color 0.15s, border-color 0.15s',
    marginLeft: 'auto',
  },
  csvBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '7px 14px',
    borderRadius: 4,
    border: '1px solid var(--border-hi)',
    color: 'var(--muted)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  error: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--red)',
    padding: '10px 16px',
    background: 'var(--red-bg)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 6,
    marginBottom: 16,
  },
};

function exportCSV(probMap, threshold, venue) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ROUNDS = ['', 'R1', 'R2', 'Conf Finals', 'Finals'];
  const rows = ['Date,Day,P(Game),Recommendation,Round Ceiling'];
  Object.entries(probMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, data]) => {
      const d = new Date(date + 'T00:00:00');
      const p = data.probability;
      const rec = p >= threshold * 2 ? 'Hold' : p >= threshold ? 'Flex Clause' : 'Safe to Release';
      rows.push(`${date},${DAYS[d.getDay()]},${(p * 100).toFixed(1)}%,${rec},${ROUNDS[data.round_ceiling] || ''}`);
    });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hold-release-${venue.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function VenueCalendar() {
  const { sessionId, sampleCount, lockedResults } = useSession();
  const isMobile = useIsMobile();
  const lockedCount = Object.keys(lockedResults).length;

  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [threshold, setThreshold] = useState(0.15);
  const [probData, setProbData] = useState(null);   // VenueProbabilities response
  const [probMap, setProbMap] = useState({});        // { dateStr: DateProbability }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Fetch venue list once
  useEffect(() => {
    api.getVenues().then((list) => {
      setVenues(list);
      if (list.length > 0 && !selectedVenue) setSelectedVenue(list[0].venue);
    }).catch(() => setError('Could not load venues.'));
  }, []);

  // Fetch probabilities whenever venue or locks change
  const fetchProbs = useCallback(async (venue) => {
    if (!sessionId || !venue) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProbabilities(sessionId, venue);
      setProbData(data);
      const map = {};
      for (const dp of data.dates) map[dp.date] = dp;
      setProbMap(map);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to load probabilities.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (selectedVenue) fetchProbs(selectedVenue);
  }, [selectedVenue, lockedCount, fetchProbs]);

  // Fetch competing events when date or venue changes
  useEffect(() => {
    if (!selectedDate || !selectedVenue) return;
    setEventsLoading(true);
    api.getEvents(selectedVenue, selectedDate)
      .then((d) => setSelectedDateEvents(d.events ?? []))
      .catch(() => setSelectedDateEvents([]))
      .finally(() => setEventsLoading(false));
  }, [selectedDate, selectedVenue]);

  const handleVenueChange = (e) => {
    setSelectedVenue(e.target.value);
    setSelectedDate(null);
    setSelectedDateEvents([]);
  };

  const contentStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
    gap: 24,
    alignItems: 'start',
  };

  const topBarStyle = {
    ...S.topBar,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
  };

  return (
    <div style={{ ...S.page, padding: isMobile ? '16px' : '32px 24px' }}>
      <div style={topBarStyle}>
        <span style={S.pageTitle}>Venue Calendar</span>
        <select
          style={{ ...S.venueSelect, width: isMobile ? '100%' : undefined }}
          value={selectedVenue}
          onChange={handleVenueChange}
        >
          {venues.map((v) => (
            <option key={v.venue} value={v.venue}>
              {v.team} — {v.venue}
            </option>
          ))}
        </select>
        {Object.keys(probMap).length > 0 && (
          <button
            style={S.csvBtn}
            onClick={() => exportCSV(probMap, threshold, selectedVenue)}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--accent)';
              e.target.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--muted)';
              e.target.style.borderColor = 'var(--border-hi)';
            }}
          >
            Export CSV
          </button>
        )}
        <Link
          to="/venue/bracket"
          style={{ ...S.bracketLink, marginLeft: isMobile ? 0 : 'auto' }}
          onMouseEnter={(e) => {
            e.target.style.color = 'var(--accent)';
            e.target.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'var(--muted)';
            e.target.style.borderColor = 'var(--border-hi)';
          }}
        >
          Bracket Lock →
        </Link>
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={contentStyle}>
        <div style={S.calendarCard}>
          <div style={S.thresholdRow}>
            <ThresholdSlider value={threshold} onChange={setThreshold} />
          </div>

          {loading ? (
            <div style={S.loadingMsg}>
              <span style={S.spinner} />
              Loading probability data...
            </div>
          ) : !selectedVenue ? (
            <div style={S.emptyMsg}>Select a venue to view the calendar.</div>
          ) : (
            <CalendarGrid
              probMap={probMap}
              threshold={threshold}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          <div style={S.statusBar}>
            <div style={S.statusItem}>
              Venue: <span style={S.statusVal}>{selectedVenue || '—'}</span>
            </div>
            <div style={S.statusItem}>
              Samples: <span style={S.statusVal}>{sampleCount.toLocaleString()}</span>
            </div>
            <div style={S.statusItem}>
              Locked series: <span style={S.statusVal}>{lockedCount}</span>
            </div>
            {probData && (
              <div style={S.statusItem}>
                Window: <span style={S.statusVal}>Apr 14 – Jun 19</span>
              </div>
            )}
          </div>
        </div>

        {selectedDate && probMap[selectedDate] && (
          <DateDetailPanel
            dateStr={selectedDate}
            data={probMap[selectedDate]}
            threshold={threshold}
            onClose={() => { setSelectedDate(null); setSelectedDateEvents([]); }}
            events={selectedDateEvents}
            eventsLoading={eventsLoading}
          />
        )}
      </div>
    </div>
  );
}
