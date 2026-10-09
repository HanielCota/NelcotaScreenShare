import { logBrowserWarning } from "@/lib/telemetry.client";
/** Local microphone preview uses browser APIs; the call SDK loads only when joining. */
export async function captureMicrophone(options: MediaTrackConstraints): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: options });
  const track = stream.getAudioTracks()[0];
  if (track) return track;
  for (const unused of stream.getTracks()) unused.stop();
  throw new Error("The microphone returned no audio track.");
}

/** Frequency RMS, with the same sensitivity as the call SDK's preview analyser. */
export function createMicrophoneAnalyser(track: MediaStreamTrack) {
  const context = new AudioContext();
  try {
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.minDecibels = -100;
    analyser.maxDecibels = -80;
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    void resumeContext(context);
    return {
      calculateVolume() {
        analyser.getByteFrequencyData(values);
        let sum = 0;
        for (const value of values) sum += (value / 255) ** 2;
        return Math.sqrt(sum / values.length);
      },
      async cleanup() {
        source.disconnect();
        analyser.disconnect();
        await context.close();
      },
    };
  } catch (error) {
    void closeContext(context);
    throw error;
  }
}

async function resumeContext(context: AudioContext) {
  try {
    await context.resume();
  } catch (error) {
    logBrowserWarning("Could not resume the microphone preview", error);
  }
}

async function closeContext(context: AudioContext) {
  try {
    await context.close();
  } catch (error) {
    logBrowserWarning("Could not close the microphone preview", error);
  }
}
