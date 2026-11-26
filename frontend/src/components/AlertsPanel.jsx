import { useState } from "react";

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
  const [filter, setFilter] = useState("open");
  const openCount = alerts.filter((alert) => !alert.acknowledged).length;
  const visibleAlerts = alerts.filter((alert) => {
    if (filter === "open") return !alert.acknowledged;
    if (filter === "acknowledged") return alert.acknowledged;
    return true;
  });

  return (
    <div>
      <ModelStatus status={status} />
      <div className="alert-toolbar" aria-label="Filter alerts">
        <button
          type="button"
          className={filter === "open" ? "active" : ""}
          onClick={() => setFilter("open")}
        >
          Open <span>{openCount}</span>
        </button>
        <button
          type="button"
          className={filter === "acknowledged" ? "active" : ""}
          onClick={() => setFilter("acknowledged")}
        >
          Acknowledged
        </button>
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All <span>{alerts.length}</span>
        </button>
      </div>
      {visibleAlerts.length === 0 ? (
        <p className="empty">
          {filter === "open"
            ? "No open alerts. The network looks clear."
            : filter === "acknowledged"
              ? "No acknowledged alerts."
              : "No suspicious traffic detected."}
        </p>
      ) : (
        <ul className="alerts">
          {visibleAlerts.map((a) => (
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
