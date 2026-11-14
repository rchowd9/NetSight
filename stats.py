from collections import defaultdict

protocol_counts = defaultdict(int)
total_packets = 0

def update_stats(packet_data):
    global total_packets

    total_packets += 1

    protocol = packet_data["protocol"]
    protocol_counts[protocol] += 1

def get_stats():
    return {
"total_packets": total_packets,
"protocol_breakdown": dict(protocol_counts)
}