from scapy.all import sniff

from anomaly import detector
from packetParser import parse_packet
from stats import update_stats

_capture_status = {
    "interface": "default interface",
    "running": False,
    "error": None,
    "started_at": None,
}


def get_capture_status():
    return dict(_capture_status)


def reset_capture_status(interface=None):
    _capture_status.update(
        interface=interface or "default interface",
        running=False,
        error=None,
        started_at=None,
    )


def process_packet(packet):
    try:
        parsed = parse_packet(packet)
    except Exception as exc:  # never let one bad packet kill the sniffer
        print(f"[capture] failed to parse packet: {exc}")
        return

    update_stats(parsed)
    detector.record(parsed)


def start_capture(interface=None, bpf_filter=None):
    import time

    selected_interface = interface or "default interface"
    _capture_status.update(
        interface=selected_interface,
        running=True,
        error=None,
        started_at=time.time(),
    )
    print(f"NetSight AI capturing on {selected_interface}...")
    try:
        sniff(
            iface=interface,
            filter=bpf_filter,
            prn=process_packet,
            store=False,
        )
    except PermissionError:
        _capture_status.update(running=False, error="Permission denied")
        print(
            "[capture] Permission denied. Run as Administrator (Windows) "
            "or with sudo (Linux/macOS)."
        )
    except Exception as exc:
        _capture_status.update(running=False, error=str(exc))
        print(
            f"[capture] Capture failed: {exc}\n"
            "On Windows, make sure Npcap is installed: https://npcap.com"
        )
