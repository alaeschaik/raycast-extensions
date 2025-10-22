import type { SeriesLookup, Series, Episode } from "./types";

export function formatSeriesTitle(series: SeriesLookup | Series): string {
  return `${series.title} (${series.year})`;
}

export function formatEpisodeTitle(episode: Episode): string {
  return `S${episode.seasonNumber.toString().padStart(2, "0")}E${episode.episodeNumber.toString().padStart(2, "0")} - ${episode.title}`;
}

export function formatFileSize(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
  return `${size} ${sizes[i]}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export function formatAirDate(dateString?: string): string {
  if (!dateString) return "Not available";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatAirDateTime(dateString?: string): string {
  if (!dateString) return "Not available";

  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getSeriesPoster(series: SeriesLookup | Series): string | undefined {
  const posterImage = series.images?.find(img => img.coverType === "poster");
  return posterImage?.remoteUrl || posterImage?.url;
}

export function getSeriesBanner(series: SeriesLookup | Series): string | undefined {
  const bannerImage = series.images?.find(img => img.coverType === "banner");
  return bannerImage?.remoteUrl || bannerImage?.url;
}

export function getRatingDisplay(series: SeriesLookup | Series): string {
  const ratings = series.ratings;
  if (!ratings || !ratings.value) return "";

  return `★ ${ratings.value.toFixed(1)}/10 (${ratings.votes.toLocaleString()} votes)`;
}

export function getSeriesStatus(series: Series): string {
  if (!series.monitored) {
    return "Unmonitored";
  }

  switch (series.status) {
    case "continuing":
      return "Continuing";
    case "ended":
      return "Ended";
    case "upcoming":
      return "Upcoming";
    case "deleted":
      return "Deleted";
    default:
      return "Unknown";
  }
}

export function getEpisodeStatus(episode: Episode): string {
  if (episode.hasFile) {
    return "Downloaded";
  }

  if (!episode.monitored) {
    return "Unmonitored";
  }

  const airDate = episode.airDateUtc ? new Date(episode.airDateUtc) : null;
  const now = new Date();

  if (airDate && airDate > now) {
    return "Not Aired";
  }

  return "Missing";
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

export function getGenresDisplay(genres: string[]): string {
  if (!genres || genres.length === 0) {
    return "";
  }

  return genres.slice(0, 3).join(", ");
}

export function formatOverview(overview: string): string {
  if (!overview || overview.trim() === "") {
    return "No overview available";
  }

  // Split into sentences and add line breaks for better readability
  const sentences = overview.split(/(?<=[.!?])\s+/);

  // Group sentences into paragraphs (every 2-3 sentences)
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const paragraph = sentences.slice(i, i + 2).join(" ");
    paragraphs.push(paragraph);
  }

  // Join paragraphs with double line breaks
  return paragraphs.join("\n\n");
}

export function getDownloadProgress(item: { size: number; sizeleft: number }): number {
  if (item.size === 0) return 0;
  const progress = ((item.size - item.sizeleft) / item.size) * 100;
  return Math.round(progress * 100) / 100;
}

export function formatTimeLeft(timeleft?: string): string {
  if (!timeleft) return "Unknown";

  // Parse the timeleft format (e.g., "00:15:30")
  const parts = timeleft.split(":");
  if (parts.length !== 3) return timeleft;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  const result: string[] = [];
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);
  if (hours === 0 && seconds > 0) result.push(`${seconds}s`);

  return result.length > 0 ? result.join(" ") : "< 1m";
}

export function getQueueStatusIcon(status: string, trackedStatus?: string): string {
  if (trackedStatus === "warning") return "⚠️";
  if (trackedStatus === "error") return "❌";

  switch (status.toLowerCase()) {
    case "downloading":
      return "⬇️";
    case "paused":
      return "⏸️";
    case "queued":
      return "⏱️";
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "warning":
      return "⚠️";
    default:
      return "⏳";
  }
}

export function getSeriesTypeDisplay(seriesType: string): string {
  switch (seriesType) {
    case "standard":
      return "Standard";
    case "daily":
      return "Daily";
    case "anime":
      return "Anime";
    default:
      return seriesType;
  }
}

export function getSeasonDisplay(seasonNumber: number): string {
  if (seasonNumber === 0) return "Specials";
  return `Season ${seasonNumber}`;
}

export function calculateSeriesProgress(series: Series): number {
  if (!series.statistics) return 0;
  const { episodeFileCount, totalEpisodeCount } = series.statistics;
  if (totalEpisodeCount === 0) return 0;
  return Math.round((episodeFileCount / totalEpisodeCount) * 100);
}
