import React, { useState } from 'react';
import { api } from '../api/client';
import { useSession } from '../store/session';

const S = {
  page: {
    padding: '32px 24px',
    maxWidth: 1100,
    margin: '0 auto',
    animation: 'fadeIn 0.25s ease',
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 28,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    maxWidth: 560,
    lineHeight: 1.6,
    marginBottom: 28,
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 24,
  },
  configCard: (label) => ({
    background: 'var(--surface)',
    border: `1px solid ${label === 'A' ? 'rgba(56,189,248,0.25)' : 'rgba(251,191,36,0.25)'}`,
    borderRadius: 8,
    padding: '20px',
  }),
  configHeader: (label) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  }),
  configBadge: (label) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize: 22,
    lineHeight: 1,
    width: 40,
    height: 40,
    borderRadius: 6,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: label === 'A' ? 'var(--accent-dim)' : 'rgba(251,191,36,0.12)',
    color: label === 'A' ? 'var(--accent)' : 'var(--yellow)',
    border: `1px solid ${label === 'A' ? 'rgba(56,189,248,0.3)' : 'rgba(251,191,36,0.3)'}`,
  }),
  configTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  input: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-data)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  select: {
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-data)',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b85a0'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 30,
  },
  compareRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 28,
  },
  compareBtn: (loading) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '13px 48px',
    borderRadius: 6,
    border: 'none',
    background: loading ? 'var(--dim)' : 'var(--accent)',
    color: loading ? 'var(--muted)' : '#ffffff',
    cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: loading ? 'none' : '0 0 20px rgba(217,119,6,0.2)',
    transition: 'transform 0.1s, box-shadow 0.15s',
  }),
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 24,
  },
  resultCard: (label, isWinner) => ({
    background: isWinner
      ? (label === 'A' ? 'rgba(56,189,248,0.06)' : 'rgba(251,191,36,0.06)')
      : 'var(--surface)',
    border: `1px solid ${isWinner
      ? (label === 'A' ? 'rgba(56,189,248,0.3)' : 'rgba(251,191,36,0.3)')
      : 'var(--border)'}`,
    borderRadius: 8,
    padding: '20px',
    position: 'relative',
  }),
  winnerBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 3,
    background: 'var(--green-bg)',
    border: '1px solid rgba(0,229,160,0.3)',
    color: 'var(--green)',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  },
  statLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  statValue: {
    fontFamily: 'var(--font-data)',
    fontSize: 18,
    fontWeight: 500,
    color: 'var(--text)',
  },
  barWrap: {
    marginTop: 20,
  },
  barLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 6,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  barName: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
    width: 24,
  },
  barTrack: {
    flex: 1,
    height: 20,
    background: 'var(--surface-alt)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  barFill: (pct, color) => ({
    height: '100%',
    width: `${pct}%`,
    background: color,
    borderRadius: 2,
    transition: 'width 0.5s ease',
  }),
  barVal: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--text)',
    width: 52,
    textAlign: 'right',
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

const DEFAULT_CONFIG = {
  r1_start: '2026-04-19',
  min_rest_days: 1,
  min_round_rest: 2,
  weekend_penalty: 1.0,
  n_samples: 500,
  hca: 2.5,
};

function ConfigPanel({ label, config, onChange }) {
  return (
    <div style={S.configCard(label)}>
      <div style={S.configHeader(label)}>
        <div style={S.configBadge(label)}>{label}</div>
        <span style={S.configTitle}>Schedule Config {label}</span>
      </div>
      <div style={S.fieldGroup}>
        <div style={S.field}>
          <label style={S.fieldLabel}>Round 1 Start Date</label>
          <input
            type="date"
            style={S.input}
            value={config.r1_start}
            onChange={(e) => onChange({ ...config, r1_start: e.target.value })}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Min rest days between games</label>
          <select
            style={S.select}
            value={config.min_rest_days}
            onChange={(e) => onChange({ ...config, min_rest_days: Number(e.target.value) })}
          >
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Min rest days between rounds</label>
          <select
            style={S.select}
            value={config.min_round_rest}
            onChange={(e) => onChange({ ...config, min_round_rest: Number(e.target.value) })}
          >
            {[2, 3, 4].map((n) => <option key={n} value={n}>{n} days</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Weekend penalty multiplier</label>
          <select
            style={S.select}
            value={config.weekend_penalty}
            onChange={(e) => onChange({ ...config, weekend_penalty: Number(e.target.value) })}
          >
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((n) => (
              <option key={n} value={n}>{n === 1.0 ? '1.0× (none)' : `${n}×`}</option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Bracket samples</label>
          <select
            style={S.select}
            value={config.n_samples}
            onChange={(e) => onChange({ ...config, n_samples: Number(e.target.value) })}
          >
            {[100, 250, 500, 1000, 2000].map((n) => (
              <option key={n} value={n}>{n.toLocaleString()}</option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Home-court advantage (pts)</label>
          <select
            style={S.select}
            value={config.hca}
            onChange={(e) => onChange({ ...config, hca: Number(e.target.value) })}
          >
            {[0.0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((n) => (
              <option key={n} value={n}>{n} pts</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, result, isWinner }) {
  const color = label === 'A' ? 'var(--accent)' : 'var(--yellow)';
  return (
    <div style={S.resultCard(label, isWinner)}>
      {isWinner && <span style={S.winnerBadge}>Lower conflict</span>}
      <div style={{ ...S.configHeader(label), marginBottom: 16 }}>
        <div style={S.configBadge(label)}>{label}</div>
        <span style={S.configTitle}>Results {label}</span>
      </div>
      {[
        { label: 'Mean conflict', value: result.mean_conflict.toFixed(2) },
        { label: 'Std dev', value: result.std_conflict.toFixed(2) },
        { label: 'Best case', value: result.min_conflict.toFixed(2) },
        { label: 'Worst case', value: result.max_conflict.toFixed(2) },
      ].map((stat) => (
        <div key={stat.label} style={S.statRow}>
          <span style={S.statLabel}>{stat.label}</span>
          <span style={{ ...S.statValue, color: stat.label === 'Mean conflict' ? color : 'var(--text)' }}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StressTest() {
  const { sessionId } = useSession();
  const [configA, setConfigA] = useState({ ...DEFAULT_CONFIG });
  const [configB, setConfigB] = useState({ ...DEFAULT_CONFIG, r1_start: '2026-04-21', min_rest_days: 2, weekend_penalty: 1.5 });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.stressTest(sessionId, configA, configB);
      setResults(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Stress test failed.');
    } finally {
      setLoading(false);
    }
  };

  const aWins = results && results.config_a.mean_conflict < results.config_b.mean_conflict;
  const bWins = results && results.config_b.mean_conflict < results.config_a.mean_conflict;

  // Bar chart max for scaling
  const barMax = results
    ? Math.max(results.config_a.mean_conflict, results.config_b.mean_conflict) * 1.15
    : 100;

  return (
    <div style={S.page}>
      <div style={S.pageTitle}>Schedule Stress Test</div>
      <div style={S.subtitle}>
        Compare two schedule configurations by computing expected total conflict score across bracket samples.
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px 24px',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
            What is a conflict point?
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            One non-NBA event (concert, game, show) scheduled at a playoff venue on the same day as a playoff game. Each such overlap adds 1 to the score. A score of 0 means no competing events on any game day across the entire bracket.
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
            What does the total score represent?
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            The sum of conflict points across every game in the bracket. A 7-game series at a busy arena contributes more than a 4-game sweep at a quiet one. Mean conflict is the average total across all simulated bracket outcomes.
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
            Weekend penalty
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Multiplies the conflict score for any game landing on Fri, Sat, or Sun — when competing events are densest and venue conflicts are hardest to resolve. 1.0 = no penalty; 1.5 = weekends count 50% more.
          </div>
        </div>
      </div>

      <div style={S.configGrid}>
        <ConfigPanel label="A" config={configA} onChange={setConfigA} />
        <ConfigPanel label="B" config={configB} onChange={setConfigB} />
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.compareRow}>
        <button
          style={S.compareBtn(loading)}
          disabled={loading}
          onClick={handleCompare}
          onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 0 28px rgba(56,189,248,0.3)'; }}}
          onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = loading ? 'none' : '0 0 20px rgba(56,189,248,0.2)'; }}
        >
          {loading ? 'Computing...' : 'Compare Configs'}
        </button>
      </div>

      {results && (
        <>
          <div style={S.resultsGrid}>
            <ResultCard label="A" result={results.config_a} isWinner={aWins} />
            <ResultCard label="B" result={results.config_b} isWinner={bWins} />
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '20px',
          }}>
            <div style={S.barLabel}>Mean conflict score comparison</div>
            {[
              { label: 'A', value: results.config_a.mean_conflict, color: 'var(--accent)' },
              { label: 'B', value: results.config_b.mean_conflict, color: 'var(--yellow)' },
            ].map((row) => (
              <div key={row.label} style={S.barRow}>
                <span style={S.barName}>Config {row.label}</span>
                <div style={S.barTrack}>
                  <div style={S.barFill((row.value / barMax) * 100, row.color)} />
                </div>
                <span style={S.barVal}>{row.value.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--dim)' }}>
              Difference: {Math.abs(results.config_a.mean_conflict - results.config_b.mean_conflict).toFixed(2)} conflict units
              {' '}({(Math.abs(results.config_a.mean_conflict - results.config_b.mean_conflict) / Math.max(results.config_a.mean_conflict, results.config_b.mean_conflict) * 100).toFixed(1)}%)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
