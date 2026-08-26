#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# Generates a self-signed TLS certificate valid for:
#   - localhost / 127.0.0.1
#   - the LAN IP you pass as an argument (so other devices on your
#     network don't get a hostname mismatch warning)
#
# Usage:
#   ./docker/nginx/generate-cert.sh 192.168.1.50
#
# Devices on your LAN will still see a browser warning the first time
# ("not a trusted authority") because this cert is self-signed — that's
# expected for a local network with no public CA. Accept/trust it once
# per device. To remove the warning entirely, install insophinia.crt
# as a trusted root cert on each device (optional, see README-DOCKER.md).
# ═══════════════════════════════════════════════════════════════
set -e

LAN_IP="${1:-127.0.0.1}"
CERT_DIR="$(dirname "$0")/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/insophinia.key" \
  -out "$CERT_DIR/insophinia.crt" \
  -days 825 \
  -subj "/CN=insophinia-pos.local" \
  -addext "subjectAltName=DNS:localhost,DNS:insophinia-pos.local,IP:127.0.0.1,IP:${LAN_IP}"

chmod 644 "$CERT_DIR/insophinia.crt"
chmod 600 "$CERT_DIR/insophinia.key"

echo "Certificate generated in $CERT_DIR"
echo "Valid for: localhost, 127.0.0.1, and ${LAN_IP}"
