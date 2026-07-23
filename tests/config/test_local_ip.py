"""局域网 IP 探测测试。"""

from omni_api.config.local_ip import (
    _is_private_lan_ip,
    _parse_darwin_ifconfig,
    _parse_linux_ip_addr,
    primary_lan_ip,
)


def test_is_private_lan_ip() -> None:
    assert _is_private_lan_ip("192.168.1.10")
    assert _is_private_lan_ip("10.0.0.5")
    assert not _is_private_lan_ip("198.18.0.1")
    assert not _is_private_lan_ip("127.0.0.1")
    assert not _is_private_lan_ip("8.8.8.8")


def test_parse_darwin_ifconfig_skips_vpn_and_prefers_en() -> None:
    text = """
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384
	inet 127.0.0.1 netmask 0xff000000
utun4: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1500
	inet 198.18.0.1 --> 198.18.0.1 netmask 0xfffffffc
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	inet 192.168.31.88 netmask 0xffffff00 broadcast 192.168.31.255
"""
    assert _parse_darwin_ifconfig(text) == ["192.168.31.88"]


def test_parse_linux_ip_addr_skips_docker() -> None:
    text = """
1: lo    inet 127.0.0.1/8 scope host lo
2: eth0    inet 192.168.1.20/24 brd 192.168.1.255 scope global eth0
3: docker0    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
"""
    assert _parse_linux_ip_addr(text) == ["192.168.1.20"]


def test_primary_lan_ip_returns_private_or_none() -> None:
    ip = primary_lan_ip()
    if ip is not None:
        assert _is_private_lan_ip(ip)
