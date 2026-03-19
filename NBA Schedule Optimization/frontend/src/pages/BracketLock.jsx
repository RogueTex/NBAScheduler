import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../store/session';
import { useIsMobile } from '../hooks/useBreakpoint';
import { buildBracketSeries } from '../constants';
import BracketPanel from '../components/BracketPanel';

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
    marginBottom: 28,
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
    maxWidth: 520,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginLeft: 'auto',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resetBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '7px 14px',
    borderRadius: 4,
    border: '1px solid rgba(248,113,113,0.3)',
    color: 'var(--red)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  calendarLink: {
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
  },
  espnBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '7px 14px',
    borderRadius: 4,
    border: '1px solid rgba(56,189,248,0.3)',
    color: 'var(--accent)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  statusBar: {
    display: 'flex',
    gap: 20,
    padding: '10px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  stat: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
  },
  statVal: {
    color: 'var(--text)',
    marginLeft: 4,
  },
  statGreen: {
    color: 'var(--green)',
    marginLeft: 4,
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
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    background: 'var(--green-bg)',
    border: '1px solid rgba(0,229,160,0.3)',
    borderRadius: 6,
    padding: '10px 18px',
    fontFamily: 'var(--font-data)',
    fontSize: 13,
    color: 'var(--green)',
    animation: 'fadeIn 0.2s ease',
    zIndex: 150,
  },
  watchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  watchLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  watchSelect: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '6px 10px',
    fontSize: 13,
    cursor: 'pointer',
    minWidth: 220,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b85a0'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: 26,
  },
  deltaPanel: {
    background: 'var(--surface)',
    border: '1px solid var(--border-hi)',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 20,
    animation: 'fadeIn 0.2s ease',
  },
  deltaPanelTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    marginBottom: 12,
  },
  deltaRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  deltaChip: (color) => ({
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color,
    padding: '4px 10px',
    borderRadius: 4,
    background: `${color}18`,
    border: `1px solid ${color}44`,
  }),
  deltaAffected: {
    marginTop: 8,
  },
  deltaAffectedTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 6,
  },
  deltaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--font-data)',
    fontSize: 12,
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border-hi)',
    borderRadius: 8,
    padding: '28px 32px',
    minWidth: 360,
    maxWidth: 520,
    maxHeight: '80vh',
    overflowY: 'auto',
    animation: 'fadeIn 0.2s ease',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  cancelBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 18px',
    borderRadius: 5,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
  },
  confirmBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 22px',
    borderRadius: 5,
    border: 'none',
    background: 'var(--accent)',
    color: '#ffffff',
    cursor: 'pointer',
  },
  espnSeriesRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--surface-alt)',
    borderRadius: 4,
    border: '1px solid var(--border)',
    marginBottom: 6,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  },
};

function classifyStatus(p, threshold) {
  if (p >= threshold * 2) return 'Hold';
  if (p >= threshold) return 'Flex Clause';
  return 'Safe to Release';
}

const STATUS_COLOR = {
  'Hold': 'var(--red)',
  'Flex Clause': 'var(--yellow)',
  'Safe to Release': 'var(--green)',
};

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function BracketLock() {
  const { sessionId, eastSeeds, westSeeds, lockedResults, sampleCount, nSamples,
          addLock, removeLock, resetAllLocks, watchVenue, setWatchVenue, lockDelta, setLockDelta, clearLockDelta } = useSession();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [venues, setVenues] = useState([]);
  const [beforeProbs, setBeforeProbs] = useState(null);
  const [espnModal, setEspnModal] = useState(null); // { completed: [] } | null
  const [espnLoading, setEspnLoading] = useState(false);
  const lockedCount = Object.keys(lockedResults).length;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch venue list
  useEffect(() => {
    api.getVenues().then(setVenues).catch(() => {});
  }, []);

  // When watchVenue changes, fetch current probs as "before"
  const fetchBeforeProbs = useCallback(async (venue) => {
    if (!sessionId || !venue) return;
    try {
      const data = await api.getProbabilities(sessionId, venue);
      const map = {};
      for (const dp of data.dates) map[dp.date] = dp;
      setBeforeProbs(map);
    } catch {
      setBeforeProbs(null);
    }
  }, [sessionId]);

  useEffect(() => {
    if (watchVenue) fetchBeforeProbs(watchVenue);
  }, [watchVenue, fetchBeforeProbs]);

  const computeDelta = useCallback(async (seriesLabel, threshold = 0.15) => {
    if (!watchVenue || !beforeProbs) return;
    try {
      const data = await api.getProbabilities(sessionId, watchVenue);
      const afterMap = {};
      for (const dp of data.dates) afterMap[dp.date] = dp;

      const changed = [];
      for (const date of Object.keys(beforeProbs)) {
        const before = classifyStatus(beforeProbs[date]?.probability ?? 0, threshold);
        const after = classifyStatus(afterMap[date]?.probability ?? 0, threshold);
        if (before !== after) {
          changed.push({ date, from: before, to: after });
        }
      }

      const gained = changed.filter((c) => c.to === 'Safe to Release');
      const flex = changed.filter((c) => c.to === 'Flex Clause');
      const held = changed.filter((c) => c.to === 'Hold');

      setLockDelta({ seriesLabel, gained, flex, held, allChanged: changed.slice(0, 5) });
      setBeforeProbs(afterMap);
    } catch {
      // silently ignore delta computation failure
    }
  }, [sessionId, watchVenue, beforeProbs, setLockDelta]);

  const handleLock = async (seriesKey, winner, length) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.lock(sessionId, seriesKey, winner, length);
      addLock(seriesKey, winner, length, data.sample_count);
      const label = `${winner} in ${length}`;
      showToast(`Locked: ${label} — ${data.sample_count.toLocaleString()} samples remain`);
      await computeDelta(label);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to lock series.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (seriesKey) => {
    setLoading(true);
    setError(null);
    clearLockDelta();
    try {
      const data = await api.unlock(sessionId, seriesKey);
      removeLock(seriesKey, data.sample_count);
      showToast('Series unlocked');
      if (watchVenue) fetchBeforeProbs(watchVenue);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to unlock series.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    clearLockDelta();
    try {
      await api.resetLocks(sessionId);
      resetAllLocks();
      showToast('All locks cleared');
      if (watchVenue) fetchBeforeProbs(watchVenue);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to reset locks.');
    } finally {
      setLoading(false);
    }
  };

  const handleEspnSync = async () => {
    setEspnLoading(true);
    setError(null);
    try {
      const result = await api.getLiveBracket(sessionId);
      if (!result.live || !result.completed || result.completed.length === 0) {
        showToast(result.message ?? 'No completed series found from ESPN.');
        return;
      }
      setEspnModal(result);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to fetch ESPN bracket.');
    } finally {
      setEspnLoading(false);
    }
  };

  const handleEspnConfirm = async () => {
    if (!espnModal) return;
    const allSeries = buildBracketSeries(eastSeeds, westSeeds, lockedResults);

    for (const espnSeries of espnModal.completed) {
      const normA = normalizeName(espnSeries.team_a);
      const normB = normalizeName(espnSeries.team_b);

      for (const s of allSeries) {
        if (s.locked) continue;
        const normHome = normalizeName(s.home ?? '');
        const normAway = normalizeName(s.away ?? '');
        if (
          (normHome.includes(normA) || normA.includes(normHome)) &&
          (normAway.includes(normB) || normB.includes(normAway))
        ) {
          const actualWinner = normalizeName(espnSeries.winner).includes(normHome) ? s.home : s.away;
          await handleLock(s.key, actualWinner, espnSeries.length);
          break;
        }
      }
    }

    setEspnModal(null);
    showToast('ESPN series locked.');
  };

  const pageStyle = {
    ...S.page,
    padding: isMobile ? '16px' : '32px 24px',
  };

  const topBarStyle = {
    ...S.topBar,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={S.pageTitle}>Bracket Lock</div>
        </div>
        <div style={{ ...S.actions, marginLeft: isMobile ? 0 : 'auto' }}>
          <button
            style={S.espnBtn}
            onClick={handleEspnSync}
            disabled={espnLoading || loading}
            onMouseEnter={(e) => e.target.style.background = 'rgba(56,189,248,0.08)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            {espnLoading ? 'Syncing...' : 'Sync from ESPN'}
          </button>
          {lockedCount > 0 && (
            <button
              style={S.resetBtn}
              onClick={handleReset}
              disabled={loading}
              onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.08)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Reset All Locks
            </button>
          )}
          <Link
            to="/venue"
            style={S.calendarLink}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--accent)';
              e.target.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--muted)';
              e.target.style.borderColor = 'var(--border-hi)';
            }}
          >
            View Calendar
          </Link>
        </div>
      </div>

      <div style={S.subtitle}>
        Lock series results to filter the simulation samples. Calendar probabilities update
        instantly — eliminated arenas drop to 0%, deep-run arenas get sharper estimates.
      </div>

      <div style={S.watchRow}>
        <span style={S.watchLabel}>Watch Venue:</span>
        <select
          style={S.watchSelect}
          value={watchVenue}
          onChange={(e) => setWatchVenue(e.target.value)}
        >
          <option value="">-- None --</option>
          {venues.map((v) => (
            <option key={v.venue} value={v.venue}>
              {v.team} — {v.venue}
            </option>
          ))}
        </select>
        {watchVenue && (
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)' }}>
            Delta panel shows impact of each lock on this venue.
          </span>
        )}
      </div>

      <div style={S.statusBar}>
        <span style={S.stat}>
          Total samples: <span style={S.statVal}>{nSamples.toLocaleString()}</span>
        </span>
        <span style={S.stat}>
          Active samples: <span style={S.statGreen}>{sampleCount.toLocaleString()}</span>
        </span>
        <span style={S.stat}>
          Reduction: <span style={S.statVal}>
            {nSamples > 0 ? (((nSamples - sampleCount) / nSamples) * 100).toFixed(1) : 0}%
          </span>
        </span>
        <span style={S.stat}>
          Locked series: <span style={S.statVal}>{lockedCount} / 15</span>
        </span>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading && (
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 12,
          color: 'var(--accent)',
          marginBottom: 16,
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          Updating samples...
        </div>
      )}

      {lockDelta && watchVenue && (
        <div style={S.deltaPanel}>
          <div style={S.deltaPanelTitle}>
            Impact of Lock: {lockDelta.seriesLabel}
          </div>
          <div style={S.deltaRow}>
            {lockDelta.gained && lockDelta.gained.length > 0 && (
              <span style={S.deltaChip('var(--green)')}>
                +{lockDelta.gained.length} Safe to Release
              </span>
            )}
            {lockDelta.flex && lockDelta.flex.length > 0 && (
              <span style={S.deltaChip('var(--yellow)')}>
                {lockDelta.flex.length} Flex Clause
              </span>
            )}
            {lockDelta.held && lockDelta.held.length > 0 && (
              <span style={S.deltaChip('var(--red)')}>
                {lockDelta.held.length} Hold
              </span>
            )}
            {(!lockDelta.gained?.length && !lockDelta.flex?.length && !lockDelta.held?.length) && (
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--muted)' }}>
                No status changes for {watchVenue}
              </span>
            )}
          </div>
          {lockDelta.allChanged && lockDelta.allChanged.length > 0 && (
            <div style={S.deltaAffected}>
              <div style={S.deltaAffectedTitle}>Top affected dates</div>
              {lockDelta.allChanged.map((c) => (
                <div key={c.date} style={S.deltaItem}>
                  <span style={{ color: 'var(--muted)' }}>{c.date}</span>
                  <span>
                    <span style={{ color: STATUS_COLOR[c.from] ?? 'var(--text)' }}>{c.from}</span>
                    <span style={{ color: 'var(--dim)', margin: '0 8px' }}>→</span>
                    <span style={{ color: STATUS_COLOR[c.to] ?? 'var(--text)' }}>{c.to}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-data)' }}
            onClick={clearLockDelta}
          >
            Dismiss
          </button>
        </div>
      )}

      <BracketPanel
        eastSeeds={eastSeeds}
        westSeeds={westSeeds}
        lockedResults={lockedResults}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onReset={handleReset}
      />

      {toast && <div style={S.toast}>{toast}</div>}

      {espnModal && (
        <div style={S.modal} onClick={() => setEspnModal(null)}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalTitle}>ESPN Bracket Sync</div>
            <div style={S.modalSub}>
              {espnModal.completed.length} completed series detected. Confirm to auto-lock matched series.
            </div>
            {espnModal.completed.map((s, i) => (
              <div key={i} style={S.espnSeriesRow}>
                <span style={{ color: 'var(--text)' }}>{s.team_a} vs {s.team_b}</span>
                <span>
                  <span style={{ color: 'var(--green)', fontFamily: 'var(--font-data)', fontSize: 12 }}>
                    {s.winner}
                  </span>
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-data)', fontSize: 11, marginLeft: 8 }}>
                    in {s.length}
                  </span>
                </span>
              </div>
            ))}
            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setEspnModal(null)}>Cancel</button>
              <button style={S.confirmBtn} onClick={handleEspnConfirm}>Lock All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
