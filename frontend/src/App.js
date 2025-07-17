import React, { useState } from 'react';
import TeamSelector from './components/TeamSelector';
import Bracket from './components/Bracket';
import ScheduleView from './components/ScheduleView';

const App = () => {
  const [eastTeams, setEastTeams] = useState([]);
  const [westTeams, setWestTeams] = useState([]);
  const [bracket, setBracket] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [allTeams, setAllTeams] = useState([]);

  // TODO: Fetch allTeams from backend on mount

  // TODO: Handle team selection and API call to generate schedule

  return (
    <div>
      <h1>NBA Playoff Scheduler</h1>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <TeamSelector
          teams={allTeams.filter(t => t.conference === 'East')}
          selectedTeams={eastTeams}
          onSelect={setEastTeams}
          conference="East"
        />
        <TeamSelector
          teams={allTeams.filter(t => t.conference === 'West')}
          selectedTeams={westTeams}
          onSelect={setWestTeams}
          conference="West"
        />
      </div>
      <button /* onClick={handleGenerateSchedule} */>Generate Schedule</button>
      {bracket && <Bracket bracket={bracket} />}
      {schedule && <ScheduleView schedule={schedule} />}
    </div>
  );
};

export default App;
