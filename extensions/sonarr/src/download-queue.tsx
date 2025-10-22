import React, { useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color, confirmAlert, Alert } from "@raycast/api";

import { useInstanceManager } from "./hooks/useInstanceManager";
import { useQueue, removeQueueItem } from "./hooks/useSonarrAPI";
import { formatFileSize, formatEpisodeTitle, formatOverview, getDownloadProgress } from "./utils";
import type { QueueItem } from "./types";

export default function DownloadQueue() {
  const {
    currentInstance: selectedInstance,
    isLoading: instanceLoading,
    availableInstances: instances,
    switchToInstance,
  } = useInstanceManager();

  const { data: queueResponse, isLoading, error, mutate } = useQueue(selectedInstance);
  const queueItems = queueResponse?.records || [];

  // Auto-refresh every 5 seconds if there are active downloads
  useEffect(() => {
    const hasActiveDownloads = queueItems.some(item => item.status === "downloading");

    if (hasActiveDownloads) {
      const interval = setInterval(() => {
        mutate();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [queueItems, mutate]);

  const getStatusColor = (status: string, trackedDownloadStatus: string): Color => {
    if (trackedDownloadStatus === "error") return Color.Red;
    if (trackedDownloadStatus === "warning") return Color.Yellow;
    if (status === "downloading") return Color.Blue;
    if (status === "completed") return Color.Green;
    return Color.SecondaryText;
  };

  const getStatusIcon = (status: string, trackedDownloadStatus: string): Icon => {
    if (trackedDownloadStatus === "error") return Icon.XMarkCircle;
    if (trackedDownloadStatus === "warning") return Icon.ExclamationMark;
    if (status === "downloading") return Icon.Download;
    if (status === "completed") return Icon.Check;
    return Icon.Clock;
  };

  const formatProgress = (item: QueueItem): string => {
    if (item.size === 0) return "Unknown size";

    const downloaded = item.size - item.sizeleft;
    const percentage = Math.round((downloaded / item.size) * 100);

    return `${formatFileSize(downloaded)} / ${formatFileSize(item.size)} (${percentage}%)`;
  };

  const getProgressPercentage = (item: QueueItem): number => {
    return getDownloadProgress(item);
  };

  const getTimeLeft = (item: QueueItem): string => {
    if (item.timeleft && item.timeleft !== "00:00:00") {
      return item.timeleft;
    }

    if (item.estimatedCompletionTime) {
      const completion = new Date(item.estimatedCompletionTime);
      const now = new Date();
      const diffMs = completion.getTime() - now.getTime();

      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
      }
    }

    return "Unknown";
  };

  const handleRemoveItem = async (item: QueueItem, removeFromClient: boolean = true, blocklist: boolean = true) => {
    const confirmed = await confirmAlert({
      title: "Remove Download",
      message: `Are you sure you want to remove "${item.title}" from the download queue?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await removeQueueItem(selectedInstance, item.id, removeFromClient, blocklist);
        mutate();
      } catch (error) {
        console.error("Failed to remove queue item:", error);
      }
    }
  };

  const queueListItem = (item: QueueItem) => {
    const statusColor = getStatusColor(item.status, item.trackedDownloadStatus);
    const statusIcon = getStatusIcon(item.status, item.trackedDownloadStatus);
    const progress = formatProgress(item);
    const timeLeft = getTimeLeft(item);

    // Show percentage for downloading items, status for others
    const tagValue = item.status === "downloading" ? `${getProgressPercentage(item)}%` : item.status;

    const statusMessages = item.statusMessages.flatMap(sm => sm.messages).join(", ");

    const episodeTitle = item.episode ? formatEpisodeTitle(item.episode) : "Episode info unavailable";
    const seriesTitle = item.series?.title || "Unknown series";

    return (
      <List.Item
        key={item.id}
        icon={{ source: statusIcon, tintColor: statusColor }}
        title={item.title}
        subtitle={`${seriesTitle} - ${episodeTitle}`}
        accessories={[
          { text: progress },
          ...(timeLeft !== "Unknown" ? [{ text: timeLeft }] : []),
          { tag: { value: tagValue, color: statusColor } },
        ]}
        detail={
          <List.Item.Detail
            markdown={`# ${item.title}

## Episode
**${seriesTitle}**
${episodeTitle}

## Download Details
- **Status:** ${item.status}
- **Tracked Status:** ${item.trackedDownloadStatus}
- **Protocol:** ${item.protocol}
- **Download Client:** ${item.downloadClient || "Unknown"}
- **Indexer:** ${item.indexer || "Unknown"}
- **Progress:** ${progress}
- **Time Left:** ${timeLeft}
${item.outputPath ? `- **Output Path:** ${item.outputPath}` : ""}

${statusMessages ? `## Status Messages\n${statusMessages}` : ""}

## Episode Overview
${formatOverview(item.episode?.overview || "")}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {item.series && (
                <Action.OpenInBrowser
                  title="Open Series in Sonarr"
                  url={`${selectedInstance?.url}/series/${item.series.titleSlug}`}
                  icon={Icon.Globe}
                />
              )}
              <Action
                title="Remove from Queue"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleRemoveItem(item)}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel.Section>
            {instances.length > 1 && (
              <ActionPanel.Section title="Instance">
                {instances.map(instance => (
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
          title="Failed to Load Queue"
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
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search download queue...">
      {queueItems.length === 0 ? (
        <List.EmptyView
          title="Download Queue Empty"
          description="No active downloads in the queue"
          icon={Icon.CheckCircle}
        />
      ) : (
        queueItems.map(queueListItem)
      )}
    </List>
  );
}
