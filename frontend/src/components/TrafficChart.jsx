import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatTime = (epoch) =>
  new Date(epoch * 1000).toLocaleTimeString([], {
    minute: "2-digit",
    second: "2-digit",
  });

function TrafficChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10 }}>
        <defs>
          <linearGradient id="pktFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          stroke="#64748b"
          fontSize={12}
          minTickGap={30}
        />
        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
        <Tooltip
          labelFormatter={formatTime}
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
        />
        <Area
          type="monotone"
          dataKey="packets"
          name="Packets/s"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#pktFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default TrafficChart;
