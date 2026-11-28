export function readGigPayment(description: string) {
  const match = /^\[GIG_PAYMENT:([\w-]+)\]\s*/.exec(description);
  if (!match) return null;
  const descriptionText = description.slice(match[0].length);
  return {
    gigId: match[1],
    description: descriptionText,
    title: descriptionText.replace(/^Payment received for gig:\s*/i, "") || "Gig Payment",
  };
}
