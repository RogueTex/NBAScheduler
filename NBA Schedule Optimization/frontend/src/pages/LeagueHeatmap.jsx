import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../store/session';
import Heatmap from '../components/Heatmap';

const S = {
  page: {
    padding: '32px 24px',
    maxWidth: 1300,
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
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    maxWidth: 560,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  confBtn: (sel) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '5px 14px',
    borderRadius: 4,
    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'transparent',
    color: sel ? 'var(--accent)' : 'var(--muted)',
    cursor: 'pointer',
    transition: 'all 0.12s',
  }),
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '20px',
    marginBottom: 24,
  },
  progress: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  progressBar: {
    height: 4,
    background: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: 'var(--accent)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  }),
  progressLabel: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  legendLabel: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
  },
  legendBar: {
    width: 120,
    height: 10,
    borderRadius: 2,
    background: 'linear-gradient(to right, #eef0f4, rgba(22,163,74,0.4), rgba(22,163,74,0.95))',
    border: '1px solid var(--border)',
  },
  detail: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '14px 18px',
    marginTop: 16,
    animation: 'fadeIn 0.2s ease',
  },
  detailTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailStat: {
    fontFamily: 'var(--font-data)',
    fontSize: 13,
    color: 'var(--muted)',
  },
  stressLink: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '7px 14px',
    borderRadius: 4,
    border: '1px solid var(--border-hi)',
    color: 'var(--muted)',
    marginLeft: 'auto',
    transition: 'color 0.15s, border-color 0.15s',
  },
};

export default function LeagueHeatmap() {
  const { sessionId } = useSession();

  const [venues, setVenues] = useState([]);
  const [venueData, setVenueData] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confFilter, setConfFilter] = useState('All');
  const [selectedCell, setSelectedCell] = useState(null);

  // Fetch all venues then probabilities in parallel batches
  const loadAll = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setVenueData([]);
    setLoadedCount(0);

    let venueList = venues;
    if (!venueList.length) {
      venueList = await api.getVenues();
      setVenues(venueList);
    }

    // Fetch all 30 in batches of 5 to avoid hammering the backend
    const results = new Array(venueList.length).fill(null);
    const BATCH = 5;
    for (let i = 0; i < venueList.length; i += BATCH) {
      const batch = venueList.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (v, bi) => {
          try {
            const data = await api.getProbabilities(sessionId, v.venue);
            const probMap = {};
            for (const dp of data.dates) probMap[dp.date] = dp;
            results[i + bi] = {
              venue: v.venue,
              team: v.team,
              conf: guessConf(v.team),
              probMap,
            };
          } catch {
            results[i + bi] = { venue: v.venue, team: v.team, conf: guessConf(v.team), probMap: {} };
          }
          setLoadedCount((c) => c + 1);
        })
      );
      // Update display after each batch
      setVenueData(results.filter(Boolean));
    }
    setLoading(false);
  }, [sessionId, venues]);

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  const filtered = confFilter === 'All'
    ? venueData
    : venueData.filter((v) => v.conf === confFilter);

  const pct = venues.length > 0 ? Math.round((loadedCount / venues.length) * 100) : 0;

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <span style={S.pageTitle}>League Heatmap</span>
        <Link
          to="/league/stress-test"
          style={S.stressLink}
          onMouseEnter={(e) => {
            e.target.style.color = 'var(--accent)';
            e.target.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'var(--muted)';
            e.target.style.borderColor = 'var(--border-hi)';
          }}
        >
          Stress Test →
        </Link>
      </div>

      <div style={S.subtitle}>
        P(NBA game) across all 30 arenas, Apr 14 – Jun 19.
      </div>

      <div style={S.filterBar}>
        <span style={S.filterLabel}>Conference</span>
        {['All', 'East', 'West'].map((c) => (
          <button key={c} style={S.confBtn(confFilter === c)} onClick={() => setConfFilter(c)}>
            {c}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} venues
        </span>
      </div>

      <div style={S.card}>
        {loading && pct < 100 && (
          <div style={S.progress}>
            <div style={S.progressLabel}>
              Loading venue data... {loadedCount} / {venues.length}
            </div>
            <div style={S.progressBar}>
              <div style={S.progressFill(pct)} />
            </div>
          </div>
        )}

        <div style={S.legendRow}>
          <span style={S.legendLabel}>0%</span>
          <div style={S.legendBar} />
          <span style={S.legendLabel}>50%+</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>
            P(game)
          </span>
        </div>

        {filtered.length > 0 ? (
          <Heatmap venueData={filtered} onCellClick={setSelectedCell} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontFamily: 'var(--font-data)', fontSize: 13 }}>
            {loading ? 'Loading...' : 'No data available.'}
          </div>
        )}

        {selectedCell && (
          <div style={S.detail}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={S.detailTitle}>{selectedCell.team}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  {selectedCell.venue}
                </div>
                <div style={S.detailStat}>
                  Date: <span style={{ color: 'var(--text)' }}>{selectedCell.date}</span>
                  <span style={{ margin: '0 12px', color: 'var(--dim)' }}>|</span>
                  P(game): <span style={{ color: 'var(--green)', fontWeight: 500 }}>
                    {(selectedCell.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Rough East/West split by team name
const EAST_TEAMS = new Set([
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Detroit Pistons', 'Indiana Pacers',
  'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 'Orlando Magic',
  'Philadelphia 76ers', 'Toronto Raptors', 'Washington Wizards',
]);

function guessConf(team) {
  return EAST_TEAMS.has(team) ? 'East' : 'West';
}
