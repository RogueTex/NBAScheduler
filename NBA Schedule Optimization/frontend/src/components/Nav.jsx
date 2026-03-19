import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../store/session';
import NetRatingsDrawer from './NetRatingsDrawer';

const S = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 24px',
    height: 52,
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: '0.08em',
    color: 'var(--accent)',
    marginRight: 32,
    textTransform: 'uppercase',
    userSelect: 'none',
  },
  links: {
    display: 'flex',
    gap: 2,
    flex: 1,
  },
  link: (active) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '6px 14px',
    borderRadius: 4,
    color: active ? 'var(--accent)' : 'var(--muted)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    transition: 'color 0.15s, background 0.15s',
  }),
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  badge: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--muted)',
    background: 'var(--surface-alt)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '3px 8px',
  },
  badgeGreen: {
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--green)',
    background: 'var(--green-bg)',
    border: '1px solid rgba(0,229,160,0.2)',
    borderRadius: 4,
    padding: '3px 8px',
  },
  newBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '5px 12px',
    borderRadius: 4,
    border: '1px solid var(--border-hi)',
    background: 'transparent',
    color: 'var(--muted)',
    transition: 'color 0.15s, border-color 0.15s',
  },
  gearBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--muted)',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '4px 8px',
    transition: 'color 0.15s, border-color 0.15s',
  },
};

export default function Nav() {
  const { sessionId, sampleCount, nSamples, lockedResults, eastSeeds, westSeeds } = useSession();
  const navigate = useNavigate();
  const lockedCount = Object.keys(lockedResults).length;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleResimulate = () => {
    setDrawerOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav style={S.nav}>
        <span style={S.logo}>NBA Hold Release</span>

        <div style={S.links}>
          <NavLink
            to="/"
            style={({ isActive }) => S.link(isActive)}
          >
            <span className="nav-link-text">Seeds</span>
          </NavLink>
          {sessionId && (
            <>
              <NavLink to="/venue" style={({ isActive }) => S.link(isActive)}>
                <span className="nav-link-text">Venue</span>
              </NavLink>
              <NavLink to="/venue/bracket" style={({ isActive }) => S.link(isActive)}>
                <span className="nav-link-text">Bracket Lock</span>
              </NavLink>
              <NavLink to="/league" style={({ isActive }) => S.link(isActive)}>
                <span className="nav-link-text">League</span>
              </NavLink>
              <NavLink to="/league/stress-test" style={({ isActive }) => S.link(isActive)}>
                <span className="nav-link-text">Stress Test</span>
              </NavLink>
              <NavLink to="/calibration" style={({ isActive }) => S.link(isActive)}>
                <span className="nav-link-text">Calibration</span>
              </NavLink>
            </>
          )}
        </div>

        <div style={S.right}>
          {sessionId && (
            <>
              {lockedCount > 0 && (
                <span style={S.badge}>{lockedCount} locked</span>
              )}
              <span style={S.badgeGreen}>
                {sampleCount.toLocaleString()} / {nSamples.toLocaleString()} samples
              </span>
              <button
                style={S.gearBtn}
                onClick={() => setDrawerOpen(true)}
                title="Edit Net Ratings"
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--accent)';
                  e.target.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--muted)';
                  e.target.style.borderColor = 'var(--border)';
                }}
              >
                ⚙
              </button>
            </>
          )}
          {sessionId && (
            <button
              style={S.newBtn}
              onClick={() => navigate('/')}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--text)';
                e.target.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--muted)';
                e.target.style.borderColor = 'var(--border-hi)';
              }}
            >
              New Session
            </button>
          )}
        </div>
      </nav>

      <NetRatingsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessionId={sessionId}
        eastSeeds={eastSeeds}
        westSeeds={westSeeds}
        onResimulate={handleResimulate}
      />
    </>
  );
}
