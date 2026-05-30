import type { ErrorEvent } from "@sentry/nextjs";

function eventText(event: ErrorEvent) {
  const frameText =
    event.exception?.values
      ?.flatMap((value) => value.stacktrace?.frames ?? [])
      .flatMap((frame) => [
        frame.filename,
        frame.abs_path,
        frame.module,
        frame.function,
      ])
      .filter(Boolean)
      .join(" ") ?? "";

  const exceptionText =
    event.exception?.values
      ?.flatMap((value) => [value.type, value.value])
      .filter(Boolean)
      .join(" ") ?? "";

  return [event.message, exceptionText, frameText, event.request?.url]
    .filter(Boolean)
    .join(" ");
}

function isLocalDevelopmentNoise(event: ErrorEvent) {
  const text = eventText(event);

  return (
    /localhost|127\.0\.0\.1|\/Users\/noahthies\//i.test(text) ||
    /next-devtools\/userspace/i.test(text) ||
    /React Client Manifest.*React Server Components bundler/i.test(text)
  );
}

export function beforeSend(event: ErrorEvent) {
  delete event.request?.cookies;
  delete event.request?.headers;

  if (isLocalDevelopmentNoise(event)) {
    return null;
  }

  return event;
}
