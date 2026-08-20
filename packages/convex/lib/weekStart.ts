const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartOfUtcWeek(date: Date) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCHours(12, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

export function resolveWeekStartDate(
  requestedWeekStartDate: string | undefined,
  now = new Date(),
) {
  const weekStartDate =
    requestedWeekStartDate ?? formatUtcDate(getStartOfUtcWeek(now));

  if (!DATE_PATTERN.test(weekStartDate)) {
    throw new Error("Choose a valid Monday for the weekly plan.");
  }

  const weekStart = new Date(`${weekStartDate}T12:00:00.000Z`);
  if (
    Number.isNaN(weekStart.getTime()) ||
    formatUtcDate(weekStart) !== weekStartDate ||
    weekStart.getUTCDay() !== 1
  ) {
    throw new Error("Choose a valid Monday for the weekly plan.");
  }

  return { weekStart, weekStartDate };
}
