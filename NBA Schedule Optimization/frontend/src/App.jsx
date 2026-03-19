import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import SeedSelection from './pages/SeedSelection';
import VenueCalendar from './pages/VenueCalendar';
import BracketLock from './pages/BracketLock';
import LeagueHeatmap from './pages/LeagueHeatmap';
import StressTest from './pages/StressTest';
import Calibration from './pages/Calibration';
import { useSession } from './store/session';

function RequireSession({ children }) {
  const { sessionId } = useSession();
  if (!sessionId) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<SeedSelection />} />
          <Route
            path="/venue"
            element={
              <RequireSession>
                <VenueCalendar />
              </RequireSession>
            }
          />
          <Route
            path="/venue/bracket"
            element={
              <RequireSession>
                <BracketLock />
              </RequireSession>
            }
          />
          <Route
            path="/league"
            element={
              <RequireSession>
                <LeagueHeatmap />
              </RequireSession>
            }
          />
          <Route
            path="/league/stress-test"
            element={
              <RequireSession>
                <StressTest />
              </RequireSession>
            }
          />
          <Route
            path="/calibration"
            element={
              <RequireSession>
                <Calibration />
              </RequireSession>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
