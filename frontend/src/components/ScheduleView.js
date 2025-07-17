import React from 'react';

const ScheduleView = ({ schedule }) => {
  if (!schedule) return null;
  return (
    <div>
      <h2>Schedule</h2>
      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Round</th>
            <th>Teams</th>
            <th>Game Dates</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((series, i) => (
            <tr key={i}>
              <td>{series.round}</td>
              <td>{series.teams[0]} vs {series.teams[1]}</td>
              <td>{series.dates.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleView; 