from scapy.all import sniff

from anomaly import detector
from packetParser import parse_packet
from stats import update_stats


def process_packet(packet):
    try:
        parsed = parse_packet(packet)
    except Exception as exc:  # never let one bad packet kill the sniffer
        print(f"[capture] failed to parse packet: {exc}")
        return

    update_stats(parsed)
    detector.record(parsed)


def start_capture(interface=None, bpf_filter=None):
    print(f"NetSight AI capturing on {interface or 'default interface'}...")
    try:
        sniff(
            iface=interface,
            filter=bpf_filter,
            prn=process_packet,
            store=False,
        )
    except PermissionError:
        print(
            "[capture] Permission denied. Run as Administrator (Windows) "
            "or with sudo (Linux/macOS)."
        )
    except Exception as exc:
        print(
            f"[capture] Capture failed: {exc}\n"
            "On Windows, make sure Npcap is installed: https://npcap.com"
        )
