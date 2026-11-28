import { StageReader } from "./stage-reader";

export default async function StagePage({ params, searchParams }: {
  params: Promise<{ gigId: string; setlistId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ gigId, setlistId }, { from }] = await Promise.all([params, searchParams]);
  return <StageReader key={`${gigId}/${setlistId}`} gigId={gigId} setlistId={setlistId} fromGig={from === "gig"} />;
}
