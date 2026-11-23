function ModelStatus({ status }) {
  if (!status) return null;

  let text;
  if (!status.ml_available) {
    text = "scikit-learn not installed: rule-based detection only";
  } else if (status.model_trained) {
    text = `Isolation Forest active, trained on ${status.training_samples} samples`;
  } else {
    text = `Learning baseline... ${status.training_samples}/${status.min_training_samples} samples`;
  }

  return (
    <div className="model-status">
      <span
        className={`status-dot ${status.model_trained ? "on" : "learning"}`}
      />
      {text}
    </div>
  );
}

function AlertsPanel({ alerts, status, onAcknowledge }) {
  return (
    <div>
      <ModelStatus status={status} />
      {alerts.length === 0 ? (
        <p className="empty">No suspicious traffic detected.</p>
      ) : (
        <ul className="alerts">
          {alerts.map((a) => (
            <li key={a.id} className={`alert sev-${a.severity}`}>
              <div className="alert-top">
                <span className="alert-type">{a.type}</span>
                <span className={`badge sev-badge sev-${a.severity}`}>
                  {a.severity}
                </span>
                <span className="badge method">
                  {a.method === "ml" ? "AI" : "Rule"}
                </span>
                <span className="alert-time">
                  {new Date(a.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              <div className="alert-body">
                <span className="mono">{a.source_ip}</span>: {a.description}
              </div>
              <div className="alert-actions">
                {a.acknowledged ? (
                  <span className="acknowledged">Acknowledged</span>
                ) : (
                  <button
                    type="button"
                    className="acknowledge-button"
                    onClick={() => onAcknowledge(a.id)}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AlertsPanel;
