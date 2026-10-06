-- Bootstrap dos papéis do Postgres. Roda UMA vez, com o superusuário, no banco do app:
--
--   psql "$SUPERUSER_URL" \
--     -v migrator_password="$(openssl rand -base64 32)" \
--     -v app_password="$(openssl rand -base64 32)" \
--     -v readonly_password="$(openssl rand -base64 32)" \
--     -f deploy/postgres/bootstrap.sql
--
-- É idempotente: rodar de novo só atualiza as senhas e os grants.
--
-- Papéis:
--   nelcota_migrator  dono do schema; só o job de migração usa (segredo no GitHub Actions)
--   nelcota_app       o app: lê e escreve dados, sem DDL
--   nelcota_readonly  diagnóstico e teste de restore: só leitura
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE %I LOGIN', r)
FROM unnest(ARRAY['nelcota_migrator', 'nelcota_app', 'nelcota_readonly']) AS r
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
\gexec

ALTER ROLE nelcota_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migrator_password';
ALTER ROLE nelcota_app      WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
ALTER ROLE nelcota_readonly WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'readonly_password';

-- Consulta travada ou transação esquecida não seguram conexões nem locks do app.
ALTER ROLE nelcota_app SET statement_timeout = '15s';
ALTER ROLE nelcota_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE nelcota_app SET lock_timeout = '5s';
ALTER ROLE nelcota_readonly SET statement_timeout = '60s';
ALTER ROLE nelcota_readonly SET default_transaction_read_only = on;

-- Banco: ninguém além dos três cria objetos ou conecta por padrão.
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO nelcota_migrator, nelcota_app', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO nelcota_readonly', current_database()) \gexec
-- Extensões (pg_trgm, unaccent, pg_stat_statements) são criadas pelo migrator.
SELECT format('GRANT CREATE ON DATABASE %I TO nelcota_migrator', current_database()) \gexec

-- Schema: o migrator é o dono; o app só usa.
ALTER SCHEMA public OWNER TO nelcota_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO nelcota_app, nelcota_readonly;

-- Tabelas criadas pelo migrator (agora e no futuro) ficam acessíveis ao app.
-- Tabelas só de inserção (audit etc.) revogam UPDATE/DELETE na própria migração.
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nelcota_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nelcota_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_migrator IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO nelcota_app;
ALTER DEFAULT PRIVILEGES FOR ROLE nelcota_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO nelcota_readonly;

-- Objetos que já existiam antes do bootstrap passam para o migrator.
SELECT format('ALTER TABLE %I.%I OWNER TO nelcota_migrator', schemaname, tablename)
FROM pg_tables WHERE schemaname = 'public'
\gexec
SELECT format('ALTER SCHEMA %I OWNER TO nelcota_migrator', nspname)
FROM pg_namespace WHERE nspname = 'drizzle'
\gexec
SELECT format('ALTER TABLE drizzle.%I OWNER TO nelcota_migrator', tablename)
FROM pg_tables WHERE schemaname = 'drizzle'
\gexec
SELECT format('ALTER SEQUENCE drizzle.%I OWNER TO nelcota_migrator', sequencename)
FROM pg_sequences WHERE schemaname = 'drizzle'
\gexec
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelcota_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelcota_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nelcota_readonly;
-- pg_stat_statements (tela "Saúde do banco", só leitura).
GRANT pg_read_all_stats TO nelcota_readonly;
