import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { readJamJamCharts, type ChartImportStatus } from "@/lib/jam-jam-chart";
import { songEditorAccess } from "@/lib/song-editor-access";

const baseUrl = "https://jam-jam.org/api/v1";
const jobIdPattern = /^[\w-]{1,100}$/;

function signedJob(key: string, userId: string, bandId: string, id: string, expires: number) {
  return createHmac("sha256", key).update(JSON.stringify(["jam-jam", userId, bandId, id, expires])).digest("hex");
}

function chartUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/\.$/, "").toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".") ||
        isIP(host) || /\.(?:localhost|local|internal|test|invalid|onion)$/.test(host)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function jamJam(path: string, key: string, request: Request, options?: RequestInit) {
  return fetch(baseUrl + path, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, ...options?.headers },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
  });
}

function providerError(status: number) {
  if (status === 401 || status === 403) {
    return Response.json({ error: "Check that the Jam Jam key is active and has both conversion permissions." }, { status: 422 });
  }
  if (status === 429) {
    return Response.json({ error: "Jam Jam’s limit was reached. Wait and try again, or paste the chart text." }, { status: 429 });
  }
  if (status === 400 || status === 413 || status === 415 || status === 422) {
    return Response.json({ error: "Jam Jam couldn’t read this chart link. Try another link or paste the chart text." }, { status: 422 });
  }
  if (status === 404 || status === 410) {
    return Response.json({ error: "The Jam Jam import is unavailable or expired. Start a new import." }, { status: 404 });
  }
  return Response.json({ error: "Jam Jam is temporarily unavailable." }, { status: 502 });
}

export async function POST(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const key = process.env.JAM_JAM_API_KEY?.trim();
  if (!key) return Response.json({ error: "Add JAM_JAM_API_KEY to your server environment to enable chart links." }, { status: 422 });
  const body = await req.json().catch(() => null);
  const url = chartUrl(body?.url);
  if (!url) return Response.json({ error: "Paste a public chart link starting with https://." }, { status: 400 });
  const requestId = body?.requestId;
  if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) {
    return Response.json({ error: "Start a new chart import." }, { status: 400 });
  }

  try {
    const idempotency = createHmac("sha256", key).update(JSON.stringify([access.userId, access.bandId, url, requestId])).digest("hex");
    const response = await jamJam("/jobs", key, req, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotency },
      body: JSON.stringify({ url, inputFormat: "page-link", output: "songbook", deliver: "download" }),
    });
    if (!response.ok) return providerError(response.status);
    const { id } = await response.json();
    if (typeof id !== "string" || !jobIdPattern.test(id)) return providerError(502);
    const expires = Date.now() + 60 * 60 * 1000;
    const proof = signedJob(key, access.userId, access.bandId, id, expires);
    return Response.json({ job: `${id}.${expires}.${proof}` }, { status: 202 });
  } catch {
    return providerError(502);
  }
}

export async function GET(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const key = process.env.JAM_JAM_API_KEY?.trim();
  const token = new URL(req.url).searchParams.get("job");
  const match = token?.match(/^([\w-]{1,100})\.(\d{13})\.([a-f0-9]{64})$/);
  const expires = Number(match?.[2]);
  if (!key || !match || expires < Date.now() ||
      !timingSafeEqual(Buffer.from(match[3]), Buffer.from(signedJob(key, access.userId, access.bandId, match[1], expires)))) {
    return providerError(404);
  }

  try {
    const path = `/jobs/${match[1]}`;
    const response = await jamJam(path, key, req);
    if (!response.ok) return providerError(response.status);
    const { phase } = await response.json();
    if (phase === "queued" || phase === "running") {
      const seconds = Number(response.headers.get("Retry-After"));
      return Response.json({ status: "pending", retryAfter: Number.isFinite(seconds) && seconds > 0 ? Math.max(seconds, 2) : 3 } satisfies ChartImportStatus);
    }
    if (phase !== "done") {
      return Response.json({ status: "failed", message: "Jam Jam couldn’t convert this page. Try another chart link." } satisfies ChartImportStatus);
    }
    const result = await jamJam(path + "/result/songbook", key, req);
    if (!result.ok) return providerError(result.status);
    const charts = readJamJamCharts(await result.json());
    return Response.json(charts.length ? { status: "complete", charts } : {
      status: "failed", message: "No playable chord chart was returned for that link.",
    } satisfies ChartImportStatus);
  } catch {
    return providerError(502);
  }
}
