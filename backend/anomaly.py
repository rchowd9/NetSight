"""Anomaly detection for suspicious traffic.

Two layers:

1. Machine learning: an Isolation Forest (unsupervised) learns what "normal"
   behaviour per source IP looks like on *this* network, using features
   aggregated over short time windows. Its alert threshold is calibrated on
   the training data's own score distribution. Because Isolation Forest
   scores points far outside the training range no worse than points at its
   edge, it is paired with a robust z-score (median/MAD) per feature, which
   also explains *which* features made a window anomalous. The model is
   retrained periodically so the baseline follows the network.

2. Rules: explainable signatures for well-known attacks (port scans,
   SYN floods, DNS floods, traffic spikes). These fire immediately, even
   before the model has enough data to train.
"""

import math
import threading
import time
from collections import defaultdict, deque

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    ML_AVAILABLE = True
except ImportError:  # rules still work without scikit-learn
    ML_AVAILABLE = False

WINDOW_SECONDS = 5
MIN_TRAINING_SAMPLES = 50
MAX_TRAINING_SAMPLES = 5000
RETRAIN_EVERY_WINDOWS = 12  # ~1 minute
ALERT_COOLDOWN_SECONDS = 30
MAX_ALERTS = 200

# Rule thresholds (per source IP, per window)
PORT_SCAN_UNIQUE_PORTS = 20
SYN_FLOOD_MIN_SYNS = 100
SYN_FLOOD_RATIO = 0.8
DNS_FLOOD_QUERIES = 50
HIGH_RATE_PACKETS = 2000

# ML thresholds
SCORE_PERCENTILE = 1      # flag scores below the 1st percentile of training
Z_SCORE_LIMIT = 6         # robust z-score that counts as "far outside normal"
MIN_MAD = 0.25            # floor for features that barely vary

FEATURE_NAMES = [
    "packets", "bytes", "unique_dst_ips", "unique_dst_ports",
    "syn_ratio", "avg_packet_size", "dns_packets",
]


def _new_window():
    return {
        "packets": 0,
        "bytes": 0,
        "dst_ips": set(),
        "dst_ports": set(),
        "syns": 0,
        "dns": 0,
    }


class AnomalyDetector:
    def __init__(self):
        self._lock = threading.Lock()
        self._window = defaultdict(_new_window)
        self._training = deque(maxlen=MAX_TRAINING_SAMPLES)
        self._model = None
        self._score_threshold = None
        self._median = None
        self._mad = None
        self._windows_since_train = 0
        self._last_alert = {}
        self._alert_id = 0
        self.alerts = deque(maxlen=MAX_ALERTS)
        self.windows_processed = 0

    # Called from the sniffer thread for every packet.
    def record(self, pkt):
        src = pkt["source_ip"]
        if not src:
            return
        with self._lock:
            w = self._window[src]
            w["packets"] += 1
            w["bytes"] += pkt["length"]
            if pkt["destination_ip"]:
                w["dst_ips"].add(pkt["destination_ip"])
            if pkt["destination_port"] is not None:
                w["dst_ports"].add(pkt["destination_port"])
            if pkt["syn"]:
                w["syns"] += 1
            if pkt["protocol"] == "DNS":
                w["dns"] += 1

    @staticmethod
    def _features(w):
        return {
            "packets": w["packets"],
            "bytes": w["bytes"],
            "unique_dst_ips": len(w["dst_ips"]),
            "unique_dst_ports": len(w["dst_ports"]),
            "syn_ratio": round(w["syns"] / w["packets"], 3),
            "avg_packet_size": round(w["bytes"] / w["packets"], 1),
            "dns_packets": w["dns"],
        }

    @staticmethod
    def _vector(f):
        # log-scale the counts so huge values don't dominate the model
        return [
            math.log1p(f["packets"]),
            math.log1p(f["bytes"]),
            math.log1p(f["unique_dst_ips"]),
            math.log1p(f["unique_dst_ports"]),
            f["syn_ratio"],
            math.log1p(f["avg_packet_size"]),
            math.log1p(f["dns_packets"]),
        ]

    def _rule_checks(self, f):
        hits = []
        if f["unique_dst_ports"] >= PORT_SCAN_UNIQUE_PORTS:
            hits.append((
                "Port Scan", "high",
                f"Contacted {f['unique_dst_ports']} different ports "
                f"in {WINDOW_SECONDS}s",
            ))
        if (f["packets"] * f["syn_ratio"] >= SYN_FLOOD_MIN_SYNS
                and f["syn_ratio"] >= SYN_FLOOD_RATIO
                and f["unique_dst_ports"] < PORT_SCAN_UNIQUE_PORTS):
            hits.append((
                "SYN Flood", "critical",
                f"{int(f['packets'] * f['syn_ratio'])} SYN packets without "
                f"handshake completion ({f['syn_ratio']:.0%} of traffic)",
            ))
        if f["dns_packets"] >= DNS_FLOOD_QUERIES:
            hits.append((
                "DNS Flood / Tunneling", "medium",
                f"{f['dns_packets']} DNS packets in {WINDOW_SECONDS}s",
            ))
        if f["packets"] >= HIGH_RATE_PACKETS:
            hits.append((
                "Traffic Spike", "medium",
                f"{f['packets']} packets in {WINDOW_SECONDS}s "
                f"({f['packets'] // WINDOW_SECONDS} pkt/s)",
            ))
        return hits

    def _add_alert(self, now, src, kind, severity, description, features,
                   score=None, method="rule"):
        key = (src, kind)
        if now - self._last_alert.get(key, 0) < ALERT_COOLDOWN_SECONDS:
            return
        self._last_alert[key] = now
        self._alert_id += 1
        self.alerts.appendleft({
            "id": self._alert_id,
            "timestamp": now,
            "source_ip": src,
            "type": kind,
            "severity": severity,
            "method": method,
            "score": score,
            "description": description,
            "features": features,
        })

    def _train(self):
        model = IsolationForest(
            n_estimators=100, contamination="auto", random_state=42
        )
        X = np.array(self._training)
        model.fit(X)
        self._score_threshold = float(
            np.percentile(model.decision_function(X), SCORE_PERCENTILE)
        )
        self._median = np.median(X, axis=0)
        mad = np.median(np.abs(X - self._median), axis=0) * 1.4826
        self._mad = np.maximum(mad, MIN_MAD)
        self._model = model
        self._windows_since_train = 0

    def process_window(self):
        """Close the current window, score it, and update the model."""
        now = time.time()
        with self._lock:
            window, self._window = self._window, defaultdict(_new_window)

        if not window:
            return

        sources = list(window)
        features = [self._features(window[s]) for s in sources]
        vectors = [self._vector(f) for f in features]

        rule_flagged = set()
        for src, f in zip(sources, features):
            for kind, severity, desc in self._rule_checks(f):
                rule_flagged.add(src)
                self._add_alert(now, src, kind, severity, desc, f)

        if ML_AVAILABLE and self._model is not None:
            X = np.array(vectors)
            scores = self._model.decision_function(X)
            z_scores = np.abs(X - self._median) / self._mad
            for src, f, score, z in zip(sources, features, scores, z_scores):
                if src in rule_flagged:
                    continue
                forest_hit = score < self._score_threshold
                outlier_features = [
                    FEATURE_NAMES[i] for i in np.argsort(-z)
                    if z[i] >= Z_SCORE_LIMIT
                ]
                if not (forest_hit or outlier_features):
                    continue
                top = outlier_features or [
                    FEATURE_NAMES[i] for i in np.argsort(-z)[:2]
                ]
                severity = (
                    "high" if forest_hit and outlier_features
                    or z.max() >= 2 * Z_SCORE_LIMIT
                    else "low"
                )
                self._add_alert(
                    now, src, "Unusual Behaviour", severity,
                    "Deviates from learned baseline, mainly in "
                    + ", ".join(top[:3])
                    + f" (anomaly score {score:.3f})",
                    f, score=round(float(score), 4), method="ml",
                )

        # Only learn from traffic the rules didn't flag as an attack.
        self._training.extend(
            v for s, v in zip(sources, vectors) if s not in rule_flagged
        )
        self.windows_processed += 1
        self._windows_since_train += 1

        if ML_AVAILABLE and len(self._training) >= MIN_TRAINING_SAMPLES and (
            self._model is None
            or self._windows_since_train >= RETRAIN_EVERY_WINDOWS
        ):
            self._train()

    def run_forever(self):
        while True:
            time.sleep(WINDOW_SECONDS)
            try:
                self.process_window()
            except Exception as exc:  # keep the detector alive
                print(f"[anomaly] error: {exc}")

    def get_alerts(self, limit=50):
        return list(self.alerts)[:limit]

    def get_status(self):
        return {
            "ml_available": ML_AVAILABLE,
            "model_trained": self._model is not None,
            "training_samples": len(self._training),
            "min_training_samples": MIN_TRAINING_SAMPLES,
            "windows_processed": self.windows_processed,
            "window_seconds": WINDOW_SECONDS,
            "total_alerts": self._alert_id,
            "features": FEATURE_NAMES,
        }


detector = AnomalyDetector()
