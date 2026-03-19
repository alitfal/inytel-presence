#!/bin/bash

echo "================================================"
echo "  Renovación certificado presence.inytel.com"
echo "================================================"
echo ""
echo "PASO 1: Generando nuevo certificado..."
echo ""

docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly \
  --manual \
  --preferred-challenges dns \
  --renew-by-default \
  -d presence.inytel.com

echo ""
echo "PASO 2: Reiniciando contenedor frontend..."
docker-compose -f /Users/benderserver/inytel-presence/docker-compose.yml restart frontend

echo ""
echo "✅ Certificado renovado correctamente."
echo "   Válido hasta: $(docker run --rm -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot certificates 2>/dev/null | grep 'Expiry Date' | head -1)"