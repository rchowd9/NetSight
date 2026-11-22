"""Thread-safe, in-memory traffic statistics.

The sniffer thread writes here and the API threads read, so every access
goes through one lock.
"""

import threading
import time
from collections import Counter, deque

MAX_RECENT_PACKETS = 500
TIMELINE_SECONDS = 60

_lock = threading.Lock()
_protocol_counts = Counter()
_source_counts = Counter()
_destination_counts = Counter()
_recent_packets = deque(maxlen=MAX_RECENT_PACKETS)
# Per-second buckets: {second: [packets, bytes]}
_timeline = {}
_total_packets = 0
_total_bytes = 0
_start_time = time.time()
_packet_id = 0


def update_stats(packet_data):
    global _total_packets, _total_bytes, _packet_id

    with _lock:
        _packet_id += 1
        _total_packets += 1
        _total_bytes += packet_data["length"]

        _protocol_counts[packet_data["protocol"]] += 1
        if packet_data["source_ip"]:
            _source_counts[packet_data["source_ip"]] += 1
        if packet_data["destination_ip"]:
            _destination_counts[packet_data["destination_ip"]] += 1

        _recent_packets.append({"id": _packet_id, **packet_data})

        second = int(packet_data["timestamp"])
        bucket = _timeline.setdefault(second, [0, 0])
        bucket[0] += 1
        bucket[1] += packet_data["length"]

        cutoff = second - TIMELINE_SECONDS
        for old in [s for s in _timeline if s < cutoff]:
            del _timeline[old]


def get_stats():
    now = int(time.time())
    with _lock:
        timeline = [
            {
                "time": second,
                "packets": _timeline.get(second, [0, 0])[0],
                "bytes": _timeline.get(second, [0, 0])[1],
            }
            for second in range(now - TIMELINE_SECONDS + 1, now + 1)
        ]
        last_5s = timeline[-5:]
        return {
            "total_packets": _total_packets,
            "total_bytes": _total_bytes,
            "uptime_seconds": round(time.time() - _start_time, 1),
            "packets_per_second": round(
                sum(t["packets"] for t in last_5s) / 5, 1
            ),
            "protocol_breakdown": dict(_protocol_counts),
            "top_sources": [
                {"ip": ip, "packets": n}
                for ip, n in _source_counts.most_common(5)
            ],
            "top_destinations": [
                {"ip": ip, "packets": n}
                for ip, n in _destination_counts.most_common(5)
            ],
            "timeline": timeline,
        }


def get_recent_packets(limit=100, protocol=None, search=None):
    with _lock:
        packets = list(_recent_packets)
    if protocol:
        packets = [p for p in packets if p["protocol"] == protocol.upper()]
    if search:
        needle = search.strip().lower()
        if needle:
            packets = [
                p for p in packets
                if needle in " ".join(
                    str(p.get(field) or "")
                    for field in (
                        "protocol", "source_ip", "destination_ip",
                        "source_port", "destination_port", "info",
                    )
                ).lower()
            ]
    return packets[-limit:][::-1]  # newest first


def reset_stats():
    global _protocol_counts, _source_counts, _destination_counts
    global _recent_packets, _timeline, _total_packets, _total_bytes
    global _start_time, _packet_id

    with _lock:
        _protocol_counts = Counter()
        _source_counts = Counter()
        _destination_counts = Counter()
        _recent_packets = deque(maxlen=MAX_RECENT_PACKETS)
        _timeline = {}
        _total_packets = 0
        _total_bytes = 0
        _start_time = time.time()
        _packet_id = 0
