import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSession } from '../store/session';

const S = {
  page: {
    padding: '32px 24px',
    maxWidth: 1000,
    margin: '0 auto',
    animation: 'fadeIn 0.25s ease',
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 28,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '24px',
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    marginBottom: 6,
  },
  cardSub: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 20,
  },
  loadingMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
    padding: '60px 0',
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
  error: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--red)',
    padding: '12px 16px',
    background: 'var(--red-bg)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 6,
    marginBottom: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--text)',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  },
  tdLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--text)',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  },
};

function CalibrationChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
      No calibration data available.
    </div>
  );

  const W = 480;
  const H = 300;
  const PAD = { top: 20, right: 20, bottom: 50, left: 54 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const toX = (p) => PAD.left + p * plotW;
  const toY = (p) => PAD.top + (1 - p) * plotH;

  const maxCount = Math.max(...data.map((d) => d.count));

  // Diagonal reference line points
  const diagPoints = `${toX(0)},${toY(0)} ${toX(1)},${toY(1)}`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: W }}>
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={1} />

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={PAD.left + plotW} y2={toY(v)} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="#6b85a0" fontSize={10} fontFamily="IBM Plex Mono, monospace">
            {(v * 100).toFixed(0)}%
          </text>
          <line x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={toX(v)} y={PAD.top + plotH + 16} textAnchor="middle" fill="#6b85a0" fontSize={10} fontFamily="IBM Plex Mono, monospace">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Diagonal reference */}
      <polyline points={diagPoints} fill="none" stroke="var(--dim)" strokeWidth={1.5} strokeDasharray="6 4" />

      {/* Data points */}
      {data.map((d, i) => {
        const r = 4 + (d.count / maxCount) * 10;
        return (
          <g key={i}>
            <circle
              cx={toX(d.mean_predicted)}
              cy={toY(d.actual_rate)}
              r={r}
              fill="var(--accent)"
              fillOpacity={0.7}
              stroke="var(--accent)"
              strokeWidth={1}
            />
            <title>{d.bin_label}: predicted {(d.mean_predicted * 100).toFixed(1)}%, actual {(d.actual_rate * 100).toFixed(1)}%, n={d.count}</title>
          </g>
        );
      })}

      {/* Axis labels */}
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="#6b85a0" fontSize={11} fontFamily="Barlow Condensed, sans-serif" letterSpacing="0.06em">
        PREDICTED P(HOME WINS)
      </text>
      <text
        x={14}
        y={PAD.top + plotH / 2}
        textAnchor="middle"
        fill="#6b85a0"
        fontSize={11}
        fontFamily="Barlow Condensed, sans-serif"
        letterSpacing="0.06em"
        transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
      >
        ACTUAL WIN RATE
      </text>
    </svg>
  );
}

function LengthChart({ simLengths, historicalLengths }) {
  const games = [4, 5, 6, 7];
  const W = 440;
  const H = 220;
  const PAD = { top: 16, right: 20, bottom: 44, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(
    ...games.map((g) => simLengths[g] ?? 0),
    ...games.map((g) => historicalLengths[g] ?? 0),
    0.01
  );

  const groupW = plotW / games.length;
  const barW = (groupW - 12) / 2;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: W }}>
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={1} />

      {[0, 0.1, 0.2, 0.3].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={PAD.top + plotH - (v / maxVal) * plotH} x2={PAD.left + plotW} y2={PAD.top + plotH - (v / maxVal) * plotH} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={PAD.left - 6} y={PAD.top + plotH - (v / maxVal) * plotH + 4} textAnchor="end" fill="#6b85a0" fontSize={10} fontFamily="IBM Plex Mono, monospace">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {games.map((g, gi) => {
        const groupX = PAD.left + gi * groupW + 6;
        const simH = ((simLengths[g] ?? 0) / maxVal) * plotH;
        const histH = ((historicalLengths[g] ?? 0) / maxVal) * plotH;
        return (
          <g key={g}>
            <rect
              x={groupX}
              y={PAD.top + plotH - simH}
              width={barW}
              height={simH}
              fill="var(--accent)"
              fillOpacity={0.8}
            />
            <rect
              x={groupX + barW + 4}
              y={PAD.top + plotH - histH}
              width={barW}
              height={histH}
              fill="var(--yellow)"
              fillOpacity={0.7}
            />
            <text x={groupX + barW + 2} y={PAD.top + plotH + 16} textAnchor="middle" fill="#6b85a0" fontSize={11} fontFamily="IBM Plex Mono, monospace">
              G{g}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={PAD.left + plotW - 120} y={PAD.top + 4} width={10} height={10} fill="var(--accent)" fillOpacity={0.8} />
      <text x={PAD.left + plotW - 106} y={PAD.top + 13} fill="#d4e4f0" fontSize={10} fontFamily="Barlow, sans-serif">Simulated</text>
      <rect x={PAD.left + plotW - 120} y={PAD.top + 20} width={10} height={10} fill="var(--yellow)" fillOpacity={0.7} />
      <text x={PAD.left + plotW - 106} y={PAD.top + 29} fill="#d4e4f0" fontSize={10} fontFamily="Barlow, sans-serif">Historical</text>
    </svg>
  );
}

export default function Calibration() {
  const { sessionId } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    setLoading(true);
    api.getCalibration(sessionId)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail ?? 'Failed to load calibration data.'))
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.loadingMsg}>
          <span style={S.spinner} />
          Loading calibration analysis...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.pageTitle}>Calibration</div>
        <div style={S.error}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { calibration, sim_lengths, historical_lengths, total_series, sample_count, model_params } = data;

  return (
    <div style={S.page}>
      <div style={S.pageTitle}>Model Calibration</div>
      <div style={S.subtitle}>
        Diagnostic analysis of the simulation model across {sample_count.toLocaleString()} samples
        ({total_series.toLocaleString()} series outcomes).
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Win Probability Calibration Curve</div>
        <div style={S.cardSub}>
          Each point represents one probability bin (0-10%, 10-20%, etc.). Point size reflects the number of series
          in that bin. A well-calibrated model tracks the diagonal.
        </div>
        <CalibrationChart data={calibration} />
        {calibration && calibration.length > 0 && (
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Bin</th>
                  <th style={S.th}>Mean Predicted</th>
                  <th style={S.th}>Actual Win Rate</th>
                  <th style={S.th}>Count</th>
                </tr>
              </thead>
              <tbody>
                {calibration.map((row) => (
                  <tr key={row.bin_label}>
                    <td style={S.td}>{row.bin_label}</td>
                    <td style={S.td}>{(row.mean_predicted * 100).toFixed(1)}%</td>
                    <td style={{
                      ...S.td,
                      color: Math.abs(row.mean_predicted - row.actual_rate) > 0.1 ? 'var(--yellow)' : 'var(--green)',
                    }}>
                      {(row.actual_rate * 100).toFixed(1)}%
                    </td>
                    <td style={S.td}>{row.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Series Length Distribution</div>
        <div style={S.cardSub}>
          Simulated series length frequencies vs. historical NBA averages (2010-2024).
        </div>
        <LengthChart simLengths={sim_lengths} historicalLengths={historical_lengths} />
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Games</th>
                <th style={S.th}>Simulated</th>
                <th style={S.th}>Historical</th>
                <th style={S.th}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {[4, 5, 6, 7].map((g) => {
                const sim = sim_lengths[g] ?? 0;
                const hist = historical_lengths[g] ?? 0;
                const diff = sim - hist;
                return (
                  <tr key={g}>
                    <td style={S.td}>{g} games</td>
                    <td style={S.td}>{(sim * 100).toFixed(1)}%</td>
                    <td style={S.td}>{(hist * 100).toFixed(1)}%</td>
                    <td style={{
                      ...S.td,
                      color: Math.abs(diff) > 0.05 ? 'var(--yellow)' : 'var(--green)',
                    }}>
                      {diff >= 0 ? '+' : ''}{(diff * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Model Parameters</div>
        <div style={S.cardSub}>
          Logistic win probability model: P(home wins) = 1 / (1 + exp(-k * (NRtg_home - NRtg_away + HCA)))
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Parameter</th>
              <th style={S.th}>Value</th>
              <th style={S.th}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Logistic coefficient (k)</td>
              <td style={S.td}>{model_params.logistic_coefficient}</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>Steepness of win probability curve</td>
            </tr>
            <tr>
              <td style={S.td}>Home court advantage</td>
              <td style={S.td}>+{model_params.home_court_advantage_pts} pts</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>Added to home team net rating</td>
            </tr>
            <tr>
              <td style={S.td}>NRtg noise sigma</td>
              <td style={S.td}>{model_params.noise_sigma}</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>Per-sample N(0, sigma) noise on ratings</td>
            </tr>
            <tr>
              <td style={S.td}>Ratings source</td>
              <td style={{ ...S.td, color: 'var(--accent)' }}>{model_params.source}</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>ORtg - DRtg per 100 possessions</td>
            </tr>
            <tr>
              <td style={S.td}>Samples analyzed</td>
              <td style={S.td}>{sample_count.toLocaleString()}</td>
              <td style={{ ...S.td, color: 'var(--muted)' }}>Capped at 5,000 for speed</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
