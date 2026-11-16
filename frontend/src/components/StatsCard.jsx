function StatsCard({ title, value, hint, tone }) {
  return (
    <div className={`stats-card ${tone ? `tone-${tone}` : ""}`}>
      <span className="stats-title">{title}</span>
      <span className="stats-value">{value}</span>
      {hint && <span className="stats-hint">{hint}</span>}
    </div>
  );
}

export default StatsCard;
