# Deploy e operação

Guia de produção: Coolify numa VPS, com o LiveKit self-hosted, o app em imagem do GHCR e o Postgres gerenciado pelo Coolify. Para rodar localmente, veja o [guia de desenvolvimento](development.md).

## Deploy no Coolify

Você vai criar dois recursos no mesmo servidor: o LiveKit e o app.

### 0. DNS e chaves

1. Crie dois registros A apontando para o IP da VPS:
   - `app.seudominio.com` → app React Router
   - `lk.seudominio.com` → LiveKit (sinalização + TURN)

   Se usar Cloudflare, deixe o `lk.` como DNS only (nuvem cinza). TURN e WebRTC precisam do IP real.

2. Gere um par de chaves:

   ```bash
   docker run --rm livekit/livekit-server:v1.13.7 generate-keys
   # ou: echo "API$(openssl rand -hex 6)"  e  openssl rand -base64 48
   ```

### 1. Firewall da VPS

```bash
ufw allow 7881/tcp           # WebRTC via TCP (fallback)
ufw allow 50000:50100/udp    # mídia WebRTC
ufw allow 3478/udp           # TURN/UDP
ufw allow 30000:30100/udp    # portas de relay do TURN
ufw allow 5349/tcp           # TURN/TLS (só se ativar, ver abaixo)
```

**Não** abra a 7880: ela passa pelo proxy HTTPS do Coolify. Se o provedor tiver firewall próprio (Hetzner, AWS etc.), libere as mesmas portas lá também.

### 2. Recurso LiveKit (Docker Compose)

1. - New Resource → Docker Compose apontando para este repositório.
2. Em _Docker Compose Location_, use `/docker-compose.livekit.yml`.
3. Edite `deploy/livekit/livekit.yaml` e troque `lk.seudominio.com` pelo seu domínio (`turn.domain`).
4. Em Environment Variables, defina `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`.
5. Não preencha domínio no serviço. Com `network_mode: host`, o proxy não descobre o container por labels; a rota é criada no passo 3.
6. Deploy. Nos logs deve aparecer `starting LiveKit server` com `rtc.portICERange: [50000, 50100]` e `Starting TURN server`.

### 3. Proxy HTTPS para `lk.seudominio.com` → 7880

Em Servers → (seu servidor) → Proxy → Dynamic Configurations, adicione um arquivo `livekit.yaml` (Traefik):

```yaml
http:
  routers:
    livekit-http:
      rule: Host(`lk.seudominio.com`)
      entryPoints: [http]
      middlewares: [livekit-https]
      service: livekit
    livekit:
      rule: Host(`lk.seudominio.com`)
      entryPoints: [https]
      service: livekit
      tls:
        certResolver: letsencrypt
  middlewares:
    livekit-https:
      redirectScheme:
        scheme: https
  services:
    livekit:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:7880
```

O proxy do Coolify já resolve `host.docker.internal` para o host. Se não resolver no seu servidor, use o gateway da bridge do Docker (`http://172.17.0.1:7880`) e permita o tráfego dos containers até a 7880:

```bash
ufw allow from 172.16.0.0/12 to any port 7880 proto tcp
ufw allow from 10.0.0.0/8 to any port 7880 proto tcp
```

Para testar: `curl https://lk.seudominio.com` deve responder `OK`.

### 4. Recurso App (imagem do GHCR)

A imagem é construída no **GitHub Actions** (não na VPS, para não disputar CPU e memória com o app) e publicada no GHCR com duas tags: `:<sha>` (imutável) e `:main`.

1. No Coolify: New Resource → **Docker Image** → `ghcr.io/<org>/<repo>:main` (com credencial de leitura do GHCR). Ports Exposes: `3000`. Domains: `https://app.seudominio.com`.
2. Environment Variables (runtime):

   ```
   DATABASE_URL=postgres://nelcota_app:<senha>@<host-interno-do-postgres>:5432/nelcota
   LIVEKIT_API_KEY=<mesma do LiveKit>
   LIVEKIT_API_SECRET=<mesmo do LiveKit>
   LIVEKIT_URL=wss://lk.seudominio.com
   ACCESS_PASSWORD=<opcional>
   MAX_PARTICIPANTS=6
   SENTRY_DSN=<opcional>
   AUTH_SECRET=<openssl rand -base64 48>
   ADMIN_AUTH_SECRET=<outro openssl rand -base64 48; liga o /admin>
   APP_URL=https://app.seudominio.com
   SMTP_URL=smtps://usuario:senha@smtp.seudominio.com:465
   MAIL_FROM=Nelcota <no-reply@seudominio.com>
   ```

   Sem `APP_URL`, `SMTP_URL` e `MAIL_FROM`, o app recusa subir em produção (`server/env.server.ts`).

3. Mantenha o rolling update ligado (sem mapear porta do host nem nome fixo de container). O `HEALTHCHECK` do Dockerfile consulta `/api/health`; o container roda como usuário não-root (`nelcota`).

**Pipeline** (`.github/workflows`): `ci.yml` roda formatação, lint, tipos, `pnpm audit`, testes (com Postgres 18.6) e build em todo PR. Na `main`, `deploy.yml` faz: imagem no GHCR → **migração** (SSH na VPS, `docker run` da imagem nova com o usuário de migração) → webhook do Coolify → espera o `/api/ready` responder com o SHA novo. Se a migração falhar, nada é deployado.

Segredos do GitHub (environment `production`): `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`, `MIGRATOR_DATABASE_URL`, `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`. Variáveis: `APP_URL`, `DEPLOY_DOCKER_NETWORK` (padrão `coolify`), `PUBLIC_SENTRY_DSN` (opcional). No servidor, o usuário de deploy precisa de `docker login ghcr.io` uma vez.

> O rate limit fica em memória: vale para uma réplica (o padrão no Coolify). Para escalar horizontalmente, troque por Redis.
>
> O IP usado no rate limit é o do `X-Forwarded-For` contado a partir do fim, conforme `TRUSTED_PROXY_HOPS` (Traefik = 1). Se o `app.` passar também pelo proxy da Cloudflare, use `TRUSTED_PROXY_HOPS=2`.
>
> **Rollback:** a tag `:main` muda a cada deploy. Para voltar uma versão, aponte o recurso para `ghcr.io/<org>/<repo>:<sha-anterior>` (tag imutável) e faça redeploy; as migrações são sempre aditivas (expand/contract), então o código anterior funciona com o schema novo.

### 4.1. PostgreSQL

1. No Coolify, crie um recurso **PostgreSQL** com a imagem `postgres:18.6-alpine`, no mesmo projeto e servidor do app. **Não** torne a porta pública.
2. Em "Custom PostgreSQL configuration", cole `deploy/postgres/postgresql.conf` (ele **substitui** o arquivo inteiro; os valores estão comentados para VPS de 4 e 8 GB). Reinicie o banco.
3. Rode o bootstrap uma vez com o superusuário (instruções no topo de `deploy/postgres/bootstrap.sql`) e guarde as três senhas geradas.
4. `DATABASE_URL` do App usa `nelcota_app`; `MIGRATOR_DATABASE_URL` (segredo do GitHub) usa `nelcota_migrator`. Ambas com o host **interno** do Postgres.
5. Ative os backups agendados do Coolify para um S3 compatível (diário, 03:00).

### 5. TURN/TLS (opcional, para redes muito restritivas)

O TURN/UDP (3478) já vem ativo. O TURN/TLS na 5349 atravessa firewalls que só deixam passar TLS, mas precisa de um certificado válido para o `turn.domain`:

1. Gere o certificado por desafio DNS, já que a porta 80 é do proxy:
   `certbot certonly --manual --preferred-challenges dns -d lk.seudominio.com`
   (ou use o plugin do seu provedor DNS, para ter renovação automática).
2. Em `deploy/livekit/livekit.yaml`, descomente `tls_port`, `cert_file` e `key_file`.
3. Em `docker-compose.livekit.yml`, descomente o volume dos certificados.
4. Libere `5349/tcp` e faça o redeploy.

### 6. Webhook (salas e participações no painel)

O app recebe os eventos do LiveKit em `POST /api/livekit/webhook`. Cada evento é gravado em `livekit_events` (o id do evento impede duplicatas) e projetado em `rooms`, `room_participations` e `share_sessions`, que alimentam o painel admin. A projeção aceita eventos repetidos e fora de ordem. A assinatura é conferida com `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`: sem ela, a rota responde 401. Com o banco fora do ar, responde 503 e o LiveKit tenta de novo.

1. Em `deploy/livekit/livekit.yaml`, troque `api_key` no bloco `webhook` pelo valor de `LIVEKIT_API_KEY` e a URL pelo domínio do app.
2. Faça o redeploy do LiveKit.
3. Confira: entre numa sala e veja `select event, processed_at, error from livekit_events order by received_at desc limit 5;`.

Em desenvolvimento, `deploy/livekit/livekit.dev.yaml` aponta o webhook para `http://host.docker.internal:3000` (veja o topo do arquivo).

Cada pedido ao `/api/token` também fica em `token_requests` (resultado, conta e IP), que liga cada entrada ao IP de origem.

## Testando em produção

### Duas redes diferentes

1. Computador A no Wi-Fi de casa/escritório; computador ou celular B no 4G (roteador do celular).
2. Os dois entram na mesma sala. A compartilha a tela; B deve ver o palco em segundos.
3. Teste também com uma rede corporativa/VPN, que é onde o TURN costuma ser necessário.

### Conferindo candidatos `relay` (TURN)

1. No Chrome, abra `chrome://webrtc-internals` **antes** de entrar na sala.
2. Entre e compartilhe a tela. Na conexão `RTCPeerConnection`, abra Stats Tables e procure o `candidate-pair` com `state: succeeded` / `nominated: true`.
3. Veja o `remote-candidate` / `local-candidate` desse par:
   - `candidateType: host` ou `srflx` → conexão direta via UDP (ideal);
   - `candidateType: relay` → passou pelo TURN.
4. Para **forçar** o teste do TURN, bloqueie temporariamente a mídia direta na VPS e reconecte:

   ```bash
   ufw deny 50000:50100/udp && ufw deny 7881/tcp
   # entre na sala: o par nominado deve ser "relay"
   ufw delete deny 50000:50100/udp && ufw delete deny 7881/tcp
   ```

   Se não conectar com essas portas bloqueadas, revise `3478/udp`, `30000-30100/udp` e o `turn.domain`.

5. Pelo servidor: nos logs do LiveKit, a linha `participant active` de cada pessoa traz `connectionType` (`udp`/`tcp`) e a lista `publisherCandidates`. O candidato marcado com `[remote][selected:1]` mostra o tipo usado (`host`, `srflx` ou `relay`).
