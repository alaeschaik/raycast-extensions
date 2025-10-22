import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import type {
  Series,
  Episode,
  QueueItem,
  CalendarEpisode,
  HealthCheck,
  SystemStatus,
  HistoryRecord,
  SeriesLookup,
  SonarrInstance,
  Season,
} from "../types";

interface APIResponse<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
}

export function useSonarrAPI<T>(
  instance: SonarrInstance | null,
  endpoint: string,
  options?: {
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
  },
): APIResponse<T> {
  // Don't execute if instance is not available or invalid
  const shouldExecute = !!(instance?.url && instance?.apiKey) && options?.execute !== false;

  const url = instance?.url ? `${instance.url}/api/v3${endpoint}` : "";

  const { data, error, isLoading, mutate } = useFetch<T>(url, {
    headers: {
      "X-Api-Key": instance?.apiKey || "",
      "Content-Type": "application/json",
    },
    execute: shouldExecute,
    onError: (error) => {
      console.error(`Sonarr API Error (${instance?.name || "Unknown"}):`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Sonarr Error",
        message: `Failed to connect to ${instance?.name || "Sonarr"}: ${error.message}`,
      });
      options?.onError?.(error);
    },
    onData: options?.onData,
  });

  return { data, error, isLoading, mutate };
}

export function useSeries(instance: SonarrInstance | null) {
  return useSonarrAPI<Series[]>(instance, "/series");
}

export function useQueue(instance: SonarrInstance | null) {
  // Include series and episode details in queue response
  return useSonarrAPI<{ records: QueueItem[] }>(instance, "/queue?includeSeries=true&includeEpisode=true");
}

export function useCalendar(instance: SonarrInstance | null, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  // Include series and unmonitored episodes in calendar
  params.set("includeSeries", "true");
  params.set("includeEpisodeFile", "true");
  params.set("includeEpisodeImages", "true");
  params.set("unmonitored", "true");
  const endpoint = `/calendar${params.toString() ? `?${params.toString()}` : ""}`;

  return useSonarrAPI<CalendarEpisode[]>(instance, endpoint);
}

export function useHealth(instance: SonarrInstance | null) {
  return useSonarrAPI<HealthCheck[]>(instance, "/health");
}

export function useSystemStatus(instance: SonarrInstance | null) {
  return useSonarrAPI<SystemStatus>(instance, "/system/status");
}

export function useHistory(instance: SonarrInstance | null, seriesId?: number) {
  const params = new URLSearchParams();
  if (seriesId) params.set("seriesId", seriesId.toString());
  const endpoint = `/history${params.toString() ? `?${params.toString()}` : ""}`;

  return useSonarrAPI<{ records: HistoryRecord[] }>(instance, endpoint);
}

export function useMissingEpisodes(instance: SonarrInstance | null) {
  return useSonarrAPI<{ records: Episode[] }>(instance, "/wanted/missing?includeSeries=true");
}

export async function searchSeries(instance: SonarrInstance | null, query: string): Promise<SeriesLookup[]> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/series/lookup?term=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Series search error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: `Failed to search series: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    return [];
  }
}

export async function addSeries(
  instance: SonarrInstance | null,
  series: SeriesLookup,
  qualityProfileId: number,
  rootFolderPath: string,
  languageProfileId: number,
  seriesType: "standard" | "daily" | "anime",
  seasonFolder: boolean,
  monitored: boolean = true,
  searchOnAdd: boolean = true,
  monitorSeasons?: Season[],
): Promise<Series> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/series`;
    const payload = {
      title: series.title,
      sortTitle: series.sortTitle,
      status: series.status,
      overview: series.overview,
      network: series.network,
      airTime: series.airTime,
      images: series.images,
      seasons: monitorSeasons || series.seasons,
      year: series.year,
      path: `${rootFolderPath}/${series.title}`,
      qualityProfileId,
      languageProfileId,
      seasonFolder,
      monitored,
      tvdbId: series.tvdbId,
      imdbId: series.imdbId,
      titleSlug: series.titleSlug,
      seriesType,
      tags: [],
      addOptions: {
        searchForMissingEpisodes: searchOnAdd,
        searchForCutoffUnmetEpisodes: false,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const addedSeries = await response.json();

    showToast({
      style: Toast.Style.Success,
      title: "Series Added",
      message: `${series.title} (${series.year}) added to ${instance.name}`,
    });

    return addedSeries;
  } catch (error) {
    console.error("Add series error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Add Series",
      message: `Could not add ${series.title}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw error;
  }
}

export async function removeQueueItem(
  instance: SonarrInstance | null,
  id: number,
  removeFromClient: boolean = true,
  blocklist: boolean = true,
): Promise<void> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/queue/${id}?removeFromClient=${removeFromClient}&blocklist=${blocklist}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Api-Key": instance.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: "Queue Item Removed",
      message: "Item removed from download queue",
    });
  } catch (error) {
    console.error("Remove queue item error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Remove Item",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function testConnection(instance: SonarrInstance | null): Promise<boolean> {
  if (!instance?.url || !instance?.apiKey) {
    return false;
  }

  try {
    const url = `${instance.url}/api/v3/system/status`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

export async function getRootFolders(instance: SonarrInstance | null): Promise<{ path: string; id: number }[]> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/rootfolder`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rootFolders = await response.json();
    return rootFolders.map((rf: { path: string; id: number }) => ({ path: rf.path, id: rf.id }));
  } catch (error) {
    console.error("Failed to get root folders:", error);
    return [];
  }
}

export async function getQualityProfiles(instance: SonarrInstance | null): Promise<{ name: string; id: number }[]> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/qualityprofile`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const profiles = await response.json();
    return profiles.map((p: { name: string; id: number }) => ({ name: p.name, id: p.id }));
  } catch (error) {
    console.error("Failed to get quality profiles:", error);
    return [];
  }
}

export async function getLanguageProfiles(instance: SonarrInstance | null): Promise<{ name: string; id: number }[]> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/languageprofile`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const profiles = await response.json();
    return profiles.map((p: { name: string; id: number }) => ({ name: p.name, id: p.id }));
  } catch (error) {
    console.error("Failed to get language profiles:", error);
    return [];
  }
}

export async function searchEpisodes(instance: SonarrInstance | null, episodeIds: number[]): Promise<void> {
  if (!instance?.url || !instance?.apiKey) {
    throw new Error("Invalid Sonarr instance configuration");
  }

  try {
    const url = `${instance.url}/api/v3/command`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "EpisodeSearch",
        episodeIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: "Search Started",
      message: `Searching for ${episodeIds.length} episode(s)`,
    });
  } catch (error) {
    console.error("Episode search error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
