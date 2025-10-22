import React from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useMissingEpisodes, searchEpisodes } from "./hooks/useSonarrAPI";
import { formatEpisodeTitle, formatAirDate } from "./utils";
import type { Episode } from "./types";

export default function MissingEpisodes() {
  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: missingResponse, isLoading, error, mutate } = useMissingEpisodes(selectedInstance);
  const missingEpisodes = missingResponse?.records || [];

  const handleSearchEpisode = async (episode: Episode) => {
    if (selectedInstance) {
      await searchEpisodes(selectedInstance, [episode.id]);
      mutate();
    }
  };

  const episodeListItem = (episode: Episode) => {
    const seriesTitle = episode.seriesTitle || "Unknown Series";
    const episodeTitle = formatEpisodeTitle(episode);
    const airDate = formatAirDate(episode.airDate);

    return (
      <List.Item
        key={episode.id}
        icon={Icon.Circle}
        title={episodeTitle}
        subtitle={seriesTitle}
        accessories={[{ text: airDate }, { icon: episode.monitored ? Icon.Eye : Icon.EyeSlash }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Search for Episode"
                icon={Icon.MagnifyingGlass}
                onAction={() => handleSearchEpisode(episode)}
              />
              {episode.series && (
                <Action.OpenInBrowser
                  title="Open Series in Sonarr"
                  url={`${selectedInstance?.url}/series/${episode.series.titleSlug}`}
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
          title="Failed to Load Missing Episodes"
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search missing episodes on ${selectedInstance?.name || "Sonarr"}...`}
    >
      {missingEpisodes.length === 0 ? (
        <List.EmptyView
          title="No Missing Episodes"
          description="All monitored episodes are available"
          icon={Icon.CheckCircle}
        />
      ) : (
        missingEpisodes.map(episodeListItem)
      )}
    </List>
  );
}
