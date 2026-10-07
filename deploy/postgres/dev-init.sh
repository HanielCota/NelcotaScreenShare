#!/bin/sh
# Local development only (docker-compose.dev.yml): runs the roles bootstrap
# with fixed dev passwords and creates the test database. In production the bootstrap is manual.
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator_password=migrator-dev -v app_password=app-dev -v readonly_password=readonly-dev \
  -f /opt/nelcota/bootstrap.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE nelcota_test"
