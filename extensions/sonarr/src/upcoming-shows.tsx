import React, { useState } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useCalendar } from "./hooks/useSonarrAPI";
import { formatEpisodeTitle, formatAirDateTime, getSeriesPoster } from "./utils";
import type { CalendarEpisode } from "./types";

type MonitoringFilter = "all" | "monitored" | "unmonitored";

export default function UpcomingShows() {
  const [monitoringFilter, setMonitoringFilter] = useState<MonitoringFilter>("all");

  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const today = new Date();
  const twoMonthsFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const {
    data: calendarEpisodes,
    isLoading,
    error,
    mutate,
  } = useCalendar(selectedInstance, today.toISOString().split("T")[0], twoMonthsFromNow.toISOString().split("T")[0]);

  const episodeListItem = (episode: CalendarEpisode) => {
    const episodeTitle = formatEpisodeTitle(episode);
    const seriesTitle = episode.series?.title || "Unknown Series";
    const airDate = formatAirDateTime(episode.airDateUtc);
    const poster = episode.series ? getSeriesPoster(episode.series) : undefined;

    // Get file availability status
    const hasFile = episode.hasFile;
    const fileIcon = hasFile ? Icon.Check : Icon.Circle;
    const fileTooltip = hasFile ? "Downloaded" : "Not Downloaded";

    // Get monitoring status
    const monitored = episode.monitored;
    const monitorIcon = monitored ? Icon.Eye : Icon.EyeSlash;
    const monitorTooltip = monitored ? "Monitored" : "Not Monitored";

    return (
      <List.Item
        key={`${episode.id}-${episode.episodeNumber}`}
        icon={poster || Icon.Video}
        title={episodeTitle}
        subtitle={seriesTitle}
        accessories={[
          { text: airDate },
          { icon: monitorIcon, tooltip: monitorTooltip },
          { icon: fileIcon, tooltip: fileTooltip },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {episode.series && (
                <Action.OpenInBrowser
                  title="Open Series in Sonarr"
                  url={`${selectedInstance?.url}/series/${episode.series.titleSlug}`}
                  icon={Icon.Globe}
                />
              )}
              {episode.series?.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${episode.series.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {episode.series?.tvdbId && (
                <Action.OpenInBrowser
                  title="Open in Tvdb"
                  url={`https://thetvdb.com/?id=${episode.series.tvdbId}&tab=series`}
                  icon={Icon.Globe}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel.Section>
            {instances.length > 1 && (
              <ActionPanel.Section title="Instance">
                {instances.map((instance) => (
                  <Action
                    key={instance.name}
                    title={`Switch to ${instance.name}`}
                    icon={selectedInstance?.name === instance.name ? Icon.Check : Icon.Circle}
                    onAction={() => switchToInstance(instance)}
                  />
                ))}
                <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  if (instanceLoading) {
    return <List isLoading={true} />;
  }

  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Sonarr Instances Configured"
          description="Please configure your Sonarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load Calendar"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Filter by monitoring status and sort by air date (closest first)
  const filteredAndSortedEpisodes = calendarEpisodes
    ? calendarEpisodes
        .filter((episode) => {
          // Filter by monitoring status
          if (monitoringFilter === "all") return true;
          return (
            (monitoringFilter === "monitored" && episode.monitored) ||
            (monitoringFilter === "unmonitored" && !episode.monitored)
          );
        })
        .sort((a, b) => {
          const dateA = a.airDateUtc ? new Date(a.airDateUtc).getTime() : 0;
          const dateB = b.airDateUtc ? new Date(b.airDateUtc).getTime() : 0;
          return dateA - dateB;
        })
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search upcoming episodes on ${selectedInstance?.name || "Sonarr"}...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Monitoring Status"
          value={monitoringFilter}
          onChange={(value) => setMonitoringFilter(value as MonitoringFilter)}
        >
          <List.Dropdown.Item title="All Episodes" value="all" />
          <List.Dropdown.Item title="📡 Monitored" value="monitored" />
          <List.Dropdown.Item title="⚫ Unmonitored" value="unmonitored" />
        </List.Dropdown>
      }
    >
      {filteredAndSortedEpisodes.length === 0 ? (
        <List.EmptyView
          title={
            monitoringFilter === "all"
              ? "No Upcoming Episodes"
              : `No ${monitoringFilter.charAt(0).toUpperCase() + monitoringFilter.slice(1)} Episodes`
          }
          description={
            monitoringFilter === "all"
              ? "No episodes airing in the next 2 months"
              : `No ${monitoringFilter} episodes airing in the next 2 months`
          }
          icon={Icon.Calendar}
        />
      ) : (
        filteredAndSortedEpisodes.map(episodeListItem)
      )}
    </List>
  );
}
