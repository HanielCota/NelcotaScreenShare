#!/bin/sh
# Só para desenvolvimento local (docker-compose.dev.yml): roda o bootstrap dos papéis
# com senhas fixas de dev e cria o banco de testes. Em produção o bootstrap é manual.
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator_password=migrator-dev -v app_password=app-dev -v readonly_password=readonly-dev \
  -f /opt/nelcota/bootstrap.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE nelcota_test"
