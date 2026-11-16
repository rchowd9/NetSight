function TrafficTable({ packets }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th>Source</th>
          <th>Destination</th>
          <th>Protocol</th>
        </tr>
      </thead>

      <tbody>
        {packets.map((packet, index) => (
          <tr key={index}>
            <td>{packet.source_ip}</td>
            <td>{packet.destination_ip}</td>
            <td>{packet.protocol}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TrafficTable;