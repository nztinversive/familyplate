type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

function isShareCanceled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function shareOrCopy(payload: SharePayload) {
  const textToCopy = payload.url
    ? `${payload.text}\n\n${payload.url}`
    : payload.text;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(payload);
      return "native_share" as const;
    } catch (error) {
      if (isShareCanceled(error)) return "canceled" as const;
      // Share-sheet failures still fall back to clipboard.
    }
  }

  await navigator.clipboard.writeText(textToCopy);
  return "clipboard" as const;
}
