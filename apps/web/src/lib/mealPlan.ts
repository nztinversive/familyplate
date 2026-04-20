export function getCurrentWeekStartDate() {
  const today = new Date();
  const current = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const day = current.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + diff);
  return current.toISOString().slice(0, 10);
}

export function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const rest = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${day}, ${rest}`;
}

export function formatWeekRange(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return weekStartDate;

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${format(start)} - ${format(end)}`;
}

export function formatIngredientAmount(quantity: number, unit: string) {
  return `${quantity} ${unit}`;
}
