import React from 'react';

const Bracket = ({ bracket }) => {
  if (!bracket) return null;
  return (
    <div>
      <h2>Playoff Bracket</h2>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {['East', 'West'].map(conf => (
          <div key={conf}>
            <h3>{conf} Conference</h3>
            {bracket[conf] && bracket[conf].map((round, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong>Round {i + 1}</strong>
                <ul>
                  {round.map((series, j) => (
                    <li key={j}>{series.teams[0]} vs {series.teams[1]}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
        <div>
          <h3>NBA Finals</h3>
          {bracket.Finals && (
            <div>
              {bracket.Finals.teams[0]} vs {bracket.Finals.teams[1]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bracket; 