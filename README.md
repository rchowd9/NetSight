# NetSight AI: Intelligent Network Traffic Analyzer

A Wireshark-style network analyzer with a live web dashboard and AI-based
anomaly detection.

**Stack:** Python · Scapy · FastAPI · scikit-learn · React · Recharts · Vite

## Features

- **Real-time packet capture** with Scapy, running in a background thread
- **Protocol detection**: TCP, UDP, HTTP (payload inspection), HTTPS, DNS (with query names), ICMP, ARP
- **Packet inspection**: source/destination IPs and ports, length, and per-protocol info (HTTP request line, DNS query, TCP flags)
- **Traffic statistics**: packets per second, a 60s traffic timeline, protocol distribution, and top talkers
- **AI anomaly detection** (see below), with explainable alerts
- **Live dashboard** that refreshes every 2s, with protocol filtering and pause/resume

## How the anomaly detection works

Traffic is aggregated **per source IP over 5-second windows** into a feature vector:
packet count, bytes, unique destination IPs, unique destination ports, SYN ratio,
average packet size, and DNS packet count. Counts are log-scaled.

1. **Isolation Forest (unsupervised ML).** After 50 windows of baseline traffic, the
   model learns what "normal" looks like on *your* network and is retrained about
   every minute. The alert threshold is calibrated on the training data's own scores.
2. **Robust z-scores (median/MAD).** These catch values far outside the learned range,
   which Isolation Forest scores poorly on its own. They also show *which* features
   made a window anomalous, so every AI alert is explainable.
3. **Signature rules** detect known attacks immediately, even before the model has
   trained: **port scans**, **SYN floods**, **DNS floods/tunneling**, and **traffic spikes**.

Windows flagged by the rules are kept out of the training data, so attacks don't
become part of the "normal" baseline.

## Project structure

```
backend/
  api.py            FastAPI server; starts capture + detector threads
  packetCapture.py  Scapy sniffer loop
  packetParser.py   Packet -> dict (protocol detection, ports, info)
  stats.py          Thread-safe traffic statistics
  anomaly.py        Isolation Forest + rule-based anomaly detector
frontend/
  src/components/   Dashboard, charts, packet table, alerts panel
  src/services/     API client
```

## Getting started

### Prerequisites
- Python 3.10+
- Node.js 20+
- **Windows:** install [Npcap](https://npcap.com) (tick *"WinPcap API-compatible mode"*)
- Packet capture needs **Administrator** (Windows) or **sudo** (Linux/macOS)

### Backend
```bash
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cd backend
python api.py                   # run from an Administrator terminal
```
The API runs at http://localhost:8000 (interactive docs at `/docs`).

Optional environment variables:
- `NETSIGHT_IFACE`: the network interface to capture on (default: the system default)
- `NETSIGHT_FILTER`: a BPF filter, e.g. `tcp or udp port 53`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

## API

| Endpoint | Description |
|---|---|
| `GET /stats` | Totals, packets/sec, protocol breakdown, top talkers, 60s timeline |
| `GET /packets?limit=100&protocol=DNS` | Most recent packets, newest first |
| `GET /alerts?limit=50` | Anomaly alerts and the ML model's status |

## Testing the detector

From another machine (or a VM) on your network, against a host you own:
```bash
nmap -sS <target-ip>            # triggers a "Port Scan" alert
```
