import React from 'react';

const S = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
  },
  sliderWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  range: {
    flex: 1,
    appearance: 'none',
    height: 4,
    borderRadius: 2,
    cursor: 'pointer',
    outline: 'none',
  },
  value: {
    fontFamily: 'var(--font-data)',
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text)',
    minWidth: 40,
    textAlign: 'right',
  },
  legend: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    marginRight: 5,
  }),
  legendLabel: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
  },
};

// CSS for range input thumb + track (injected once)
const rangeCSS = `
  input[type=range].threshold-slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(56,189,248,0.4);
  }
  input[type=range].threshold-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
  }
`;

let injected = false;
function injectCSS() {
  if (injected) return;
  injected = true;
  const el = document.createElement('style');
  el.textContent = rangeCSS;
  document.head.appendChild(el);
}

export default function ThresholdSlider({ value, onChange }) {
  injectCSS();
  const pct = Math.round(value * 100);

  // Build gradient: green up to threshold, yellow up to 2x, red after
  const t = value * 100;
  const t2 = Math.min(t * 2, 100);
  const gradient = `linear-gradient(to right,
    var(--green) 0%,
    var(--green) ${t}%,
    var(--yellow) ${t}%,
    var(--yellow) ${t2}%,
    var(--red) ${t2}%,
    var(--red) 100%
  )`;

  return (
    <div style={S.wrap}>
      <span style={S.label}>Threshold</span>
      <div style={S.sliderWrap}>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)' }}>5%</span>
        <input
          type="range"
          className="threshold-slider"
          min={5}
          max={40}
          step={1}
          value={pct}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          style={{ ...S.range, background: gradient }}
        />
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--muted)' }}>40%</span>
        <span style={S.value}>{pct}%</span>
      </div>
      <div style={S.legend}>
        <span style={S.legendLabel}>
          <span style={S.dot('var(--green)')} />
          Safe (&lt;{pct}%)
        </span>
        <span style={S.legendLabel}>
          <span style={S.dot('var(--yellow)')} />
          Flex ({pct}–{pct * 2}%)
        </span>
        <span style={S.legendLabel}>
          <span style={S.dot('var(--red)')} />
          Hold (&gt;{pct * 2}%)
        </span>
      </div>
    </div>
  );
}
