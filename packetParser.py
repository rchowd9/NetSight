from scapy.all import IP, TCP, UDP

def parse_packet(packet):
    packet_info = {
        "source_ip": None,
        "destination_ip": None,
        "protocol": "Unknown"
    }
