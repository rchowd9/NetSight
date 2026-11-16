import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
];

function ProtocolChart({ data }) {
return (
<ResponsiveContainer width="100%" height={350}>
<PieChart>
<Pie
data={data}
dataKey="value"
nameKey="name"
outerRadius={120}
label
>
{data.map((entry, index) => (
<Cell
key={index}
fill={COLORS[index % COLORS.length]}
/>
))}
</Pie>
 
<Tooltip />
</PieChart>
</ResponsiveContainer>
);
}
 
export default ProtocolChart;