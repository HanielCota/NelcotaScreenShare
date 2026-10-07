import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { AccessToken } from "livekit-server-sdk";
import { Pool } from "pg";
import { afterAll, describe, test } from "vitest";
import { receiveLivekitWebhook } from "@/features/room/server/webhook/route.server";
import * as schema from "@/server/db/schema";
import { reprocessPendingEvents } from "@/features/room/server/webhook/projector.server";
import { anonymizeParticipant } from "@/features/account/server/participant-accounts.server";

/**
 * Webhook do LiveKit de ponta a ponta: eventos assinados como o LiveKit envia
 * (JSON do protobuf), gravados e projetados no Postgres.
 */
const { LIVEKIT_API_KEY: KEY = "", LIVEKIT_API_SECRET: SECRET = "" } = process.env;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

/** 06/10/2026 por volta das 12h UTC, em segundos. */
const T = 1_791_300_000;
let eventCounter = 0;
let roomCounter = 0;

function newRoom() {
  roomCounter += 1;
  return `sala-${roomCounter}-${Date.now().toString(36)}`;
}

async function newUser(name: string) {
  const [user] = await db
    .insert(schema.users)
    .values({ name, email: `${name.toLowerCase()}-${crypto.randomUUID()}@exemplo.com` })
    .returning({ id: schema.users.id });
  assert.ok(user);
  return user.id;
}

interface EventInput {
  event: string;
  room: string;
  at: number;
  participant?: {
    identity: string;
    name?: string;
    joinedAt?: number;
    reason?: string;
    sid?: string;
  };
  track?: { sid: string; source: string };
  id?: string;
}

function payload({ event, room, at, participant, track, id }: EventInput) {
  eventCounter += 1;
  return JSON.stringify({
    id: id ?? `EV_${eventCounter}_${Date.now()}`,
    event,
    createdAt: String(at),
    room: { name: room, sid: `RM_${room}`, creationTime: String(at) },
    ...(participant
      ? {
          // Como o LiveKit manda: eventos de faixa trazem só sid e identidade.
          participant: {
            sid: participant.sid ?? `PA_${participant.identity}`,
            identity: participant.identity,
            ...(participant.name ? { name: participant.name } : {}),
            ...(participant.joinedAt
              ? {
                  joinedAt: String(participant.joinedAt),
                  joinedAtMs: String(participant.joinedAt * 1000),
                }
              : {}),
            ...(participant.reason ? { disconnectReason: participant.reason } : {}),
          },
        }
      : {}),
    ...(track ? { track: { sid: track.sid, source: track.source } } : {}),
  });
}

async function send(input: EventInput | string) {
  const body = typeof input === "string" ? input : payload(input);
  const token = new AccessToken(KEY, SECRET);
  token.sha256 = createHash("sha256").update(body).digest("base64");
  const response = await receiveLivekitWebhook(
    new Request("http://localhost/api/livekit/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/webhook+json",
        authorization: await token.toJwt(),
      },
      body,
    }),
  );
  assert.equal(response.status, 204);
}

async function roomByCode(code: string) {
  const room = await db.query.rooms.findFirst({ where: eq(schema.rooms.code, code) });
  assert.ok(room, `sala ${code}`);
  return room;
}

function participationsOf(roomId: string) {
  return db
    .select()
    .from(schema.roomParticipations)
    .where(eq(schema.roomParticipations.roomId, roomId))
    .orderBy(schema.roomParticipations.joinedAt);
}

describe("projeção dos eventos", () => {
  test("entradas simultâneas da mesma conta em salas distintas são projetadas", async () => {
    const id = await newUser("Simultanea");
    const codes = [newRoom(), newRoom()];
    await Promise.all(
      codes.map((room) =>
        send({
          event: "participant_joined",
          room,
          at: T,
          participant: { identity: id, name: "Simultanea", joinedAt: T, sid: `PA_${room}` },
        }),
      ),
    );
    for (const code of codes) {
      const room = await roomByCode(code);
      const all = await participationsOf(room.id);
      assert.equal(all.length, 1);
      assert.equal(all[0]?.userId, id);
      const events = await db
        .select()
        .from(schema.livekitEvents)
        .where(eq(schema.livekitEvents.roomName, code));
      assert.ok(events.every((event) => event.processedAt !== null && event.error === null));
    }
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    assert.equal(user?.participationsCount, 2);
  });

  test("webhooks posteriores à anonimização não restauram nomes, nem em novas conexões", async () => {
    const code = newRoom();
    const id = await newUser("Pessoa");
    const participant = { identity: id, name: "Nome Original", joinedAt: T };
    await send({ event: "participant_joined", room: code, at: T, participant });
    await db.transaction((tx) => anonymizeParticipant(tx, id));
    await send({ event: "participant_left", room: code, at: T + 30, participant });
    await send({
      event: "participant_joined",
      room: code,
      at: T + 40,
      participant: { ...participant, sid: `PA_nova_${code}`, joinedAt: T + 40 },
    });
    const room = await roomByCode(code);
    const all = await participationsOf(room.id);
    assert.equal(all.length, 2);
    assert.ok(all.every((row) => row.displayName === null));
    assert.ok(all.every((row) => row.userId === id));
  });

  test("encerramento recebido antes da entrada e da tela fecha registros atrasados", async () => {
    const code = newRoom();
    const participant = { identity: "atrasado", joinedAt: T + 1 };
    await send({ event: "room_started", room: code, at: T });
    await send({ event: "room_finished", room: code, at: T + 60 });
    await send({ event: "participant_joined", room: code, at: T + 1, participant });
    await send({
      event: "track_published",
      room: code,
      at: T + 10,
      participant,
      track: { sid: `TR_atrasada_${code}`, source: "SCREEN_SHARE" },
    });
    const room = await roomByCode(code);
    assert.equal(room.status, "finished");
    const [participation] = await participationsOf(room.id);
    assert.equal(participation?.leftAt?.getTime(), (T + 60) * 1000);
    assert.equal(participation?.leaveReason, "room_closed");
    const [share] = await db
      .select()
      .from(schema.shareSessions)
      .where(eq(schema.shareSessions.roomId, room.id));
    assert.equal(share?.endedAt?.getTime(), (T + 60) * 1000);
    assert.equal(share?.durationSeconds, 50);
    // Uma saída ainda anterior ao encerramento corrige a estimativa da sala.
    await send({
      event: "participant_left",
      room: code,
      at: T + 50,
      participant: { ...participant, reason: "CLIENT_INITIATED" },
    });
    const [left] = await participationsOf(room.id);
    const [ended] = await db
      .select()
      .from(schema.shareSessions)
      .where(eq(schema.shareSessions.roomId, room.id));
    assert.equal(left?.leftAt?.getTime(), (T + 50) * 1000);
    assert.equal(left?.leaveReason, "left");
    assert.equal(ended?.durationSeconds, 40);
  });

  test("entrada antiga continua encerrada quando chega depois da reabertura", async () => {
    const code = newRoom();
    await send({ event: "room_started", room: code, at: T });
    await send({ event: "room_finished", room: code, at: T + 60 });
    await send({
      event: "participant_joined",
      room: code,
      at: T + 120,
      participant: { identity: "nova-abertura", joinedAt: T + 120 },
    });
    await send({
      event: "participant_joined",
      room: code,
      at: T + 1,
      participant: { identity: "abertura-antiga", joinedAt: T + 1 },
    });
    const room = await roomByCode(code);
    assert.equal(room.status, "active");
    const all = await participationsOf(room.id);
    assert.equal(
      all.find((row) => row.livekitIdentity === "abertura-antiga")?.leftAt?.getTime(),
      (T + 60) * 1000,
    );
    assert.equal(all.find((row) => row.livekitIdentity === "nova-abertura")?.leftAt, null);
  });

  test("tela recebida depois da saída herda o encerramento da participação", async () => {
    const code = newRoom();
    const participant = { identity: `saida-${code}`, joinedAt: T };
    await send({ event: "participant_left", room: code, at: T + 50, participant });
    await send({
      event: "track_published",
      room: code,
      at: T + 10,
      participant,
      track: { sid: `TR_saida_${code}`, source: "SCREEN_SHARE" },
    });
    const [share] = await db
      .select()
      .from(schema.shareSessions)
      .where(eq(schema.shareSessions.trackSid, `TR_saida_${code}`));
    assert.equal(share?.durationSeconds, 40);
  });

  test("sala completa: entrada, compartilhamento com áudio, saída e encerramento", async () => {
    const code = newRoom();
    const ana = await newUser("Ana");
    const bia = await newUser("Bia");
    // Pedido de token que deu a entrada da Ana (IP e "quem criou").
    await db.insert(schema.tokenRequests).values({
      roomCode: code,
      userId: ana,
      result: "granted",
      ip: "203.0.113.7",
      createdAt: new Date((T - 30) * 1000),
    });

    await send({ event: "room_started", room: code, at: T });
    await send({
      event: "participant_joined",
      room: code,
      at: T + 1,
      participant: { identity: ana, name: "Ana", joinedAt: T + 1 },
    });
    await send({
      event: "participant_joined",
      room: code,
      at: T + 5,
      participant: { identity: bia, name: "Bia", joinedAt: T + 5 },
    });
    // Eventos de faixa: sem joined_at nem nome. O áudio da tela vem antes do vídeo.
    const anaP = { identity: ana };
    await send({
      event: "track_published",
      room: code,
      at: T + 10,
      participant: anaP,
      track: { sid: `TR_audio_${code}`, source: "SCREEN_SHARE_AUDIO" },
    });
    await send({
      event: "track_published",
      room: code,
      at: T + 10,
      participant: anaP,
      track: { sid: `TR_tela_${code}`, source: "SCREEN_SHARE" },
    });
    await send({
      event: "track_published",
      room: code,
      at: T + 12,
      participant: anaP,
      track: { sid: `TR_mic_${code}`, source: "MICROPHONE" },
    });
    await send({
      event: "track_unpublished",
      room: code,
      at: T + 70,
      participant: anaP,
      track: { sid: `TR_tela_${code}`, source: "SCREEN_SHARE" },
    });
    await send({
      event: "participant_left",
      room: code,
      at: T + 80,
      participant: { identity: bia, name: "Bia", joinedAt: T + 5, reason: "CLIENT_INITIATED" },
    });
    await send({ event: "room_finished", room: code, at: T + 100 });

    const room = await roomByCode(code);
    assert.equal(room.status, "finished");
    assert.equal(room.peakParticipants, 2);
    assert.equal(room.createdByUserId, ana);
    assert.equal(room.finishedAt?.getTime(), (T + 100) * 1000);

    const all = await participationsOf(room.id);
    assert.equal(all.length, 2, "faixas não criam participações a mais");
    const [first, second] = all;
    assert.equal(first?.userId, ana);
    assert.equal(first?.displayName, "Ana");
    assert.equal(first?.joinedAt.getTime(), (T + 1) * 1000);
    assert.equal(first?.ip, "203.0.113.7");
    assert.equal(first?.leaveReason, "room_closed");
    assert.equal(second?.userId, bia);
    assert.equal(second?.leaveReason, "left");
    assert.equal(second?.leftAt?.getTime(), (T + 80) * 1000);

    const shares = await db
      .select()
      .from(schema.shareSessions)
      .where(eq(schema.shareSessions.roomId, room.id));
    assert.equal(shares.length, 1, "microfone não é compartilhamento");
    assert.equal(shares[0]?.withAudio, true);
    assert.equal(shares[0]?.durationSeconds, 60);
  });

  test("reenvio do mesmo evento não duplica nada", async () => {
    const code = newRoom();
    const body = payload({
      event: "participant_joined",
      room: code,
      at: T,
      participant: { identity: "visitante-1", name: "Visita", joinedAt: T },
    });
    await send(body);
    await send(body);
    await send(body);
    const room = await roomByCode(code);
    assert.equal((await participationsOf(room.id)).length, 1);
    const events = await db
      .select()
      .from(schema.livekitEvents)
      .where(eq(schema.livekitEvents.roomName, code));
    assert.equal(events.length, 1);
    assert.ok(events[0]?.processedAt);
    assert.equal(room.peakParticipants, 1);
  });

  test("fora de ordem: saída antes da entrada e fim do compartilhamento antes do início", async () => {
    const code = newRoom();
    const caio = await newUser("Caio");
    const p = { identity: caio, name: "Caio", joinedAt: T };
    const track = { identity: caio };
    await send({
      event: "track_unpublished",
      room: code,
      at: T + 40,
      participant: track,
      track: { sid: `TR_${code}`, source: "SCREEN_SHARE" },
    });
    await send({
      event: "participant_left",
      room: code,
      at: T + 50,
      participant: { ...p, reason: "SIGNAL_CLOSE" },
    });
    await send({
      event: "track_published",
      room: code,
      at: T + 10,
      participant: track,
      track: { sid: `TR_${code}`, source: "SCREEN_SHARE" },
    });
    await send({ event: "participant_joined", room: code, at: T, participant: p });

    const room = await roomByCode(code);
    const participations = await participationsOf(room.id);
    assert.equal(participations.length, 1);
    assert.equal(participations[0]?.joinedAt.getTime(), T * 1000, "a entrada corrige o início");
    assert.equal(participations[0]?.displayName, "Caio");
    assert.equal(
      participations[0]?.leftAt?.getTime(),
      (T + 50) * 1000,
      "a entrada atrasada não reabre",
    );
    assert.equal(participations[0]?.leaveReason, "disconnected");
    const [share] = await db
      .select()
      .from(schema.shareSessions)
      .where(eq(schema.shareSessions.trackSid, `TR_${code}`));
    assert.equal(share?.startedAt.getTime(), (T + 10) * 1000);
    assert.equal(share?.durationSeconds, 30);
  });

  test("fim atrasado não encerra uma sala que já foi reaberta", async () => {
    const code = newRoom();
    await send({ event: "room_started", room: code, at: T });
    await send({ event: "room_finished", room: code, at: T + 60 });
    assert.equal((await roomByCode(code)).status, "finished");

    // Reabriu: alguém entrou depois do fim.
    await send({
      event: "participant_joined",
      room: code,
      at: T + 120,
      participant: { identity: "visitante-2", joinedAt: T + 120 },
    });
    let room = await roomByCode(code);
    assert.equal(room.status, "active");
    assert.equal(room.finishedAt, null);

    // O fim da 1ª abertura chega de novo (outro id): continua ativa.
    await send({ event: "room_finished", room: code, at: T + 60 });
    room = await roomByCode(code);
    assert.equal(room.status, "active");
    const [online] = await participationsOf(room.id);
    assert.equal(online?.leftAt, null);
  });

  test("sala com nome fora do padrão é ignorada, mas o evento fica registrado", async () => {
    const name = `Sala Estranha ${Date.now()}`;
    await send({ event: "room_started", room: name, at: T });
    const [event] = await db
      .select()
      .from(schema.livekitEvents)
      .where(eq(schema.livekitEvents.roomName, name));
    assert.ok(event?.processedAt);
    assert.equal(event?.error, null);
    assert.equal(await db.query.rooms.findFirst({ where: eq(schema.rooms.code, name) }), undefined);
  });

  test("evento gravado e não projetado (queda no meio) é reprocessado", async () => {
    const code = newRoom();
    await db.insert(schema.livekitEvents).values({
      id: `EV_pendente_${code}`,
      event: "participant_joined",
      roomName: code,
      occurredAt: new Date(T * 1000),
      payload: JSON.parse(
        payload({
          event: "participant_joined",
          room: code,
          at: T,
          participant: { identity: "visitante-3", joinedAt: T },
        }),
      ) as Record<string, unknown>,
    });
    const result = await reprocessPendingEvents(db);
    assert.ok(result.projected >= 1);
    const room = await roomByCode(code);
    assert.equal((await participationsOf(room.id)).length, 1);
    const [event] = await db
      .select()
      .from(schema.livekitEvents)
      .where(and(eq(schema.livekitEvents.roomName, code)));
    assert.ok(event?.processedAt);
  });
});
