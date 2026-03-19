import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../store/session';
import { teamLogoUrl } from '../constants';

const S = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '48px 24px 80px',
    animation: 'fadeIn 0.3s ease',
  },
  eyebrow: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 40,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1,
    marginBottom: 10,
  },
  subtitle: {
    color: 'var(--muted)',
    fontSize: 14,
    maxWidth: 500,
    lineHeight: 1.6,
    marginBottom: 36,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 32,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-alt)',
  },
  confLabel: (conf) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }),
  confBadge: (conf) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 3,
    background: conf === 'East' ? 'rgba(56,189,248,0.12)' : 'rgba(251,191,36,0.12)',
    color: conf === 'East' ? 'var(--accent)' : 'var(--yellow)',
    border: `1px solid ${conf === 'East' ? 'rgba(56,189,248,0.25)' : 'rgba(251,191,36,0.25)'}`,
  }),
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  liveBadge: {
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--green)',
    background: 'var(--green-bg)',
    border: '1px solid rgba(0,229,160,0.2)',
    borderRadius: 3,
    padding: '2px 6px',
  },
  seedList: {
    padding: '8px 0',
  },
  seedRow: {
    display: 'grid',
    gridTemplateColumns: '36px 32px 1fr',
    alignItems: 'center',
    gap: 8,
    padding: '7px 18px',
    transition: 'background 0.1s',
    borderBottom: '1px solid transparent',
  },
  seedNum: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'right',
  },
  logo: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    borderRadius: 3,
    background: 'var(--surface-alt)',
    flexShrink: 0,
  },
  logoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 3,
    background: 'var(--surface-hi)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: '0.02em',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  runBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '13px 40px',
    borderRadius: 6,
    border: 'none',
    background: 'var(--accent)',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 0 24px rgba(56,189,248,0.2)',
    transition: 'transform 0.1s, box-shadow 0.15s',
  },
  refreshBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '8px 16px',
    borderRadius: 4,
    border: '1px solid var(--border-hi)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  hint: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
    lineHeight: 1.6,
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.35)',
    borderTopColor: '#ffffff',
    animation: 'spin 0.7s linear infinite',
    marginRight: 8,
    verticalAlign: 'middle',
    flexShrink: 0,
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
  loadingCard: {
    padding: '32px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  skeletonRow: {
    height: 36,
    borderRadius: 4,
    background: 'var(--surface-hi)',
    animation: 'pulse 1.4s ease-in-out infinite',
  },
};

function LogoImg({ teamName }) {
  const [err, setErr] = useState(false);
  const url = teamLogoUrl(teamName);
  if (!url || err) {
    return (
      <div style={S.logoPlaceholder}>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--dim)' }}>
          {teamName?.slice(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }
  return <img src={url} alt={teamName} style={S.logo} onError={() => setErr(true)} />;
}

const PLAYIN_DIVIDER = {
  padding: '4px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const PLAYIN_LINE = {
  flex: 1,
  height: 1,
  background: 'var(--border)',
};
const PLAYIN_LABEL = {
  fontFamily: 'var(--font-data)',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--yellow)',
  whiteSpace: 'nowrap',
};

function SeedColumn({ conf, seeds, loading }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.confLabel(conf)}>
          <span style={S.confBadge(conf)}>{conf}</span>
          <span style={S.cardTitle}>{conf}ern Conference</span>
        </div>
      </div>

      {loading ? (
        <div style={S.loadingCard}>
          {Array(10).fill(0).map((_, i) => (
            <div
              key={i}
              style={{ ...S.skeletonRow, animationDelay: `${i * 0.06}s`, opacity: 1 - i * 0.06 }}
            />
          ))}
        </div>
      ) : (
        <div style={S.seedList}>
          {seeds.map((team, i) => (
            <React.Fragment key={i}>
              {i === 6 && (
                <div style={PLAYIN_DIVIDER}>
                  <div style={PLAYIN_LINE} />
                  <span style={PLAYIN_LABEL}>Play-In Zone</span>
                  <div style={PLAYIN_LINE} />
                </div>
              )}
              <div
                style={{
                  ...S.seedRow,
                  opacity: i >= 6 ? 0.75 : 1,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={S.seedNum}>{i + 1}</span>
                <LogoImg teamName={team} />
                <span style={S.teamName}>{team || '—'}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SeedSelection() {
  const navigate = useNavigate();
  const setSession = useSession((s) => s.setSession);

  const [east, setEast] = useState([]);
  const [west, setWest] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [seedsLoading, setSeedsLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState(null);
  const [methodOpen, setMethodOpen] = useState(false);

  const fetchSeeds = async () => {
    setSeedsLoading(true);
    setError(null);
    try {
      const data = await api.getLiveSeeds();
      setEast(data.east_seeds ?? []);
      setWest(data.west_seeds ?? []);
      setIsLive(data.live ?? false);
    } catch {
      setError('Could not load seeds. Backend may be offline.');
    } finally {
      setSeedsLoading(false);
    }
  };

  useEffect(() => { fetchSeeds(); }, []);

  // Need at least 8 per conference to run; show 10 for play-in context but simulate top 8
  const isReady = east.length >= 8 && west.length >= 8 && !seedsLoading;

  const handleRun = async () => {
    if (!isReady || simLoading) return;
    setSimLoading(true);
    setError(null);
    try {
      const data = await api.simulate(east.slice(0, 10), west.slice(0, 10), 20000);
      setSession(data.session_id, data.n_samples, data.east_seeds, data.west_seeds);
      navigate('/venue');
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Simulation failed. Is the backend running?');
      setSimLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.eyebrow}>2026 NBA Playoffs</div>
      <div style={S.title}>Playoff Seeds</div>
      <div style={S.subtitle}>
        Seeds are fetched live from ESPN standings. Run the simulation to compute 20,000
        bracket scenarios and unlock the venue hold-release calendar.
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={{
        marginBottom: 28,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setMethodOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span>Model Methodology</span>
          <span style={{ fontSize: 16, lineHeight: 1, transform: methodOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </button>
        {methodOpen && (
          <div style={{
            display: 'flex',
            gap: 24,
            padding: '4px 18px 18px',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, marginTop: 14 }}>
                Prediction Model
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 340 }}>
                Logistic model on net rating differential + 2.5 pt home-court advantage.
                Per-series noise added (σ = 1.5 pts). Series lengths from exact combinatorial formula.
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, marginTop: 14 }}>
                Net Ratings Source
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                basketball-reference.com season net ratings.
                Updated manually in{' '}
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--accent)' }}>backend/net_ratings.py</span>
                {' '}before each round.
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, marginTop: 14 }}>
                Seeds Source
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                Live from ESPN standings API.
                Seeds 7-10 enter the play-in tournament. Simulation models all play-in games to determine the actual 7/8 seeds per bracket sample.
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={S.grid}>
        {/* West on LEFT, East on RIGHT */}
        <SeedColumn conf="West" seeds={west} loading={seedsLoading} />
        <SeedColumn conf="East" seeds={east} loading={seedsLoading} />
      </div>

      <div style={S.footer}>
        <button
          style={{
            ...S.runBtn,
            ...(!isReady || simLoading ? { opacity: 0.45, cursor: 'not-allowed', boxShadow: 'none' } : {}),
          }}
          disabled={!isReady || simLoading}
          onClick={handleRun}
          onMouseEnter={(e) => {
            if (isReady && !simLoading) {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 0 32px rgba(56,189,248,0.35)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'none';
            e.target.style.boxShadow = '0 0 24px rgba(56,189,248,0.2)';
          }}
        >
          {simLoading && <span style={S.spinner} />}
          {simLoading ? 'Running Simulations...' : 'Run Simulation'}
        </button>

        <button
          style={S.refreshBtn}
          disabled={seedsLoading}
          onClick={fetchSeeds}
          onMouseEnter={(e) => { e.target.style.color = 'var(--accent)'; e.target.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border-hi)'; }}
        >
          {seedsLoading ? 'Refreshing...' : 'Refresh Seeds'}
        </button>

        {!seedsLoading && (
          <div style={S.hint}>
            {isLive ? 'Live from ESPN standings.' : 'Using projected seeds (ESPN unavailable).'}
            <br />
            Simulates 20,000 brackets. Takes ~10 seconds.
          </div>
        )}
      </div>
    </div>
  );
}
