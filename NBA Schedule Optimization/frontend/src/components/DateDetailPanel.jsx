import React from 'react';
import { ROUND_LABELS, ROUND_COLORS } from '../constants';

const S = {
  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '20px',
    minWidth: 260,
    animation: 'fadeIn 0.2s ease',
  },
  closeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
  },
  probRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid',
  },
  probNum: {
    fontFamily: 'var(--font-data)',
    fontSize: 32,
    fontWeight: 500,
  },
  probLabel: {
    fontFamily: 'var(--font-data)',
    fontSize: 12,
    color: 'var(--muted)',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 6,
  },
  roundBadge: (r) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 4,
    background: `${ROUND_COLORS[r] ?? '#666'}22`,
    border: `1px solid ${ROUND_COLORS[r] ?? '#666'}44`,
    color: ROUND_COLORS[r] ?? 'var(--muted)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.04em',
  }),
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
  }),
  divider: {
    borderColor: 'var(--border)',
    margin: '14px 0',
  },
  meta: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--dim)',
    lineHeight: 1.8,
  },
};

function probColor(p, threshold) {
  if (p === 0) return 'var(--dim)';
  if (p < threshold) return 'var(--green)';
  if (p < threshold * 2) return 'var(--yellow)';
  return 'var(--red)';
}

function probBg(p, threshold) {
  if (p === 0) return 'var(--border)';
  if (p < threshold) return 'var(--green-bg)';
  if (p < threshold * 2) return 'var(--yellow-bg)';
  return 'var(--red-bg)';
}

function probBorder(p, threshold) {
  if (p === 0) return 'var(--border)';
  if (p < threshold) return 'rgba(0,229,160,0.2)';
  if (p < threshold * 2) return 'rgba(251,191,36,0.2)';
  return 'rgba(248,113,113,0.2)';
}

function riskLabel(p, threshold) {
  if (p === 0) return 'No risk — safe to book';
  if (p < threshold) return 'Low risk — book normally';
  if (p < threshold * 2) return 'Moderate risk — consider flex clause';
  return 'High risk — hold this date';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DateDetailPanel({ dateStr, data, threshold, onClose, events, eventsLoading }) {
  if (!dateStr || !data) return null;
  const p = data.probability;
  const color = probColor(p, threshold);
  const r = data.round_ceiling;

  return (
    <div style={S.panel}>
      <div style={S.closeRow}>
        <span style={S.dateLabel}>{formatDate(dateStr)}</span>
        <button style={S.closeBtn} onClick={onClose} title="Close">×</button>
      </div>

      <div
        style={{
          ...S.probRow,
          background: probBg(p, threshold),
          borderColor: probBorder(p, threshold),
        }}
      >
        <span style={{ ...S.probNum, color }}>
          {(p * 100).toFixed(1)}%
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color }}>
            P(NBA game)
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {riskLabel(p, threshold)}
          </div>
        </div>
      </div>

      {r >= 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Round ceiling</div>
          <span style={S.roundBadge(r)}>
            <span style={S.dot(ROUND_COLORS[r])} />
            {ROUND_LABELS[r]}
          </span>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            The latest playoff round that could schedule a game here on this date.
          </div>
        </div>
      )}

      {data.top_matchups && data.top_matchups.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Driving matchups</div>
          {data.top_matchups.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 8px',
              background: 'var(--surface-alt)',
              borderRadius: 4,
              border: '1px solid var(--border)',
              marginBottom: 4,
              fontFamily: 'var(--font-body)',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text)' }}>{m.home} vs {m.away}</span>
              <span style={{ fontFamily: 'var(--font-data)', color: 'var(--accent)', fontSize: 11 }}>
                {(m.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <hr style={S.divider} />

      {/* Competing events */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Competing events at this venue</div>
        {eventsLoading ? (
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)', animation: 'pulse 1.2s ease-in-out infinite' }}>
            Loading events...
          </div>
        ) : events && events.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {events.map((ev, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text)',
                  padding: '5px 8px',
                  background: 'var(--surface-alt)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  lineHeight: 1.4,
                }}
              >
                {ev}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--dim)' }}>
            No competing events on this date
          </div>
        )}
      </div>

      <hr style={S.divider} />

      <div style={S.meta}>
        <div>Date: {dateStr}</div>
        <div>Samples: {data.sample_count?.toLocaleString()}</div>
      </div>
    </div>
  );
}
