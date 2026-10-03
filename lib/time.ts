export const TZ = "Africa/Lagos";

export function lagosDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

export function lagosTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true
  }).format(d);
}

export function monthBounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");
  const [y,m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(days).padStart(2,"0")}`, days };
}

export function compareHHMM(a: string, b: string) {
  return a.localeCompare(b);
}
