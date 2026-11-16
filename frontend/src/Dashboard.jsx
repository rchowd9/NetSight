import { useEffect, useState } from "react";

import API from "../services/api";

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