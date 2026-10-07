# ADR 0002 — Um único gateway para o LiveKit no servidor; sem portas para banco e e-mail

- **Status:** aceita (2026-10-06)
- **Contexto:** a regra de quem entra numa sala (sessão, bloqueio, e-mail, senha, lotação, convite) vivia dentro do `POST /api/token`, com `new RoomServiceClient` e `new AccessToken` no meio. Testar qualquer ramo exigia subir um servidor HTTP falso do LiveKit.

## Decisão

- A decisão é a função pura `decideTokenRequest` (`features/room/domain/issue-token.ts`). Limites, comparação de senha, contagem de participantes e resgate de convite entram como funções.
- O SDK fica atrás de `LiveKitGateway` (`features/room/server/livekit-gateway.ts`), um objeto de funções com uma única implementação. Nos testes, ele vira um objeto literal.
- Banco e e-mail **não** ganham porta:
  - o banco é testado de verdade nos testes de integração;
  - o e-mail já cai para o log sem SMTP.
- Erros de domínio são uniões discriminadas por código (`{ ok: false, error, log, message }`). Não há biblioteca de `Result`.

## Consequências

- Cada ramo da entrada tem teste unitário em milissegundos (`tests/unit/issue-token.test.ts`).
- Os 15 testes de integração do `/api/token` passaram sem alteração, o que comprova que o contrato não mudou.
