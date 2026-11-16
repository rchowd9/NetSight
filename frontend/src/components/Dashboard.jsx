import { useEffect, useState } from "react";

import API from "../../services/api";

import StatsCard from "./StatsCard";
import ProtocolChart from "./ProtocolChart";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();

    const interval = setInterval(
      fetchStats,
      2000
    );

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
const response = await API.get("/stats");
setStats(response.data);
};
 
if (!stats) {
return <h2>Loading...</h2>;
}
 
const chartData = Object.entries(
stats.protocol_breakdown
).map(([key, value]) => ({
name: key,
value,
}));
 
return (
<div>
<StatsCard
title="Total Packets"
value={stats.total_packets}
/>
 
<ProtocolChart data={chartData} />
</div>
);
}
 
export default Dashboard;