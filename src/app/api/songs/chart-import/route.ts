import { createHmac, timingSafeEqual } from "node:crypto";
import type { ChartImportStatus, ImportedChordChart } from "@/lib/jam-jam-chart";
import { CHART_LIMIT, chordParts, parseSongKey, shiftSongKey } from "@/lib/song-rehearsal";
import { songEditorAccess } from "@/lib/song-editor-access";

function signingSecret() {
  return process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
}

function signPayload(encoded: string, secret: string) {
  return createHmac("sha256", secret).update("gigspot-chart-import:").update(encoded).digest("hex");
}

function isMalaykord(host: string) {
  return host === "www.malaykord.com" || host === "malaykord.com";
}

function chartUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    const supported = (url.hostname === "tabs.ultimate-guitar.com" && url.pathname.startsWith("/tab/")) ||
      (isMalaykord(url.hostname) && /^\/\d{4}\/\d{2}\/[a-z0-9][a-z0-9-]*\.html$/i.test(url.pathname));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !supported
    ) {
      return null;
    }
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

async function fetchChartPage(initialUrl: string, signal: AbortSignal) {
  let url = initialUrl;
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
      redirect: "manual",
      signal,
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url };

    await response.body?.cancel();
    const location = response.headers.get("Location");
    const nextUrl = location && chartUrl(new URL(location, url).href);
    if (!nextUrl) throw new Error("Unsupported chart redirect");
    url = nextUrl;
  }
  throw new Error("Too many chart redirects");
}

async function readChartPage(response: Response) {
  const mediaType = response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  const maxBytes = 2 * 1024 * 1024;
  if (!response.body || (mediaType !== "text/html" && mediaType !== "application/xhtml+xml") ||
      Number(response.headers.get("Content-Length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Unsupported chart response");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return html + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("Chart page is too large");
      }
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;|&#160;|\u00a0/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");
}

function cleanLabel(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[\r\n{}\[\]]/g, " ").trim().slice(0, 191)
    : "";
}

function extractDivByClass(html: string, classPattern: RegExp): string | null {
  const openTagRegex = /<div\b[^>]*>/gi;
  let openMatch: RegExpExecArray | null;

  while ((openMatch = openTagRegex.exec(html)) !== null) {
    const openTag = openMatch[0];
    const classMatch = openTag.match(/\bclass=["']([^"']+)["']/i);
    if (!classMatch || !classPattern.test(classMatch[1])) continue;
    if (openTag.endsWith("/>")) continue;

    const contentStart = openMatch.index + openTag.length;
    const divRegex = /<\/?div\b[^>]*>/gi;
    divRegex.lastIndex = contentStart;

    let depth = 1;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = divRegex.exec(html)) !== null) {
      const tag = tagMatch[0];
      if (tag.startsWith("</")) {
        depth--;
        if (depth === 0) {
          return html.slice(contentStart, tagMatch.index);
        }
      } else if (!tag.endsWith("/>")) {
        depth++;
      }
    }
  }

  return null;
}

function htmlToPlainText(fragment: string): string {
  const cleaned = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<ins[\s\S]*?<\/ins>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6]|pre|blockquote)>/gi, "\n")
    .replace(/<\/(?:td|th)>/gi, " ");

  return decodeHtmlEntities(cleaned.replace(/<[^>]+>/g, ""));
}

function formatSectionHeaders(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const bracketMatch = trimmed.match(/^\[([^\[\]]+)\]$/);
      if (bracketMatch) {
        const inner = bracketMatch[1].trim();
        if (!/^(?:N|N\.?C\.?)$/i.test(inner) && !chordParts(inner)) {
          return `{comment: ${cleanLabel(inner)}}`;
        }
      }
      return line;
    })
    .join("\n");
}

function convertLineToChords(line: string, allowLowercaseAccidentals = false): string | null {
  const tokens = line.trim().split(/\s+/);
  if (!tokens.length) return null;

  let chordCount = 0;
  const converted: string[] = [];

  for (const tok of tokens) {
    if (/^[-–—|/•·]+$/.test(tok)) {
      converted.push(tok);
      continue;
    }

    const match = tok.match(/^(\(*)([^\s().]+?)(\.*)(\)*)$/);
    if (!match) return null;

    const [, openParen, written, dots, closeParen] = match;
    const core = allowLowercaseAccidentals ? written.replace(/^[a-g](?=[#♯b♭])/, (note) => note.toUpperCase()) : written;
    if (/^(?:N|N\.?C\.?)$/i.test(core)) {
      chordCount++;
      converted.push(`${openParen}[N.C.]${dots}${closeParen}`);
    } else if (chordParts(core)) {
      chordCount++;
      converted.push(`${openParen}[${core}]${dots}${closeParen}`);
    } else {
      return null;
    }
  }

  return chordCount > 0 ? converted.join(" ") : null;
}

const SECTION_HEADING_PATTERN =
  /^(Intro|Verse(?:\s*\d+)?|Pre-?Chorus|Chorus|Korus|Bridge|Solo|Interlude|Outro|Ending|Coda)\s*:?\s*(.*)$/i;

function convertPlainTabToChart(
  rawText: string,
  rawTitle: string,
  rawArtist = "",
  allowLowercaseAccidentals = false,
): ImportedChordChart | null {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const outputLines: string[] = [];
  let detectedCapo: number | null = null;
  let detectedKey = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      outputLines.push("");
      continue;
    }

    // Check inline metadata lines like "Capo: 2" or "Key: Am"
    const capoMatch = trimmed.match(/^capo\s*:?\s*(?:fret\s*)?(\d{1,2})\b/i);
    if (capoMatch && detectedCapo === null) {
      const n = Number(capoMatch[1]);
      if (n >= 0 && n <= 24) detectedCapo = n;
      continue;
    }

    const keyMetaMatch = trimmed.match(/^(?:key|nada\s*dasar)\s*:\s*([A-G][#b]?\s*(?:m|min|minor|maj|major)?)\b/i);
    if (keyMetaMatch && !detectedKey) {
      detectedKey = parseSongKey(keyMetaMatch[1])?.name ?? "";
      continue;
    }

    // Handle "Intro : Am - Dm - G - C" or standalone "Chorus :"
    const sectionMatch = trimmed.match(SECTION_HEADING_PATTERN);
    if (sectionMatch) {
      const heading = cleanLabel(sectionMatch[1]);
      const rest = sectionMatch[2].trim();
      if (!rest) {
        outputLines.push(`{comment: ${heading}}`);
        continue;
      }
      const inlineChords = convertLineToChords(rest, allowLowercaseAccidentals);
      if (inlineChords) {
        outputLines.push(`{comment: ${heading}}`);
        outputLines.push(inlineChords);
        continue;
      }
    }

    // Convert chord-only lines while preserving spacing/separators
    const chordLine = convertLineToChords(line, allowLowercaseAccidentals);
    if (chordLine) {
      outputLines.push(chordLine);
      continue;
    }

    outputLines.push(line);
  }

  let chart = formatSectionHeaders(outputLines.join("\n"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!chart || !/\[[A-G]/.test(chart)) return null;
  if (chart.length > CHART_LIMIT) {
    chart = chart.slice(0, CHART_LIMIT).trim();
  }

  // Parse "Artist - Song Title" if artist isn't already known
  let title = cleanLabel(rawTitle);
  let artist = cleanLabel(rawArtist);
  if (!artist && title.includes(" - ")) {
    const [left, ...right] = title.split(" - ");
    artist = cleanLabel(left);
    title = cleanLabel(right.join(" - "));
  }

  const key = detectedKey && detectedCapo ? shiftSongKey(detectedKey, -detectedCapo) : detectedKey;

  return {
    title,
    artist,
    key,
    capo: detectedCapo,
    chart,
  };
}

function parseUltimateGuitarHtml(html: string): ImportedChordChart | null {
  const storeDivMatch = html.match(/<div[^>]*\bjs-store\b[^>]*>/i);
  if (!storeDivMatch) return null;

  const contentAttrMatch = storeDivMatch[0].match(/\bdata-content=["']([^"']+)["']/i);
  if (!contentAttrMatch) return null;

  try {
    const rawJson = decodeHtmlEntities(contentAttrMatch[1]);
    const parsed = JSON.parse(rawJson);
    const pageData = parsed?.store?.page?.data;
    const tab = pageData?.tab;
    const rawContent: unknown = pageData?.tab_view?.wiki_tab?.content;

    if (typeof rawContent !== "string" || !rawContent.trim()) return null;

    let chart = rawContent
      .replace(/\r\n/g, "\n")
      .replace(/\[\/?tab\]/gi, "")
      .replace(/\[ch\](.*?)\[\/ch\]/gi, (_, rawChord: string) => {
        const symbol = rawChord.trim();
        if (/^(?:N|N\.?C\.?)$/i.test(symbol)) return "[N.C.]";
        return chordParts(symbol) ? `[${symbol}]` : symbol;
      });

    chart = formatSectionHeaders(chart).trim();
    if (!chart || !/\[[A-G]/.test(chart)) return null;
    if (chart.length > CHART_LIMIT) {
      chart = chart.slice(0, CHART_LIMIT).trim();
    }

    const rawCapo = pageData?.tab_view?.meta?.capo ?? tab?.capo;
    const parsedCapo =
      typeof rawCapo === "string" && /^\d{1,2}$/.test(rawCapo.trim())
        ? Number(rawCapo.trim())
        : rawCapo;
    const capo =
      typeof parsedCapo === "number" && Number.isInteger(parsedCapo) && parsedCapo >= 0 && parsedCapo <= 24
        ? parsedCapo
        : null;
    const concertKey = parseSongKey(cleanLabel(tab?.tonality_name))?.name ?? "";
    const key = concertKey && capo ? shiftSongKey(concertKey, -capo) : concertKey;

    return {
      title: cleanLabel(tab?.song_name),
      artist: cleanLabel(tab?.artist_name),
      key,
      capo,
      chart,
    };
  } catch {
    return null;
  }
}

function parseGenericWebPage(html: string, malaykord = false): ImportedChordChart | null {
  const postTitleMatch = html.match(
    /<h[1-3][^>]*class=["'][^"']*\b(?:post-title|entry-title)\b[^"']*["'][^>]*>([\s\S]*?)<\/h[1-3]>/i
  );
  const docTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawHeading = postTitleMatch
    ? htmlToPlainText(postTitleMatch[1]).trim()
    : docTitleMatch
      ? decodeHtmlEntities(docTitleMatch[1]).trim()
      : "";

  const cleanedTitle = rawHeading
    .replace(/\s*[-|]\s*malaykord.*$/i, "")
    .replace(/\s*(?:kunci gitar|lirik\s*(?:&|dan)\s*chord|chords?|tabs?)\s*$/i, "")
    .replace(/^chord\s+/i, "")
    .trim();

  if (malaykord) {
    const chartBody = html.match(/<span\b[^>]*\bid=["']test1["'][^>]*>([\s\S]*?)<\/span>/i);
    if (chartBody) return convertPlainTabToChart(htmlToPlainText(chartBody[1]), cleanedTitle, "", true);
    const postBody = extractDivByClass(html, /\bpost-body\b/i);
    return postBody ? convertPlainTabToChart(htmlToPlainText(postBody), cleanedTitle, "", true) : null;
  }

  // Prefer Blogger / WordPress article body, then <pre> blocks, then full page fallback
  const postBodyHtml = extractDivByClass(html, /\b(?:post-body|entry-content|td-post-content|the-content)\b/i);
  if (postBodyHtml) {
    const bodyText = htmlToPlainText(postBodyHtml);
    const parsedBody = convertPlainTabToChart(bodyText, cleanedTitle);
    if (parsedBody) return parsedBody;
  }

  const preMatches = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
  const rawSource = preMatches.length
    ? preMatches.map((m) => m[1]).join("\n\n")
    : html;

  return convertPlainTabToChart(htmlToPlainText(rawSource), cleanedTitle);
}

export async function POST(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const secret = signingSecret();
  if (!secret) return Response.json({ error: "Chart link import is unavailable." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const url = chartUrl(body?.url);
  if (!url) {
    return Response.json({ error: "Paste an HTTPS chart link from Ultimate Guitar or Malaykord, or paste the chart text." }, { status: 400 });
  }

  const requestId = body?.requestId;
  if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) {
    return Response.json({ error: "Start a new chart import." }, { status: 400 });
  }

  const payload = JSON.stringify({
    url,
    userId: access.userId,
    bandId: access.bandId,
    exp: Date.now() + 60 * 60 * 1000,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signPayload(encoded, secret);

  return Response.json({ job: `${encoded}.${sig}` }, { status: 202 });
}

export async function GET(req: Request) {
  const access = await songEditorAccess();
  if (access.error) return access.error;
  const secret = signingSecret();
  if (!secret) return Response.json({ error: "Chart link import is unavailable." }, { status: 503 });

  const token = new URL(req.url).searchParams.get("job");
  const parts = token?.split(".");
  if (!parts || parts.length !== 2 || !/^[\w-]{1,12000}$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) {
    return Response.json({ error: "The chart import link is invalid or expired." }, { status: 404 });
  }

  const [encoded, sig] = parts;
  const expectedSig = signPayload(encoded, secret);
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return Response.json({ error: "The chart import link is invalid or expired." }, { status: 404 });
  }

  let parsedJob: { url?: string; userId?: string; bandId?: string; exp?: number };
  try {
    parsedJob = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return Response.json({ error: "The chart import link is invalid or expired." }, { status: 404 });
  }

  const url = chartUrl(parsedJob.url);
  if (
    !url ||
    typeof parsedJob.exp !== "number" ||
    parsedJob.exp < Date.now() ||
    parsedJob.userId !== access.userId ||
    parsedJob.bandId !== access.bandId
  ) {
    return Response.json({ error: "The chart import expired. Start a new import." }, { status: 404 });
  }

  try {
    const { response, url: finalUrl } = await fetchChartPage(url, AbortSignal.any([req.signal, AbortSignal.timeout(12000)]));

    if (!response.ok) {
      await response.body?.cancel();
      return Response.json(
        {
          status: "failed",
          message: `Could not load that page (HTTP ${response.status}). Try another link or paste the chart text.`,
        } satisfies ChartImportStatus
      );
    }

    const html = await readChartPage(response);
    const chart = isMalaykord(new URL(finalUrl).hostname)
      ? parseGenericWebPage(html, true)
      : parseUltimateGuitarHtml(html) ?? parseGenericWebPage(html);

    return Response.json(
      chart
        ? ({ status: "complete", charts: [chart] } satisfies ChartImportStatus)
        : ({
          status: "failed",
          message: "No playable chord chart was found on that page. Try pasting the chart text directly.",
        } satisfies ChartImportStatus)
    );
  } catch {
    return Response.json(
      {
        status: "failed",
        message: "Couldn’t fetch that chord page right now. Check the link or paste the chart text.",
      } satisfies ChartImportStatus
    );
  }
}
