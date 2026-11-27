import { createHmac, timingSafeEqual } from "node:crypto";
import { AUDIO_LIMIT } from "@/lib/song-rehearsal";
import { songEditorAccess } from "@/lib/song-editor-access";
import { musicDraft, musicRequest, musicStorageUrl } from "@/lib/song-audio";

const audioTypes: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", flac: "audio/flac", ogg: "audio/ogg", aac: "audio/aac",
};

function signature(secret: string, userId: string, bandId: string, id: string, expires: number) {
  return createHmac("sha256", secret).update(JSON.stringify([userId, bandId, id, expires])).digest("hex");
}

export async function POST(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const apiKey = process.env.MUSIC_AI_API_KEY?.trim();
  const workflow = process.env.MUSIC_AI_WORKFLOW?.trim();
  if (!apiKey || !workflow) return Response.json({ error: "Audio analysis is unavailable." }, { status: 422 });
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > AUDIO_LIMIT + 65536) return Response.json({ error: "Choose a recording up to 20 MB." }, { status: 413 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const extension = audio instanceof File ? audio.name.match(/\.(mp3|wav|m4a|flac|ogg|aac)$/i)?.[1]?.toLowerCase() : undefined;
  if (!(audio instanceof File) || !audio.size || audio.size > AUDIO_LIMIT || !extension) {
    return Response.json({ error: "Choose an MP3, WAV, M4A, FLAC, OGG, or AAC file up to 20 MB." }, { status: 400 });
  }

  try {
    const urls = await musicRequest<{ uploadUrl: string; downloadUrl: string }>("upload", apiKey);
    const download = musicStorageUrl(urls.downloadUrl).href;
    const upload = await fetch(musicStorageUrl(urls.uploadUrl), {
      method: "PUT",
      headers: { "Content-Type": audioTypes[extension] },
      body: await audio.arrayBuffer(),
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    if (!upload.ok) throw new Error("Recording upload failed");
    const { id } = await musicRequest<{ id: string }>("job", apiKey, {
      name: "GigSpot Rehearsal Analysis",
      workflow,
      params: { [process.env.MUSIC_AI_INPUT_NAME?.trim() || "inputFileUrl"]: download },
    });
    if (!id || !/^[\w-]{1,100}$/.test(id)) throw new Error("Invalid job id");
    const expires = Date.now() + 2 * 60 * 60 * 1000;
    const proof = signature(apiKey, access.userId, access.bandId, id, expires);
    return Response.json({ job: `${id}.${expires}.${proof}` }, { status: 202 });
  } catch {
    return Response.json({ error: "Could not start audio analysis." }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const apiKey = process.env.MUSIC_AI_API_KEY?.trim();
  const job = new URL(req.url).searchParams.get("job") ?? "";
  const match = job.match(/^([\w-]{1,100})\.(\d{13})\.([a-f0-9]{64})$/);
  const expires = Number(match?.[2]);
  if (!apiKey || !match || expires < Date.now() ||
    !timingSafeEqual(Buffer.from(match[3]), Buffer.from(signature(apiKey, access.userId, access.bandId, match[1], expires)))) {
    return Response.json({ error: "This analysis is unavailable or expired." }, { status: 404 });
  }

  try {
    const info = await musicRequest<{ status: string; result?: unknown }>(`job/${match[1]}`, apiKey);
    if (info.status === "FAILED" || info.status === "CANCELED" || info.status === "CANCELLED") {
      return Response.json({ status: "failed" });
    }
    if (info.status === "SUCCEEDED") {
      return Response.json({ status: "complete", draft: await musicDraft(info.result) });
    }
    return Response.json({ status: "pending" });
  } catch {
    return Response.json({ error: "Could not check audio analysis." }, { status: 502 });
  }
}
