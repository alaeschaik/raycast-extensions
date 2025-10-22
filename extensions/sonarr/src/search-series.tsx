import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, LaunchProps, Icon } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { searchSeries, useSeries } from "./hooks/useSonarrAPI";
import {
  formatSeriesTitle,
  getSeriesPoster,
  getRatingDisplay,
  getGenresDisplay,
  truncateText,
  getSeriesTypeDisplay,
} from "./utils";
import type { SeriesLookup } from "./types";
import AddSeriesForm from "./add-series-form";

interface Arguments {
  query?: string;
}

export default function SearchSeries(props: LaunchProps<{ arguments: Arguments }>) {
  // Ensure searchText is always a string from the start
  const initialQuery = props.arguments.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SeriesLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingSeries, setExistingSeries] = useState<Set<number>>(new Set());
  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: existingSeriesList } = useSeries(selectedInstance);

  // Update existing series set when series or instance changes
  useEffect(() => {
    if (existingSeriesList) {
      const tvdbIds = new Set((existingSeriesList || []).map((series) => series.tvdbId));
      setExistingSeries(tvdbIds);
    }
  }, [existingSeriesList, selectedInstance]);

  // Force initial search if query is provided
  useEffect(() => {
    if (props.arguments.query && props.arguments.query.trim() && selectedInstance?.url && selectedInstance?.apiKey) {
      setIsSearching(true);
      searchSeries(selectedInstance, props.arguments.query)
        .then((results) => setSearchResults(results))
        .catch((error) => {
          console.error("Initial search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }
  }, [props.arguments.query, selectedInstance?.url, selectedInstance?.apiKey]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchText.trim() || !selectedInstance?.url || !selectedInstance?.apiKey) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      searchSeries(selectedInstance, searchText)
        .then((results) => setSearchResults(results))
        .catch((error) => {
          console.error("Search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedInstance]);

  const seriesListItem = (series: SeriesLookup) => {
    const poster = getSeriesPoster(series);
    const rating = getRatingDisplay(series);
    const genres = getGenresDisplay(series.genres);
    const overview = series.overview ? truncateText(series.overview, 150) : "No overview available";

    // Check if series is already in library
    const isAlreadyAdded = existingSeries.has(series.tvdbId);

    const accessories = [...(isAlreadyAdded ? [{ icon: Icon.Check, tooltip: "Already in library" }] : [])];

    return (
      <List.Item
        key={series.tvdbId}
        icon={poster || Icon.Video}
        title={formatSeriesTitle(series)}
        accessories={accessories}
        detail={
          <List.Item.Detail
            markdown={`# ${formatSeriesTitle(series)}

${poster ? `<img src="${poster}" alt="Poster" width="200" />` : ""}

## Overview
${overview}

## Details
- **Status:** ${series.status}
- **Network:** ${series.network || "Not specified"}
- **Runtime:** ${series.runtime ? `${series.runtime} minutes` : "Unknown"}
- **Type:** ${getSeriesTypeDisplay(series.seriesType || "standard")}
- **Genres:** ${genres || "Not specified"}
- **Seasons:** ${series.seasonCount || series.seasons?.length || "Unknown"}
${rating ? `- **Rating:** ${rating}` : ""}
${series.imdbId ? `- **IMDb:** [${series.imdbId}](https://imdb.com/title/${series.imdbId})` : ""}

## Air Information
${series.firstAired ? `- **First Aired:** ${new Date(series.firstAired).toDateString()}` : ""}
${series.airTime ? `- **Air Time:** ${series.airTime}` : ""}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {isAlreadyAdded ? (
                <Action.OpenInBrowser
                  title="Open in Sonarr"
                  url={`${selectedInstance?.url}/series/${series.titleSlug}`}
                  icon={Icon.Globe}
                />
              ) : selectedInstance ? (
                <Action.Push
                  title="Configure & Add"
                  icon={Icon.Plus}
                  target={<AddSeriesForm series={series} instance={selectedInstance} />}
                />
              ) : null}
              {series.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${series.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {series.tvdbId && (
                <Action.OpenInBrowser
                  title="Open in Tvdb"
                  url={`https://thetvdb.com/?id=${series.tvdbId}&tab=series`}
                  icon={Icon.Globe}
                />
              )}
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

  return (
    <List
      key={`search-${selectedInstance?.name || "default"}`}
      isLoading={isSearching}
      onSearchTextChange={(text) => setSearchText(text || "")}
      searchText={searchText}
      searchBarPlaceholder={`Search series on ${selectedInstance?.name || "Sonarr"}...`}
      throttle
      isShowingDetail
    >
      <List.EmptyView
        title={searchText.trim() ? "No Results Found" : "Start Typing to Search"}
        description={
          searchText.trim() ? `No series found for "${searchText}"` : "Enter a series title to begin searching"
        }
        icon={searchText.trim() ? Icon.MagnifyingGlass : Icon.Video}
      />
      {(searchResults || []).map(seriesListItem)}
    </List>
  );
}
