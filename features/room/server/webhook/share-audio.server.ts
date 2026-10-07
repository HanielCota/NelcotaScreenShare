import { sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { livekitEvents, roomParticipations, shareSessions } from "@/server/db/schema";

/**
 * Reconcile audio from its track lifecycle, including late publications and endings.
 * An audio publication belongs to the latest overlapping video, or the first video
 * starting shortly after it. It never marks multiple generations of a share.
 */
export async function reconcileShareAudio(tx: DbExecutor, roomId: string, code: string) {
  await tx.execute(sql`
    with audio_publications as (
      select p.id as participation_id, audio.occurred_at as started_at,
        (select min(ending.occurred_at) from ${livekitEvents} as ending
          where ending.room_name = ${code} and ending.event = 'track_unpublished'
            and ending.payload->'participant'->>'sid' = p.livekit_sid
            and ending.payload->'track'->>'sid' = audio.payload->'track'->>'sid'
            and ending.occurred_at >= audio.occurred_at) as ended_at
      from ${livekitEvents} as audio
      join ${roomParticipations} as p
        on p.livekit_sid = audio.payload->'participant'->>'sid' and p.room_id = ${roomId}
      where audio.room_name = ${code} and audio.event = 'track_published'
        and audio.payload->'track'->>'source' = 'SCREEN_SHARE_AUDIO'
    ), matched_audio as (
      select candidate.id from audio_publications as audio
      cross join lateral (
        select video.id from ${shareSessions} as video
        where video.participation_id = audio.participation_id
          and video.started_at <= audio.started_at + interval '30 seconds'
          and (video.ended_at is null or video.ended_at >= audio.started_at)
          and (audio.ended_at is null or audio.ended_at >= video.started_at)
        order by
          (video.started_at > audio.started_at),
          case when video.started_at <= audio.started_at then video.started_at end desc,
          video.started_at, video.id
        limit 1
      ) as candidate
    ), reconciled as (
      select video.id,
        exists (select 1 from matched_audio where matched_audio.id = video.id)
      -- An expired source publication cannot disprove previously recorded audio.
      or (video.with_audio and not exists (
        select 1 from audio_publications as audio
        where audio.participation_id = video.participation_id
          and audio.started_at >= video.started_at - interval '30 seconds'
          and (video.ended_at is null or audio.started_at <= video.ended_at)
      )) as with_audio
      from ${shareSessions} as video where video.room_id = ${roomId}
    )
    update ${shareSessions} as video
    set with_audio = reconciled.with_audio
    from reconciled
    where video.id = reconciled.id and video.with_audio is distinct from reconciled.with_audio
  `);
}
