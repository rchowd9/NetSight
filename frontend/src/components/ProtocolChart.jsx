import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { protocolColor } from "./protocolColors";

function ProtocolChart({ data }) {
  if (!data.length) {
    return <p className="empty">No packets captured yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={protocolColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
          itemStyle={{ color: "#e2e8f0" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default ProtocolChart;
