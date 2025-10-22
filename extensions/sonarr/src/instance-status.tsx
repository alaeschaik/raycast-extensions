import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getSonarrInstances, getActiveSonarrInstance } from "./config";
import { testConnection } from "./hooks/useSonarrAPI";
import type { SonarrInstance } from "./types";

export default function InstanceStatus() {
  const [instances, setInstances] = useState<SonarrInstance[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const activeInstance = (() => {
    try {
      return getActiveSonarrInstance();
    } catch (error) {
      console.error("Failed to get active instance:", error);
      return null;
    }
  })();

  useEffect(() => {
    try {
      const sonarrInstances = getSonarrInstances();
      setInstances(sonarrInstances);

      // Test all connections
      Promise.all(
        sonarrInstances.map(async instance => {
          const isConnected = await testConnection(instance);
          return { name: instance.name, isConnected };
        }),
      ).then(results => {
        const statusMap: Record<string, boolean> = {};
        results.forEach(result => {
          statusMap[result.name] = result.isConnected;
        });
        setConnectionStatus(statusMap);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Failed to load instances:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: error instanceof Error ? error.message : "Failed to load Sonarr configuration",
      });
      setIsLoading(false);
    }
  }, []);

  const handleTestConnection = async (instance: SonarrInstance) => {
    setConnectionStatus(prev => ({ ...prev, [instance.name]: undefined }));

    try {
      const isConnected = await testConnection(instance);
      setConnectionStatus(prev => ({ ...prev, [instance.name]: isConnected }));

      showToast({
        style: isConnected ? Toast.Style.Success : Toast.Style.Failure,
        title: isConnected ? "Connection Successful" : "Connection Failed",
        message: `${instance.name}: ${isConnected ? "API accessible" : "Cannot connect to API"}`,
      });
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus(prev => ({ ...prev, [instance.name]: false }));
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: `Failed to test connection to ${instance.name}`,
      });
    }
  };

  const getStatusIcon = (instanceName: string): { source: Icon; tintColor?: Color } => {
    const status = connectionStatus[instanceName];
    if (status === undefined) return { source: Icon.Clock, tintColor: Color.Orange };
    if (status === true) return { source: Icon.CheckCircle, tintColor: Color.Green };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  };

  const getStatusText = (instanceName: string): string => {
    const status = connectionStatus[instanceName];
    if (status === undefined) return "Testing...";
    if (status === true) return "Connected";
    return "Failed";
  };

  const instanceListItem = (instance: SonarrInstance) => {
    const statusIcon = getStatusIcon(instance.name);
    const statusText = getStatusText(instance.name);
    const isCurrentlySelected = activeInstance?.name === instance.name;

    return (
      <List.Item
        key={instance.name}
        icon={statusIcon}
        title={instance.name}
        subtitle={instance.url}
        accessories={[
          { text: statusText },
          ...(isCurrentlySelected ? [{ tag: { value: "Selected", color: Color.Green } }] : []),
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Test Connection" icon={Icon.Network} onAction={() => handleTestConnection(instance)} />
              <Action.OpenInBrowser title="Open in Browser" url={instance.url} icon={Icon.Globe} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Quick Actions">
              <Action.OpenInBrowser title="View Series Library" url={`${instance.url}/series`} icon={Icon.Video} />
              <Action.OpenInBrowser title="View Queue" url={`${instance.url}/activity/queue`} icon={Icon.Download} />
              <Action.OpenInBrowser title="View Calendar" url={`${instance.url}/calendar`} icon={Icon.Calendar} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Open
                title="Open Extension Preferences"
                target="raycast://extensions/preferences"
                icon={Icon.Gear}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Sonarr instances...">
      {instances.length === 0 ? (
        <List.EmptyView
          title="No Sonarr Instances Configured"
          description="Configure your Sonarr instances in extension preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open Extension Preferences"
                target="raycast://extensions/preferences"
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ) : (
        instances.map(instanceListItem)
      )}
    </List>
  );
}
