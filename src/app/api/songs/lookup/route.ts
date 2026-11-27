import { bpmValue, parseSongKey, type RecordingMatch } from "@/lib/song-rehearsal";
import { songEditorAccess } from "@/lib/song-editor-access";

type ITunesTrack = {
  kind: string; trackId: number; trackName: string; artistName: string;
  collectionName?: string; releaseDate?: string; trackTimeMillis?: number;
};
type GetSongTrack = {
  id: string; title: string; artist?: { name: string }; album?: { title: string; year?: string | number };
  key_of?: string; tempo?: string | number;
};

function normalized(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function compact(value: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 191);
}

async function searchItunes(title: string, artist: string, signal: AbortSignal): Promise<RecordingMatch[]> {
  const url = new URL("https://itunes.apple.com/search");
  const country = process.env.SONG_CATALOG_COUNTRY?.trim().toUpperCase() || "MY";
  url.search = new URLSearchParams({
    term: [title, artist].filter(Boolean).join(" "), country: /^[A-Z]{2}$/.test(country) ? country : "MY",
    media: "music", entity: "song", limit: "20",
  }).toString();
  const response = await fetch(url, { next: { revalidate: 3600 }, signal });
  if (!response.ok) throw new Error("Catalog request failed");
  const body: { results?: ITunesTrack[] } = await response.json();
  if (!Array.isArray(body.results)) throw new Error("Invalid catalog response");

  const query = normalized(title);
  const performer = normalized(artist);
  const matches: RecordingMatch[] = body.results.flatMap((track) => {
    if (track?.kind !== "song" || !Number.isSafeInteger(track.trackId) ||
        typeof track.trackName !== "string" || typeof track.artistName !== "string") return [];
    const name = normalized(track.trackName);
    if (!query.split(" ").every((word) => name.includes(word)) || (performer && !normalized(track.artistName).includes(performer))) return [];
    const length = track.trackTimeMillis ?? 0;
    return [{
      source: "itunes" as const, id: String(track.trackId), title: track.trackName.slice(0, 191),
      artist: track.artistName.slice(0, 191), album: track.collectionName?.slice(0, 191) ?? "",
      year: track.releaseDate?.match(/^\d{4}(?=-)/)?.[0] ?? "",
      duration: length >= 1000 && length <= 86400000 ? Math.round(length / 1000) : null,
      originalKey: "", originalTempo: null,
    }];
  });
  return matches.sort((a, b) => Number(normalized(b.title) === query) - Number(normalized(a.title) === query)).slice(0, 8);
}

async function searchGetSong(title: string, artist: string, apiKey: string, signal: AbortSignal): Promise<RecordingMatch[]> {
  const url = new URL("https://api.getsong.co/search/");
  url.search = new URLSearchParams({
    type: artist ? "both" : "song",
    lookup: artist ? "song:" + title + " artist:" + artist : title,
    limit: "10",
  }).toString();
  const response = await fetch(url, { headers: { "X-API-KEY": apiKey }, signal });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Key and tempo request failed");
  const body: { search?: GetSongTrack[] } = await response.json();
  if (!Array.isArray(body.search)) return [];
  return body.search.flatMap((song) =>
    typeof song?.id === "string" && typeof song.title === "string" && typeof song.artist?.name === "string" ? [{
      source: "getsongbpm" as const, id: song.id, title: song.title.slice(0, 191),
      artist: song.artist.name.slice(0, 191), album: song.album?.title?.slice(0, 191) ?? "",
      year: String(song.album?.year ?? "").match(/^\d{4}$/)?.[0] ?? "", duration: null,
      originalKey: parseSongKey(song.key_of)?.name ?? "", originalTempo: bpmValue(song.tempo),
    }] : [],
  );
}

function versionFlags(value: string) {
  const flags = normalized(value).match(/\b(live|acoustic|demo|instrumental|remix|karaoke|reimagined|re recorded|rerecorded)\b/g);
  return [...new Set(flags)].sort().join(",");
}

function recordingMusic(matches: RecordingMatch[], title: string, artist: string, album: string) {
  const exact = matches.filter((match) => normalized(match.title) === normalized(title) &&
    normalized(match.artist) === normalized(artist) &&
    versionFlags(match.title + " " + match.album) === versionFlags(title + " " + album));
  const sameAlbum = album ? exact.filter((match) => normalized(match.album) === normalized(album)) : [];
  const candidates = sameAlbum.length ? sameAlbum : exact;
  const keys = new Set(candidates.map((match) => match.originalKey).filter(Boolean));
  const tempos = new Set(candidates.map((match) => match.originalTempo).filter((value) => value !== null));
  return {
    originalKey: keys.size === 1 ? [...keys][0] : "",
    originalTempo: tempos.size === 1 ? [...tempos][0] : null,
  };
}

type KeyTempo = ReturnType<typeof recordingMusic> & { pending?: boolean };
const unknownMusic: KeyTempo = { originalKey: "", originalTempo: null };

async function freqBlogMusic(
  recording: { title: string; artist: string; album: string; itunesId: string; duration: number },
  apiKey: string,
  signal: AbortSignal,
): Promise<KeyTempo> {
  const { title, artist, album, itunesId, duration } = recording;
  type Track = {
    track_name?: string; artist_name?: string; album_name?: string; itunes_track_id?: string | number;
    duration_ms?: number; key?: string; bpm?: number;
  };
  async function lookup(track: string): Promise<Track | "pending" | null> {
    const url = new URL("https://api.freqblog.com/lookup");
    url.search = new URLSearchParams({ track, artist, wait: "0" }).toString();
    const response = await fetch(url, { headers: { "X-Api-Key": apiKey }, signal, cache: "no-store", redirect: "error" });
    if (response.status === 202) return "pending";
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("FreqBlog lookup failed");
    return response.json();
  }

  let track = await lookup(title);
  const shortTitle = title.replace(/\s*[([](?:feat\.?|ft\.?|featuring)\s+[^)\]]+[)\]]$/i, "").trim();
  if (track && track !== "pending" && itunesId && String(track.itunes_track_id) !== itunesId && shortTitle && shortTitle !== title) {
    // The shorter query can resolve the exact iTunes release instead of a reissue.
    const alternative = await lookup(shortTitle).catch(() => null);
    if (alternative && alternative !== "pending" && String(alternative.itunes_track_id) === itunesId &&
        typeof alternative.track_name === "string" && normalized(alternative.track_name) === normalized(title) &&
        typeof alternative.artist_name === "string" && normalized(alternative.artist_name) === normalized(artist)) {
      track = alternative;
    }
  }
  if (track === "pending") return { ...unknownMusic, pending: true };
  if (typeof track?.track_name !== "string" || typeof track.artist_name !== "string" ||
      normalized(track.track_name) !== normalized(title) || normalized(track.artist_name) !== normalized(artist)) {
    return unknownMusic;
  }

  const exactId = Boolean(itunesId && String(track.itunes_track_id) === itunesId);
  const matchedAlbum = Boolean(album && normalized(track.album_name ?? "") === normalized(album));
  const matchedDuration = duration > 0 && typeof track.duration_ms === "number" &&
    Math.abs(track.duration_ms - duration * 1000) <= 3000;
  if (!exactId && !(matchedAlbum && matchedDuration)) return unknownMusic;

  return {
    originalKey: parseSongKey(typeof track.key === "string" ? track.key.replace(/-(?=major$|minor$)/i, " ") : "")?.name ?? "",
    originalTempo: bpmValue(track.bpm),
  };
}

export async function GET(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const query = new URL(req.url).searchParams;
  const apiKey = process.env.GETSONGBPM_API_KEY?.trim();
  const freqBlogKey = process.env.FREQBLOG_API_KEY?.trim();
  if (!query.has("title")) return Response.json({
    keyTempo: Boolean(apiKey || freqBlogKey),
    freqBlog: Boolean(freqBlogKey),
    getSongBpm: Boolean(apiKey),
    jamJam: Boolean(process.env.JAM_JAM_API_KEY?.trim()),
    audio: Boolean(process.env.MUSIC_AI_API_KEY?.trim() && process.env.MUSIC_AI_WORKFLOW?.trim()),
  });

  const title = compact(query.get("title"));
  const artist = compact(query.get("artist"));
  const album = compact(query.get("album"));
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(5500)]);

  if (query.get("details") === "1") {
    if (!normalized(title) || !normalized(artist)) return Response.json(unknownMusic);
    const duration = Number(query.get("duration"));
    const itunesId = query.get("itunesId") ?? "";
    const recording = { title, artist, album, duration, itunesId: /^\d{1,20}$/.test(itunesId) ? itunesId : "" };
    const providers: Promise<KeyTempo>[] = [];
    if (freqBlogKey) providers.push(freqBlogMusic(recording, freqBlogKey, signal));
    if (apiKey) providers.push(searchGetSong(title, artist, apiKey, signal).then((matches) => recordingMusic(matches, title, artist, album)));
    const results = await Promise.allSettled(providers);
    const completed = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const match = completed.find((result) => result.originalKey && result.originalTempo)
      ?? completed.find((result) => result.originalKey || result.originalTempo)
      ?? completed.find((result) => result.pending) ?? completed[0];
    if (match || !providers.length) return Response.json(match ?? unknownMusic);
    return Response.json({ error: "Could not look up the key and BPM. You can still save this recording." }, { status: 502 });
  }

  if (!normalized(title)) return Response.json({ matches: [] });
  let catalogAvailable = true;
  try {
    const matches = await searchItunes(title, artist, signal);
    if (matches.length) return Response.json({ matches });
  } catch {
    catalogAvailable = false;
  }
  if (apiKey && !req.signal.aborted) {
    try {
      const matches = await searchGetSong(title, artist, apiKey, AbortSignal.any([req.signal, AbortSignal.timeout(4500)]));
      if (matches.length) return Response.json({ matches: matches.slice(0, 8) });
    } catch {
      // The main catalog's status determines the empty or unavailable state.
    }
  }
  return catalogAvailable ? Response.json({ matches: [] })
    : Response.json({ error: "Recording search is unavailable. You can still add the song manually." }, { status: 502 });
}
