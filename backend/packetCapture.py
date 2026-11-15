from scapy.all import sniff
from packetParser import parse_packet
from stats import update_stats

def process_packet(packet):
    parsed = parse_packet(packet)

    print(
        f"[{parsed['protocol']}] "
        f"{parsed['source_ip']} -> "
        f"{parsed['destination_ip']}"
    )

    update_stats(parsed)

def start_capture():
    print("NetSight AI started...")

sniff(
    prn=process_packet,
    store=False
)