export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStartOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

export function getCurrentWeekStartDate(now = new Date()) {
  return formatLocalDate(getStartOfWeek(now));
}

export function getDisplayedWeekStartDate(
  planWeekStartDate: string | null | undefined,
  selectedWeekStartDate: string | null | undefined,
) {
  return planWeekStartDate ?? selectedWeekStartDate ?? undefined;
}
