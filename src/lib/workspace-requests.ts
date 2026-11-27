export type BandRole = { role: string; bandId?: string; userId?: string };

export class WorkspaceRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function workspaceRequest<T>(url: string, fallback: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error;
    throw new WorkspaceRequestError(
      response.status < 500 && typeof message === "string" ? message : fallback,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export function workspaceMutation<T>(url: string, method: string, body: object, fallback: string) {
  return workspaceRequest<T>(url, fallback, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function workspaceErrorMessage(error: unknown, fallback: string) {
  return error instanceof WorkspaceRequestError ? error.message : fallback;
}

export function matchesSongSearch(song: { title: string; artist: string | null }, query: string) {
  const search = query.trim().toLowerCase();
  return song.title.toLowerCase().includes(search) || (song.artist ?? "").toLowerCase().includes(search);
}
