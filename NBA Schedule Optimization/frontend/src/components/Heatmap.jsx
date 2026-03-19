import React, { useMemo } from 'react';
import { teamLogoUrl } from '../constants';

// Date range: Apr 14 – Jun 19, 2026 (full playoff + play-in window)
function buildDateRange() {
  const dates = [];
  const cur = new Date(2026, 3, 14);  // Apr 14
  const end = new Date(2026, 5, 19);  // Jun 19
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const DATES = buildDateRange();

const CELL_W = 18;
const CELL_H = 22;
const LOGO_SIZE = 16;
const ROW_LABEL_W = 172;
const DATE_HEADER_H = 60;
const PAD = 4;

function pToColor(p) {
  if (p == null || p === 0) return '#eef0f4';
  // Green gradient on light background
  const t = Math.min(p / 0.5, 1);  // saturate at 50%
  if (t < 0.2) return `rgba(22,163,74,${0.12 + t * 1.2})`;
  if (t < 0.5) return `rgba(22,163,74,${0.28 + t * 0.8})`;
  return `rgba(22,163,74,${0.55 + t * 0.45})`;
}

// Group dates by month for header labels
function monthGroups(dates) {
  const groups = [];
  let cur = null;
  dates.forEach((d, i) => {
    const month = d.slice(0, 7);
    if (month !== cur) {
      groups.push({ month, start: i, label: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) });
      cur = month;
    }
  });
  return groups;
}

export default function Heatmap({ venueData, onCellClick }) {
  // venueData: Array<{ venue, team, conf, probMap: { dateStr: { probability } } }>
  const months = useMemo(() => monthGroups(DATES), []);
  const svgW = ROW_LABEL_W + DATES.length * (CELL_W + PAD) + PAD;
  const svgH = DATE_HEADER_H + venueData.length * (CELL_H + PAD) + PAD;

  if (!venueData.length) return null;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
      <svg
        width={svgW}
        height={svgH}
        style={{ display: 'block', fontFamily: 'var(--font-data)' }}
      >
        {/* Month labels */}
        {months.map((g) => (
          <text
            key={g.month}
            x={ROW_LABEL_W + g.start * (CELL_W + PAD) + 4}
            y={16}
            fill="#6b85a0"
            fontSize={10}
            letterSpacing="0.06em"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight={700}
            textTransform="uppercase"
          >
            {g.label.toUpperCase()}
          </text>
        ))}

        {/* Date headers (day of month) */}
        {DATES.map((d, i) => {
          const day = new Date(d + 'T00:00:00').getDate();
          const dow = new Date(d + 'T00:00:00').getDay();
          return (
            <text
              key={d}
              x={ROW_LABEL_W + i * (CELL_W + PAD) + CELL_W / 2}
              y={DATE_HEADER_H - 8}
              textAnchor="middle"
              fill={dow === 0 || dow === 6 ? '#6b85a0' : '#334a63'}
              fontSize={9}
            >
              {day}
            </text>
          );
        })}

        {/* Vertical month dividers */}
        {months.slice(1).map((g) => (
          <line
            key={g.month}
            x1={ROW_LABEL_W + g.start * (CELL_W + PAD) - PAD / 2}
            y1={DATE_HEADER_H - 20}
            x2={ROW_LABEL_W + g.start * (CELL_W + PAD) - PAD / 2}
            y2={svgH}
            stroke="#e4e7ec"
            strokeWidth={1}
          />
        ))}

        {/* Rows */}
        {venueData.map((row, ri) => {
          const y = DATE_HEADER_H + ri * (CELL_H + PAD);
          return (
            <g key={row.venue}>
              {/* Team logo */}
              {teamLogoUrl(row.team) && (
                <image
                  href={teamLogoUrl(row.team)}
                  x={4}
                  y={y + CELL_H / 2 - LOGO_SIZE / 2}
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                />
              )}
              {/* Team label */}
              <text
                x={ROW_LABEL_W - 8}
                y={y + CELL_H / 2 + 4}
                textAnchor="end"
                fill="#6b85a0"
                fontSize={10}
                fontFamily="'IBM Plex Mono', monospace"
              >
                {row.team.split(' ').slice(-1)[0]}
              </text>

              {/* Cells */}
              {DATES.map((d, di) => {
                const p = row.probMap?.[d]?.probability ?? null;
                const color = pToColor(p);
                return (
                  <rect
                    key={d}
                    x={ROW_LABEL_W + di * (CELL_W + PAD)}
                    y={y}
                    width={CELL_W}
                    height={CELL_H}
                    fill={color}
                    rx={2}
                    style={{ cursor: p > 0 ? 'pointer' : 'default' }}
                    onClick={() => p > 0 && onCellClick && onCellClick({ venue: row.venue, team: row.team, date: d, probability: p })}
                  >
                    <title>
                      {row.team} | {d} | {p != null ? `${(p * 100).toFixed(1)}%` : 'No data'}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Color scale legend */}
        <defs>
          <linearGradient id="heatLegend" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#eef0f4" />
            <stop offset="40%" stopColor="rgba(0,180,130,0.5)" />
            <stop offset="100%" stopColor="rgba(0,229,160,1)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
