export const PROTOCOL_COLORS = {
  TCP: "#3b82f6",
  UDP: "#22c55e",
  HTTP: "#f59e0b",
  HTTPS: "#a855f7",
  DNS: "#06b6d4",
  ICMP: "#ef4444",
  ARP: "#ec4899",
  Other: "#64748b",
};

export const protocolColor = (name) => PROTOCOL_COLORS[name] || "#64748b";
