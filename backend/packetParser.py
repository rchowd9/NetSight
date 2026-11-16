"""Turn raw scapy packets into plain dicts the rest of the app can use."""

import time

from scapy.all import ARP, ICMP, IP, TCP, UDP, Raw
from scapy.layers.dns import DNS, DNSQR
from scapy.layers.inet6 import IPv6

HTTP_METHODS = (
    b"GET ", b"POST ", b"PUT ", b"DELETE ", b"HEAD ",
    b"OPTIONS ", b"PATCH ", b"CONNECT ", b"HTTP/1.",
)
HTTP_PORTS = {80, 8000, 8080, 8008}
HTTPS_PORTS = {443, 8443}

# TCP flag bits
FIN, SYN, RST, ACK = 0x01, 0x02, 0x04, 0x10


def _tcp_flags(tcp):
    flags = int(tcp.flags)
    return {
        "syn": bool(flags & SYN) and not bool(flags & ACK),
        "fin": bool(flags & FIN),
        "rst": bool(flags & RST),
        "str": str(tcp.flags),
    }


def _http_info(payload):
    """Return the first line of an HTTP request/response, or None."""
    if not payload.startswith(HTTP_METHODS):
        return None
    first_line = payload.split(b"\r\n", 1)[0]
    return first_line[:120].decode(errors="replace")


def parse_packet(packet):
    info = {
        "timestamp": float(getattr(packet, "time", time.time())),
        "source_ip": None,
        "destination_ip": None,
        "source_port": None,
        "destination_port": None,
        "protocol": "Other",
        "length": len(packet),
        "info": "",
        "syn": False,
    }

    if packet.haslayer(IP):
        info["source_ip"] = packet[IP].src
        info["destination_ip"] = packet[IP].dst
    elif packet.haslayer(IPv6):
        info["source_ip"] = packet[IPv6].src
        info["destination_ip"] = packet[IPv6].dst
    elif packet.haslayer(ARP):
        arp = packet[ARP]
        info["source_ip"] = arp.psrc
        info["destination_ip"] = arp.pdst
        info["protocol"] = "ARP"
        info["info"] = (
            f"Who has {arp.pdst}? Tell {arp.psrc}" if arp.op == 1
            else f"{arp.psrc} is at {arp.hwsrc}"
        )
        return info

    if packet.haslayer(TCP):
        tcp = packet[TCP]
        flags = _tcp_flags(tcp)
        info.update(
            protocol="TCP",
            source_port=int(tcp.sport),
            destination_port=int(tcp.dport),
            syn=flags["syn"],
            info=f"[{flags['str']}]",
        )
        ports = {int(tcp.sport), int(tcp.dport)}

        http_line = None
        if packet.haslayer(Raw):
            http_line = _http_info(bytes(packet[Raw].load))
        if http_line:
            info["protocol"] = "HTTP"
            info["info"] = http_line
        elif ports & HTTPS_PORTS:
            info["protocol"] = "HTTPS"
        elif ports & HTTP_PORTS and packet.haslayer(Raw):
            info["protocol"] = "HTTP"

    elif packet.haslayer(UDP):
        udp = packet[UDP]
        info.update(
            protocol="UDP",
            source_port=int(udp.sport),
            destination_port=int(udp.dport),
        )
        if packet.haslayer(DNS):
            info["protocol"] = "DNS"
            dns = packet[DNS]
            if dns.haslayer(DNSQR):
                qname = dns[DNSQR].qname
                if isinstance(qname, bytes):
                    qname = qname.decode(errors="replace")
                kind = "response" if dns.qr else "query"
                info["info"] = f"{kind} {qname.rstrip('.')}"

    elif packet.haslayer(ICMP):
        info["protocol"] = "ICMP"
        info["info"] = f"type={packet[ICMP].type} code={packet[ICMP].code}"

    return info
