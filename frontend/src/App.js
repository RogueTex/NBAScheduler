import React, { useState, useEffect } from 'react';
import TeamSelector from './components/TeamSelector';
import Bracket from './components/Bracket';
import ScheduleView from './components/ScheduleView';

const API_URL = process.env.REACT_APP_API_URL;

const App = () => {
  const [eastTeams, setEastTeams] = useState([]);
  const [westTeams, setWestTeams] = useState([]);
  const [bracket, setBracket] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [allTeams, setAllTeams] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/teams`)
      .then(res => res.json())
      .then(data => setAllTeams(data.teams));
  }, []);

  const handleGenerateSchedule = () => {
    fetch(`${API_URL}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        east_teams: eastTeams,
        west_teams: westTeams,
        min_days_between_games: 1
      })
    })
      .then(res => res.json())
      .then(data => {
        setBracket(data.bracket);
        setSchedule(data.schedule);
      });
  };

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
      <button onClick={handleGenerateSchedule} disabled={eastTeams.length !== 8 || westTeams.length !== 8}>
        Generate Schedule
      </button>
      {bracket && <Bracket bracket={bracket} />}
      {schedule && <ScheduleView schedule={schedule} />}
    </div>
  );
};

export default App;
