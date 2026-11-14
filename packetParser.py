from scapy.all import IP, TCP, UDP

def parse_packet(packet):
    packet_info = {
        "source_ip": None,
        "destination_ip": None,
        "protocol": "Unknown"
    }

    if packet.haslayer(IP):
        packet_info["source_ip"] = packet[IP].src
        packet_info["destination_ip"] = packet[IP].dst
