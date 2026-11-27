import { RehearsalSession } from "./rehearsal-session";

export default async function RehearsalPage({ params, searchParams }: {
  params: Promise<{ setlistId: string }>;
  searchParams: Promise<{ gigId?: string | string[] }>;
}) {
  const [{ setlistId }, query] = await Promise.all([params, searchParams]);
  const gigId = typeof query.gigId === "string" && query.gigId ? query.gigId : undefined;
  return <RehearsalSession key={JSON.stringify([setlistId, gigId])} id={setlistId} gigId={gigId} />;
}
