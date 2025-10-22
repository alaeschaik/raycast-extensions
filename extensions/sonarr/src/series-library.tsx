import React, { useState } from "react";
import { Grid, ActionPanel, Action, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useSeries } from "./hooks/useSonarrAPI";
import { getSeriesPoster, calculateSeriesProgress } from "./utils";
import type { Series } from "./types";

type StatusFilter = "all" | "continuing" | "ended";

export default function SeriesLibrary() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: series, isLoading, error, mutate } = useSeries(selectedInstance);

  const seriesGridItem = (show: Series) => {
    const poster = getSeriesPoster(show);
    const progress = calculateSeriesProgress(show);
    const episodeCount = show.statistics?.episodeFileCount || 0;
    const totalEpisodes = show.statistics?.totalEpisodeCount || 0;

    // Create subtitle with status and progress
    const subtitle = `${show.status} • ${episodeCount}/${totalEpisodes} (${progress}%)`;

    return (
      <Grid.Item
        key={show.id}
        content={{
          source: poster || Icon.Video,
          fallback: Icon.Video,
        }}
        title={show.title}
        subtitle={subtitle}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Sonarr"
                url={`${selectedInstance?.url}/series/${show.titleSlug}`}
                icon={Icon.Globe}
              />
              {show.path && (
                <Action.CopyToClipboard title="Copy Series Path" content={show.path} icon={Icon.Clipboard} />
              )}
              {show.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${show.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {show.tvdbId && (
                <Action.OpenInBrowser
                  title="Open in Tvdb"
                  url={`https://thetvdb.com/?id=${show.tvdbId}&tab=series`}
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
    return <Grid isLoading={true} />;
  }

  if (instances.length === 0) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No Sonarr Instances Configured"
          description="Please configure your Sonarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          title="Failed to Load Series"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  // Filter series by status and sort them
  const filteredAndSortedSeries = series
    ? series
        .filter((show) => {
          if (statusFilter === "all") return true;
          return show.status === statusFilter;
        })
        .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
    : [];

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search series library on ${selectedInstance?.name || "Sonarr"}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <Grid.Dropdown.Item title="All Series" value="all" />
          <Grid.Dropdown.Item title="📡 Continuing" value="continuing" />
          <Grid.Dropdown.Item title="🏁 Ended" value="ended" />
        </Grid.Dropdown>
      }
    >
      {filteredAndSortedSeries.length === 0 ? (
        <Grid.EmptyView
          title={statusFilter === "all" ? "No Series" : `No ${statusFilter} Series`}
          description={
            statusFilter === "all" ? "Your library is empty" : `No ${statusFilter} series found in your library`
          }
          icon={Icon.Video}
        />
      ) : (
        filteredAndSortedSeries.map(seriesGridItem)
      )}
    </Grid>
  );
}
