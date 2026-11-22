import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

export const getStats = () => API.get("/stats").then((r) => r.data);

export const getPackets = (limit = 100, protocol, search) =>
  API.get("/packets", {
    params: {
      limit,
      protocol: protocol || undefined,
      search: search?.trim() || undefined,
    },
  })
    .then((r) => r.data);

export const getAlerts = (limit = 50) =>
  API.get("/alerts", { params: { limit } }).then((r) => r.data);

export const resetSession = () =>
  API.post("/reset").then((r) => r.data);

export default API;
