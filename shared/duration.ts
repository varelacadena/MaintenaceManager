/** Live clock. Hours roll into days once a task runs 24 hours or longer. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const clock = `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** Logged labor. 24 hours become 1 day, with leftover hours and minutes. */
export function formatLoggedMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes || 0));
  const days = Math.floor(safe / (60 * 24));
  const hours = Math.floor((safe % (60 * 24)) / 60);
  const minutes = safe % 60;
  if (days > 0) {
    const parts = [`${days}d`];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  }
  return `${hours}h ${minutes}m`;
}
