# Nelcota — compartilhamento de tela

App web de compartilhamento de tela para times pequenos (~5 pessoas), com Next.js 16 e LiveKit self-hosted. Dark mode, animações em GSAP e deploy via Coolify em uma VPS.

- Home → criar sala ou entrar com código → pré-entrada (nome, senha opcional, teste de microfone) → sala
- Compartilhar a tela com áudio da aba/sistema (quando o navegador permite), microfone, indicador de quem fala, copiar link
- Token JWT gerado no servidor (`POST /api/token`), com TTL curto, senha opcional, limite de pessoas e rate limit por IP

## Stack

| Área              | Versão                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Node.js           | 24 LTS (`node:24-alpine`)                                                                             |
| Next.js           | 16.3 (App Router, Turbopack, React Compiler, `output: "standalone"`)                                  |
| React             | 19.3                                                                                                  |
| TypeScript        | 7.0 (compilador nativo; o `next build` usa o `tsc` do projeto)                                        |
| Lint / formatação | Oxlint + `oxlint-tsgolint` (type-aware) / Oxfmt (com ordenação de classes Tailwind)                   |
| UI                | Tailwind CSS 4.3 (CSS-first, tokens em `app/globals.css`), shadcn/ui, lucide-react, Manrope           |
| Tempo real        | `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`, `livekit/livekit-server:v1.13.7` |
| Animação          | GSAP 3.15 + `@gsap/react` (Flip, CustomEase)                                                          |
| Validação         | Zod 4                                                                                                 |

## Rodando localmente

Pré-requisitos: Node 24+, pnpm (via `corepack enable`) e Docker.

```bash
# 1. LiveKit em modo dev (a chave precisa ter 32+ caracteres; o app valida isso)
docker run -d --name lk-dev \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:v1.13.7 \
  --dev --bind 0.0.0.0 --node-ip 127.0.0.1 \
  --keys "devkey: devsecret-0123456789abcdef0123456789abcdef"

# 2. Variáveis
cp .env.example .env.local
#   LIVEKIT_API_KEY=devkey
#   LIVEKIT_API_SECRET=devsecret-0123456789abcdef0123456789abcdef
#   NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880

# 3. App
pnpm install
pnpm dev            # http://localhost:3000
```

Abra duas abas (ou uma janela anônima), entre na mesma sala e compartilhe a tela.

### Scripts

| Script                                   | O que faz                                                       |
| ---------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Desenvolvimento, build de produção e servidor de produção local |
| `pnpm typecheck`                         | `tsc --noEmit` (TypeScript 7 nativo)                            |
| `pnpm lint` / `pnpm lint:fix`            | Oxlint com informação de tipos (`oxlint.config.ts`)             |
| `pnpm format`                            | Oxfmt (`.oxfmtrc.json`)                                         |

> Em produção o container roda `node server.js`: é o servidor mínimo gerado pelo próprio Next no modo `standalone` (não é um servidor customizado). Localmente, `pnpm start` usa `next start`.

## Atalhos na sala

| Tecla | Ação |
|---|---|
| `M` | Liga e desliga o microfone |
| `S` | Abre o menu de compartilhar (ou para de compartilhar) |
| `F` | Tela cheia no palco |
| `P` | Apontar na tela de outra pessoa (todos veem o ponto) |
| `H` | Levantar ou baixar a mão |
| `C` | Abre e fecha o chat |

Os atalhos não disparam enquanto você digita no chat ou em outro campo.

## Variáveis de ambiente

| Variável                  | Obrigatória | Descrição                                                                    |
| ------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `LIVEKIT_API_KEY`         | sim         | Chave da API do LiveKit (mesma do servidor LiveKit)                          |
| `LIVEKIT_API_SECRET`      | sim         | Segredo (32+ caracteres). **Nunca** vai para o navegador                     |
| `NEXT_PUBLIC_LIVEKIT_URL` | sim         | `wss://lk.seudominio.com`                                                    |
| `ACCESS_PASSWORD`         | não         | Se definida, todos precisam dela para entrar (comparação em tempo constante) |
| `MAX_PARTICIPANTS`        | não         | Limite por sala, de 2 a 8 (padrão 6)                                         |

Tudo é validado com Zod em `lib/env.ts`. Se faltar algo, o container sai com código 1 no boot e lista o problema nos logs.

`NEXT_PUBLIC_LIVEKIT_URL` é lida em runtime pelo servidor e devolvida ao navegador junto com o token. Por isso mudar a URL não exige rebuild, e nenhuma variável precisa existir no build.

## Deploy no Coolify

Você vai criar dois recursos no mesmo servidor: o LiveKit e o app.

### 0. DNS e chaves

1. Crie dois registros A apontando para o IP da VPS:
   - `app.seudominio.com` → app Next.js
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

### 4. Recurso App (Dockerfile)

1. - New Resource → Application a partir do repositório, com Build Pack: Dockerfile.
2. Ports Exposes: `3000`. Domains: `https://app.seudominio.com`.
3. Environment Variables (runtime; não precisam ser _build variables_):

   ```
   LIVEKIT_API_KEY=<mesma do LiveKit>
   LIVEKIT_API_SECRET=<mesmo do LiveKit>
   NEXT_PUBLIC_LIVEKIT_URL=wss://lk.seudominio.com
   ACCESS_PASSWORD=<opcional>
   MAX_PARTICIPANTS=6
   ```

4. Deploy. O `HEALTHCHECK` do Dockerfile consulta `/api/health`, e o container roda como usuário não-root (`nextjs`).

> O rate limit fica em memória: vale para uma réplica (o padrão no Coolify). Para escalar horizontalmente, troque por Redis.
>
> O IP usado no rate limit é o último do `X-Forwarded-For`, o que o Traefik acrescenta. Se o `app.` passar pelo proxy da Cloudflare, esse IP vira o da Cloudflare; nesse caso, leia o `CF-Connecting-IP` em `lib/rate-limit.ts`.

### 5. TURN/TLS (opcional, para redes muito restritivas)

O TURN/UDP (3478) já vem ativo. O TURN/TLS na 5349 atravessa firewalls que só deixam passar TLS, mas precisa de um certificado válido para o `turn.domain`:

1. Gere o certificado por desafio DNS, já que a porta 80 é do proxy:
   `certbot certonly --manual --preferred-challenges dns -d lk.seudominio.com`
   (ou use o plugin do seu provedor DNS, para ter renovação automática).
2. Em `deploy/livekit/livekit.yaml`, descomente `tls_port`, `cert_file` e `key_file`.
3. Em `docker-compose.livekit.yml`, descomente o volume dos certificados.
4. Libere `5349/tcp` e faça o redeploy.

### 6. Webhook (opcional, registro de entradas e saídas)

O app recebe os eventos do LiveKit em `POST /api/livekit/webhook` e grava uma linha JSON nos logs para cada sala aberta ou encerrada e cada pessoa que entra ou sai (`"source":"livekit-webhook"`). A assinatura do evento é conferida com `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`; sem ela, a rota responde 401.

1. Em `deploy/livekit/livekit.yaml`, descomente o bloco `webhook`.
2. Troque `api_key` pelo valor de `LIVEKIT_API_KEY` e a URL pelo domínio do app.
3. Faça o redeploy do LiveKit. Os eventos aparecem nos logs do recurso App no Coolify.

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

## Estrutura

```
app/
  layout.tsx              # Manrope, metadata, Toaster
  globals.css             # @import "tailwindcss" + @theme (tokens dark)
  page.tsx                # Home
  sala/[codigo]/page.tsx  # valida o código e renderiza a sessão
  api/token/route.ts      # JWT do LiveKit (Zod, senha, limite, rate limit)
  api/livekit/webhook/route.ts  # log de entradas e saídas (assinado pelo LiveKit)
  api/health/route.ts     # healthcheck
components/
  home/{HomeScene,JoinForm}.tsx
  room/{RoomSession,PreJoin,RoomView,ScreenStage,ParticipantTile,ControlDock,DockButton,ShareMenu,MicMenu,Reactions,Chat,StatusScreen}.tsx
  ui/                     # shadcn
hooks/useRoomAnimations.ts  # entrada do dock, stagger dos tiles e Flip do layout
hooks/useShortcut.ts        # atalhos de uma tecla (M, S, F, P, H, C)
lib/{gsap,livekit,env,rate-limit,csp,room-data,copy-room-link,utils}.ts
instrumentation.ts        # valida o env no boot
deploy/livekit/livekit.yaml
docker-compose.livekit.yml
Dockerfile
```
