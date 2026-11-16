import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 5000,
});

export const getStats = () => API.get("/stats").then((r) => r.data);

export const getPackets = (limit = 100, protocol) =>
  API.get("/packets", { params: { limit, protocol: protocol || undefined } })
    .then((r) => r.data);

export const getAlerts = (limit = 50) =>
  API.get("/alerts", { params: { limit } }).then((r) => r.data);

export default API;
