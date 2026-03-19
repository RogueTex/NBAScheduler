import React from 'react';
import { buildCalendarGrid, ROUND_COLORS } from '../constants';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const S = {
  wrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 4,
    minWidth: 560,
  },
  th: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '4px 0 8px',
  },
  monthLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--dim)',
    textAlign: 'left',
    paddingTop: 10,
  },
};

function cellBg(p, threshold) {
  if (p == null) return 'transparent';
  if (p === 0) return 'var(--surface)';
  if (p < threshold) return 'var(--green-bg)';
  if (p < threshold * 2) return 'var(--yellow-bg)';
  return 'var(--red-bg)';
}

function cellBorder(p, threshold) {
  if (p == null) return 'transparent';
  if (p === 0) return 'var(--border)';
  if (p < threshold) return 'rgba(0,229,160,0.25)';
  if (p < threshold * 2) return 'rgba(251,191,36,0.3)';
  return 'rgba(248,113,113,0.35)';
}

function cellColor(p, threshold) {
  if (p == null || p === 0) return 'var(--dim)';
  if (p < threshold) return 'var(--green)';
  if (p < threshold * 2) return 'var(--yellow)';
  return 'var(--red)';
}

function getMonthName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long' });
}

export default function CalendarGrid({ probMap, threshold, selectedDate, onSelectDate }) {
  const weeks = buildCalendarGrid();

  // Track month breaks for labels
  let lastMonth = null;

  return (
    <div style={S.wrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {DOW.map((d) => (
              <th key={d} style={S.th}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => {
            // Find month label
            const firstDate = week.find(Boolean);
            const monthName = firstDate ? getMonthName(firstDate) : null;
            const showMonthLabel = monthName && monthName !== lastMonth;
            if (showMonthLabel) lastMonth = monthName;

            return (
              <React.Fragment key={wi}>
                {showMonthLabel && (
                  <tr>
                    <td colSpan={7} style={S.monthLabel}>
                      {monthName}
                    </td>
                  </tr>
                )}
                <tr>
                  {week.map((dateStr, di) => {
                    if (!dateStr) {
                      return <td key={di} />;
                    }
                    const data = probMap?.[dateStr];
                    const p = data?.probability ?? null;
                    const r = data?.round_ceiling ?? 0;
                    const isSelected = selectedDate === dateStr;
                    const dayNum = new Date(dateStr + 'T00:00:00').getDate();

                    return (
                      <td key={di}>
                        <button
                          onClick={() => onSelectDate(isSelected ? null : dateStr)}
                          title={p != null ? `${(p * 100).toFixed(1)}% P(game)` : 'No data'}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            minHeight: 64,
                            padding: '8px 4px',
                            borderRadius: 5,
                            border: `1px solid ${isSelected ? 'var(--accent)' : cellBorder(p, threshold)}`,
                            background: isSelected ? 'var(--accent-dim)' : cellBg(p, threshold),
                            cursor: 'pointer',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                            boxShadow: isSelected ? '0 0 0 2px var(--accent)' : 'none',
                            outline: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = isSelected
                              ? '0 0 0 2px var(--accent)'
                              : '0 2px 8px rgba(0,0,0,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = isSelected
                              ? '0 0 0 2px var(--accent)'
                              : 'none';
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-data)',
                              fontSize: 11,
                              color: 'var(--muted)',
                              marginBottom: 4,
                            }}
                          >
                            {dayNum}
                          </span>
                          {p != null && (
                            <span
                              style={{
                                fontFamily: 'var(--font-data)',
                                fontSize: 15,
                                fontWeight: 500,
                                color: cellColor(p, threshold),
                                lineHeight: 1,
                              }}
                            >
                              {(p * 100).toFixed(0)}%
                            </span>
                          )}
                          {r >= 0 && (
                            <span
                              style={{
                                marginTop: 4,
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: ROUND_COLORS[r] ?? '#888',
                              }}
                            />
                          )}
                          {p == null && (
                            <span
                              style={{
                                fontFamily: 'var(--font-data)',
                                fontSize: 11,
                                color: 'var(--dim)',
                              }}
                            >
                              —
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
