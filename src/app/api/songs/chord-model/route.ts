import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { songEditorAccess } from "@/lib/song-editor-access";

// Jam Jam assets v4. Keep the weights out of Git and production artifacts.
const modelSha256 = "f186d16926664e3e8d002dc57f325605bdd5f338c4c505aadb4cf7b420f55d6d";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const access = await songEditorAccess();
  if (access.error) return access.error;

  const bytes = await readFile(join(process.cwd(), ".local-models", "btc_model_170_ft.onnx")).catch(() => null);
  if (!bytes || createHash("sha256").update(bytes).digest("hex") !== modelSha256) {
    return Response.json({ error: "The local Jam Jam v4 model is missing or does not match its published checksum." }, { status: 503 });
  }
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" },
  });
}
