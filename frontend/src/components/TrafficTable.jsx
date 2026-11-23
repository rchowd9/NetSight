import { protocolColor } from "./protocolColors";

const formatTime = (epoch) =>
  new Date(epoch * 1000).toLocaleTimeString([], { hour12: false }) +
  "." +
  String(Math.floor((epoch % 1) * 1000)).padStart(3, "0");

const endpoint = (ip, port) =>
  ip ? (port != null ? `${ip}:${port}` : ip) : "-";

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function exportPackets(packets) {
  const headers = [
    "ID",
    "Time",
    "Source",
    "Destination",
    "Protocol",
    "Length",
    "Info",
  ];
  const rows = packets.map((packet) => [
    packet.id,
    new Date(packet.timestamp * 1000).toISOString(),
    endpoint(packet.source_ip, packet.source_port),
    endpoint(packet.destination_ip, packet.destination_port),
    packet.protocol,
    packet.length,
    packet.info,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `netsight-packets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportPacketsJson(packets) {
  const data = packets.map((packet) => ({
    id: packet.id,
    timestamp: new Date(packet.timestamp * 1000).toISOString(),
    source: endpoint(packet.source_ip, packet.source_port),
    destination: endpoint(packet.destination_ip, packet.destination_port),
    protocol: packet.protocol,
    length: packet.length,
    info: packet.info,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `netsight-packets-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function TrafficTable({ packets, search, onSearchChange }) {
  if (!packets.length) {
    return (
      <div>
        <div className="table-controls">
          <input
            className="packet-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search IP, port, protocol, or info..."
          />
        </div>
        <p className="empty">
          {search ? "No packets match this search." : "Waiting for packets..."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="table-controls">
        <input
          className="packet-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search IP, port, protocol, or info..."
        />
        <button type="button" onClick={() => exportPackets(packets)}>
          Export CSV
        </button>
        <button type="button" onClick={() => exportPacketsJson(packets)}>
          Export JSON
        </button>
      </div>
      <div className="table-wrap">
        <table className="traffic-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>Length</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((packet) => (
              <tr key={packet.id}>
                <td className="muted">{packet.id}</td>
                <td className="mono">{formatTime(packet.timestamp)}</td>
                <td className="mono">
                  {endpoint(packet.source_ip, packet.source_port)}
                </td>
                <td className="mono">
                  {endpoint(packet.destination_ip, packet.destination_port)}
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: `${protocolColor(packet.protocol)}26`,
                      color: protocolColor(packet.protocol),
                    }}
                  >
                    {packet.protocol}
                  </span>
                </td>
                <td>{packet.length}</td>
                <td className="info">{packet.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TrafficTable;
