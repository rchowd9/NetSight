import { protocolColor } from "./protocolColors";

const formatTime = (epoch) =>
  new Date(epoch * 1000).toLocaleTimeString([], { hour12: false }) +
  "." +
  String(Math.floor((epoch % 1) * 1000)).padStart(3, "0");

const endpoint = (ip, port) =>
  ip ? (port != null ? `${ip}:${port}` : ip) : "-";

function TrafficTable({ packets }) {
  if (!packets.length) {
    return <p className="empty">Waiting for packets...</p>;
  }

  return (
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
  );
}

export default TrafficTable;
