const MINUTE_MS = 60 * 1000;

const diffMinutes = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / MINUTE_MS);

export function formatRelativeTime(iso: string): string {
  const diffMins = diffMinutes(iso);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ago`;
}

export function formatShortRelativeTime(iso: string): string {
  const diffMins = diffMinutes(iso);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h`;
}

export function formatFeedFreshness(iso: string): string {
  const diffMins = diffMinutes(iso);
  if (diffMins < 1) return "Updated just now";
  if (diffMins < 60) return `Updated ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${Math.floor(diffHours / 24)}d ago`;
}
