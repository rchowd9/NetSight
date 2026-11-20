import { useCallback, useEffect, useState } from "react";

import {
  API_BASE_URL,
  getAlerts,
  getPackets,
  getStats,
} from "../services/api";

import AlertsPanel from "./AlertsPanel";
import ProtocolChart from "./ProtocolChart";
import StatsCard from "./StatsCard";
import TopTalkers from "./TopTalkers";
import TrafficChart from "./TrafficChart";
import TrafficTable from "./TrafficTable";

const REFRESH_MS = 2000;

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [packets, setPackets] = useState([]);
  const [alertData, setAlertData] = useState({ alerts: [], status: null });
  const [protocolFilter, setProtocolFilter] = useState("");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, p, a] = await Promise.all([
        getStats(),
        getPackets(100, protocolFilter, search),
        getAlerts(),
      ]);
      setStats(s);
      setPackets(p);
      setAlertData(a);
      setError(null);
    } catch {
      setError(
        `Cannot reach the NetSight backend at ${API_BASE_URL}. ` +
          "Check VITE_API_URL and confirm the backend is running and allows this site in CORS."
      );
    }
  }, [protocolFilter, search]);

  useEffect(() => {
    if (paused) return undefined;
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchAll, paused]);

  if (!stats) {
    return (
      <div className="status-message">
        {error || "Connecting to NetSight backend..."}
      </div>
    );
  }

  const protocolData = Object.entries(stats.protocol_breakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const highAlerts = alertData.alerts.filter((a) =>
    ["high", "critical"].includes(a.severity)
  ).length;

  return (
    <main className="dashboard">
      {error && <div className="banner banner-error">{error}</div>}

      <section className="cards">
        <StatsCard
          title="Total Packets"
          value={stats.total_packets.toLocaleString()}
        />
        <StatsCard title="Data Captured" value={formatBytes(stats.total_bytes)} />
        <StatsCard
          title="Packets / sec"
          value={stats.packets_per_second}
          hint="5s average"
        />
        <StatsCard
          title="Alerts"
          value={alertData.alerts.length}
          hint={`${highAlerts} high / critical`}
          tone={highAlerts > 0 ? "danger" : "ok"}
        />
      </section>

      <section className="grid grid-2-1">
        <div className="panel">
          <h2>Traffic (last 60s)</h2>
          <TrafficChart data={stats.timeline} />
        </div>
        <div className="panel">
          <h2>Protocol Distribution</h2>
          <ProtocolChart data={protocolData} />
        </div>
      </section>

      <section className="grid grid-1-1">
        <div className="panel">
          <h2>AI Anomaly Detection</h2>
          <AlertsPanel alerts={alertData.alerts} status={alertData.status} />
        </div>
        <div className="panel">
          <h2>Top Talkers</h2>
          <TopTalkers
            sources={stats.top_sources}
            destinations={stats.top_destinations}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Live Packets</h2>
          <div className="controls">
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
            >
              <option value="">All protocols</option>
              {protocolData.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setPaused((v) => !v)}>
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
        <TrafficTable
          packets={packets}
          search={search}
          onSearchChange={setSearch}
        />
      </section>
    </main>
  );
}

export default Dashboard;
