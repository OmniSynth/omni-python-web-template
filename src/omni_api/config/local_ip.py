"""本机局域网 IPv4 探测（用于启动日志，不走默认路由以免误报 VPN 地址）。"""

from __future__ import annotations

import ipaddress
import platform
import re
import subprocess

_VIRTUAL_IFACE_PREFIXES = (
    "lo",
    "utun",
    "gif",
    "stf",
    "bridge",
    "docker",
    "veth",
    "tun",
    "tap",
    "awdl",
    "llw",
    "br-",
    "vmnet",
    "vboxnet",
)


def _is_virtual_iface(name: str) -> bool:
    return name == "lo0" or name.startswith(_VIRTUAL_IFACE_PREFIXES)


_EXCLUDED_NETWORKS = (
    ipaddress.ip_network("198.18.0.0/15"),  # VPN / 代理虚拟网段（如 Clash TUN）
    ipaddress.ip_network("100.64.0.0/10"),  # CGNAT / 部分虚拟网卡
)


def _is_private_lan_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    if ip.is_loopback or ip.is_link_local:
        return False
    if any(ip in net for net in _EXCLUDED_NETWORKS):
        return False
    return ip.is_private


def _prefer_rank(ip: str) -> tuple[int, str]:
    if ip.startswith("192.168."):
        return (0, ip)
    if ip.startswith("10."):
        return (1, ip)
    if ip.startswith("172."):
        return (2, ip)
    return (3, ip)


def _parse_darwin_ifconfig(text: str) -> list[str]:
    ips: list[str] = []
    for block in re.split(r"\n(?=\S)", text):
        first = block.split("\n", 1)[0]
        match = re.match(r"^(\w+):", first)
        if not match or _is_virtual_iface(match.group(1)):
            continue
        for ip in re.findall(r"\binet (\d+\.\d+\.\d+\.\d+)\b", block):
            if _is_private_lan_ip(ip):
                ips.append(ip)
    return ips


def _parse_linux_ip_addr(text: str) -> list[str]:
    ips: list[str] = []
    for line in text.splitlines():
        match = re.match(r"^\d+:\s+(\S+)", line)
        if not match or _is_virtual_iface(match.group(1)):
            continue
        for ip in re.findall(r"\binet (\d+\.\d+\.\d+\.\d+)/", line):
            if _is_private_lan_ip(ip):
                ips.append(ip)
    return ips


def _run_cmd(args: list[str]) -> str:
    try:
        proc = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout


def _interface_private_ipv4_addresses() -> list[str]:
    system = platform.system()
    if system == "Darwin":
        raw = _parse_darwin_ifconfig(_run_cmd(["ifconfig"]))
    elif system == "Linux":
        raw = _parse_linux_ip_addr(_run_cmd(["ip", "-4", "-o", "addr", "show"]))
        if not raw:
            raw = [
                ip
                for ip in _run_cmd(["hostname", "-I"]).split()
                if _is_private_lan_ip(ip)
            ]
    else:
        raw = []

    seen: set[str] = set()
    unique: list[str] = []
    for ip in raw:
        if ip in seen:
            continue
        seen.add(ip)
        unique.append(ip)
    unique.sort(key=_prefer_rank)
    return unique


def primary_lan_ip() -> str | None:
    """返回本机 RFC1918 局域网 IPv4；优先 192.168.x.x。"""
    ips = _interface_private_ipv4_addresses()
    return ips[0] if ips else None
