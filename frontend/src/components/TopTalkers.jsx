function TalkerList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.packets));
  return (
    <div className="talkers">
      <h3>{title}</h3>
      {rows.length === 0 && <p className="empty">No data yet.</p>}
      {rows.map((r) => (
        <div className="talker-row" key={r.ip}>
          <span className="mono">{r.ip}</span>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${(r.packets / max) * 100}%` }}
            />
          </div>
          <span className="talker-count">{r.packets.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function TopTalkers({ sources, destinations }) {
  return (
    <div className="talkers-wrap">
      <TalkerList title="Sources" rows={sources} />
      <TalkerList title="Destinations" rows={destinations} />
    </div>
  );
}

export default TopTalkers;
