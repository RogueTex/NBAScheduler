import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const EAST_TEAMS = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Detroit Pistons', 'Indiana Pacers',
  'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 'Orlando Magic',
  'Philadelphia 76ers', 'Toronto Raptors', 'Washington Wizards',
];

const WEST_TEAMS = [
  'Dallas Mavericks', 'Denver Nuggets', 'Golden State Warriors', 'Houston Rockets',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
  'Minnesota Timberwolves', 'New Orleans Pelicans', 'Oklahoma City Thunder',
  'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings',
  'San Antonio Spurs', 'Utah Jazz',
];

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.4)',
    backdropFilter: 'blur(6px)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  drawer: {
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border-hi)',
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s ease',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)',
    zIndex: 1,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
  body: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
  },
  sourceNote: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 20,
    padding: '8px 12px',
    background: 'var(--surface-alt)',
    borderRadius: 4,
    border: '1px solid var(--border)',
  },
  confHeader: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 16,
    paddingBottom: 6,
    borderBottom: '1px solid var(--border)',
  },
  eastLabel: { color: 'var(--accent)' },
  westLabel: { color: 'var(--yellow)' },
  teamRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border)',
  },
  teamName: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--text)',
    flex: 1,
  },
  ratingInput: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontFamily: 'var(--font-data)',
    fontSize: 13,
    padding: '4px 8px',
    width: 80,
    textAlign: 'right',
  },
  footer: {
    display: 'flex',
    gap: 10,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    position: 'sticky',
    bottom: 0,
    background: 'var(--surface)',
  },
  saveBtn: {
    flex: 1,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 16px',
    borderRadius: 5,
    border: 'none',
    background: 'var(--accent)',
    color: '#ffffff',
    cursor: 'pointer',
  },
  resimBtn: {
    flex: 1,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 16px',
    borderRadius: 5,
    border: '1px solid var(--accent)',
    background: 'transparent',
    color: 'var(--accent)',
    cursor: 'pointer',
  },
  resetBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 14px',
    borderRadius: 5,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
  },
  statusMsg: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    padding: '6px 10px',
    borderRadius: 4,
    marginBottom: 8,
  },
};

export default function NetRatingsDrawer({ isOpen, onClose, sessionId, eastSeeds, westSeeds, onResimulate }) {
  const [ratings, setRatings] = useState({});
  const [original, setOriginal] = useState({});
  const [status, setStatus] = useState(null); // { msg, ok }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api.getNets().then((data) => {
      setRatings({ ...data.ratings });
      setOriginal({ ...data.ratings });
    }).catch(() => setStatus({ msg: 'Failed to load net ratings', ok: false }));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (team, val) => {
    setRatings((prev) => ({ ...prev, [team]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const numericRatings = {};
      for (const [team, val] of Object.entries(ratings)) {
        const n = parseFloat(val);
        if (!isNaN(n)) numericRatings[team] = n;
      }
      await api.updateNets(numericRatings);
      setStatus({ msg: 'Ratings saved.', ok: true });
      return true;
    } catch {
      setStatus({ msg: 'Failed to save ratings.', ok: false });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndResim = async () => {
    const ok = await handleSave();
    if (ok && onResimulate) onResimulate();
  };

  const handleReset = () => {
    setRatings({ ...original });
    setStatus(null);
  };

  const sortedByRating = (teams) =>
    [...teams].sort((a, b) => (parseFloat(ratings[b] ?? 0) - parseFloat(ratings[a] ?? 0)));

  const renderGroup = (teams) => (
    sortedByRating(teams).map((team) => (
      ratings[team] !== undefined && (
        <div key={team} style={S.teamRow}>
          <span style={S.teamName}>{team}</span>
          <input
            type="number"
            step="0.01"
            style={{
              ...S.ratingInput,
              color: parseFloat(ratings[team]) > 0 ? 'var(--green)' : parseFloat(ratings[team]) < 0 ? 'var(--red)' : 'var(--text)',
            }}
            value={ratings[team] ?? ''}
            onChange={(e) => handleChange(team, e.target.value)}
          />
        </div>
      )
    ))
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <span style={S.title}>Net Ratings</span>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={S.body}>
          <div style={S.sourceNote}>
            Source: basketball-reference.com — ORtg minus DRtg per 100 possessions.
            These values feed the logistic model (COEFF=0.15, HCA=+2.5 pts).
          </div>

          {status && (
            <div style={{
              ...S.statusMsg,
              color: status.ok ? 'var(--green)' : 'var(--red)',
              background: status.ok ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1px solid ${status.ok ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>
              {status.msg}
            </div>
          )}

          <div style={{ ...S.confHeader, ...S.eastLabel }}>Eastern Conference</div>
          {renderGroup(EAST_TEAMS)}

          <div style={{ ...S.confHeader, ...S.westLabel }}>Western Conference</div>
          {renderGroup(WEST_TEAMS)}
        </div>

        <div style={S.footer}>
          <button style={S.resetBtn} onClick={handleReset} disabled={saving}>
            Reset
          </button>
          <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Ratings'}
          </button>
          {onResimulate && (
            <button style={S.resimBtn} onClick={handleSaveAndResim} disabled={saving}>
              Save + Re-simulate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
