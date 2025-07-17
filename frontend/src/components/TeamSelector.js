import React from 'react';

const TeamSelector = ({ teams, selectedTeams, onSelect, conference }) => {
  const handleChange = (team) => {
    if (selectedTeams.includes(team)) {
      onSelect(selectedTeams.filter(t => t !== team));
    } else if (selectedTeams.length < 8) {
      onSelect([...selectedTeams, team]);
    }
  };

  return (
    <div>
      <h2>{conference} Conference</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {teams.map(team => (
          <li key={team.name}>
            <label>
              <input
                type="checkbox"
                checked={selectedTeams.includes(team.name)}
                onChange={() => handleChange(team.name)}
                disabled={!selectedTeams.includes(team.name) && selectedTeams.length >= 8}
              />
              {team.name}
            </label>
          </li>
        ))}
      </ul>
      <div style={{ fontSize: '0.9em', color: selectedTeams.length !== 8 ? 'red' : 'green' }}>
        {selectedTeams.length}/8 selected
      </div>
    </div>
  );
};

export default TeamSelector; 