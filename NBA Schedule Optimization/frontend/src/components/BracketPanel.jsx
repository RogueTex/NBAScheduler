import React, { useState } from 'react';
import { buildBracketSeries, ROUND_LABELS, ROUND_COLORS } from '../constants';

const LENGTHS = [4, 5, 6, 7];

const S = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  roundSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  roundHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  roundDot: (r) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: ROUND_COLORS[r] ?? '#888',
    flexShrink: 0,
  }),
  roundLabel: (r) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: ROUND_COLORS[r] ?? 'var(--muted)',
  }),
  seriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 8,
  },
  seriesCard: (locked) => ({
    background: locked ? 'rgba(0,229,160,0.05)' : 'var(--surface-alt)',
    border: `1px solid ${locked ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`,
    borderRadius: 6,
    padding: '12px 14px',
    cursor: locked ? 'default' : 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    position: 'relative',
  }),
  confBadge: (conf) => ({
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: conf === 'East' ? 'var(--accent)' : conf === 'West' ? 'var(--yellow)' : 'var(--green)',
    marginBottom: 6,
  }),
  matchup: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.02em',
    color: 'var(--text)',
    lineHeight: 1.3,
  },
  lockedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    color: 'var(--green)',
    background: 'var(--green-bg)',
    border: '1px solid rgba(0,229,160,0.2)',
    borderRadius: 3,
    padding: '2px 6px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  lockedResult: {
    marginTop: 8,
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--green)',
  },
  unlockBtn: {
    marginTop: 8,
    background: 'none',
    border: '1px solid rgba(248,113,113,0.25)',
    borderRadius: 3,
    color: 'var(--red)',
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
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
    maxWidth: 440,
    animation: 'fadeIn 0.2s ease',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 6,
    display: 'block',
  },
  winnerBtns: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 20,
  },
  teamBtn: (sel) => ({
    padding: '9px 14px',
    borderRadius: 5,
    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface-alt)',
    color: sel ? 'var(--accent)' : 'var(--text)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.12s, background 0.12s',
  }),
  lengthBtns: {
    display: 'flex',
    gap: 6,
    marginBottom: 24,
  },
  lengthBtn: (sel) => ({
    flex: 1,
    padding: '8px 0',
    borderRadius: 5,
    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
    background: sel ? 'var(--accent-dim)' : 'var(--surface-alt)',
    color: sel ? 'var(--accent)' : 'var(--text)',
    fontFamily: 'var(--font-data)',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.12s, background 0.12s',
  }),
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
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
  confirmBtn: (ready) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 22px',
    borderRadius: 5,
    border: 'none',
    background: ready ? 'var(--accent)' : 'var(--dim)',
    color: ready ? '#ffffff' : 'var(--muted)',
    cursor: ready ? 'pointer' : 'not-allowed',
    transition: 'background 0.15s',
  }),
};

function groupByRound(series) {
  const rounds = {};
  for (const s of series) {
    if (!rounds[s.round]) rounds[s.round] = [];
    rounds[s.round].push(s);
  }
  return rounds;
}

export default function BracketPanel({ eastSeeds, westSeeds, lockedResults, onLock, onUnlock, onReset }) {
  const [modal, setModal] = useState(null);  // { series }
  const [winner, setWinner] = useState('');
  const [length, setLength] = useState(null);

  const allSeries = buildBracketSeries(eastSeeds, westSeeds, lockedResults);
  const rounds = groupByRound(allSeries);

  const openModal = (s) => {
    if (s.locked) return;
    setModal(s);
    setWinner('');
    setLength(null);
  };

  const handleConfirm = () => {
    if (!winner || !length || !modal) return;
    onLock(modal.key, winner, length);
    setModal(null);
  };

  return (
    <div style={S.wrap}>
      {[1, 2, 3, 4].map((r) => {
        const seriesInRound = rounds[r] ?? [];
        return (
          <div key={r} style={S.roundSection}>
            <div style={S.roundHeader}>
              <span style={S.roundDot(r)} />
              <span style={S.roundLabel(r)}>{ROUND_LABELS[r]}</span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--dim)' }}>
                ({seriesInRound.filter((s) => s.locked).length}/{seriesInRound.length} locked)
              </span>
            </div>
            <div style={S.seriesGrid}>
              {seriesInRound.map((s) => (
                <div
                  key={s.key}
                  style={S.seriesCard(s.locked)}
                  onClick={() => openModal(s)}
                  onMouseEnter={(e) => {
                    if (!s.locked) {
                      e.currentTarget.style.borderColor = 'var(--border-hi)';
                      e.currentTarget.style.background = 'var(--surface-hi)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!s.locked) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--surface-alt)';
                    }
                  }}
                >
                  {s.locked && <span style={S.lockedBadge}>Locked</span>}
                  <div style={S.confBadge(s.conf)}>{s.conf}</div>
                  <div style={S.matchup}>
                    {s.home}
                    <br />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>vs</span>
                    <br />
                    {s.away}
                  </div>
                  {s.locked && s.lockedResult && (
                    <>
                      <div style={S.lockedResult}>
                        {s.lockedResult.winner} in {s.lockedResult.length}
                      </div>
                      <button
                        style={S.unlockBtn}
                        onClick={(e) => { e.stopPropagation(); onUnlock(s.key); }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(248,113,113,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        Unlock
                      </button>
                    </>
                  )}
                  {!s.locked && (
                    <div style={{ marginTop: 8, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--dim)' }}>
                      Click to lock result
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {modal && (
        <div style={S.modal} onClick={() => setModal(null)}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalTitle}>Lock Series</div>
            <div style={S.modalSub}>
              {modal.home} vs {modal.away}
            </div>

            <label style={S.fieldLabel}>Winner</label>
            <div style={S.winnerBtns}>
              {[modal.home, modal.away].map((team) => (
                <button
                  key={team}
                  style={S.teamBtn(winner === team)}
                  onClick={() => setWinner(team)}
                >
                  {team}
                </button>
              ))}
            </div>

            <label style={S.fieldLabel}>Series length</label>
            <div style={S.lengthBtns}>
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  style={S.lengthBtn(length === n)}
                  onClick={() => setLength(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button
                style={S.confirmBtn(!!winner && !!length)}
                disabled={!winner || !length}
                onClick={handleConfirm}
              >
                Confirm Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
