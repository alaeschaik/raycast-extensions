import { getPreferenceValues } from "@raycast/api";
import type { SonarrInstance } from "./types";

interface Preferences {
  primaryInstanceName: string;
  primaryInstanceUrl: string;
  primaryInstanceApiKey: string;
  enableSecondaryInstance?: boolean;
  secondaryInstanceName?: string;
  secondaryInstanceUrl?: string;
  secondaryInstanceApiKey?: string;
  activeInstance?: "primary" | "secondary";
}

export function getSonarrInstances(): SonarrInstance[] {
  const preferences = getPreferenceValues<Preferences>();
  const instances: SonarrInstance[] = [];

  // Primary instance (always present)
  if (!preferences.primaryInstanceName || !preferences.primaryInstanceUrl || !preferences.primaryInstanceApiKey) {
    throw new Error("Primary Sonarr instance configuration is incomplete");
  }

  instances.push({
    name: preferences.primaryInstanceName,
    url: preferences.primaryInstanceUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey: preferences.primaryInstanceApiKey,
    isDefault: true,
  });

  // Secondary instance (optional)
  if (
    preferences.enableSecondaryInstance &&
    preferences.secondaryInstanceName &&
    preferences.secondaryInstanceUrl &&
    preferences.secondaryInstanceApiKey
  ) {
    instances.push({
      name: preferences.secondaryInstanceName,
      url: preferences.secondaryInstanceUrl.replace(/\/$/, ""), // Remove trailing slash
      apiKey: preferences.secondaryInstanceApiKey,
      isDefault: false,
    });
  }

  return instances;
}

export function getActiveSonarrInstance(): SonarrInstance {
  const preferences = getPreferenceValues<Preferences>();
  const instances = getSonarrInstances();

  // If secondary instance is enabled and selected, use it
  if (preferences.activeInstance === "secondary" && preferences.enableSecondaryInstance && instances.length > 1) {
    return instances[1]; // Secondary instance
  }

  // Otherwise use primary instance
  if (instances.length > 0) {
    return instances[0]; // Primary instance
  }

  throw new Error("No Sonarr instances configured");
}

export function getDefaultSonarrInstance(): SonarrInstance {
  // Keep for backward compatibility, but use active instance logic
  return getActiveSonarrInstance();
}

export function validateSonarrInstance(instance: SonarrInstance): void {
  if (!instance.name.trim()) {
    throw new Error("Instance name cannot be empty");
  }

  if (!instance.url.trim()) {
    throw new Error("Instance URL cannot be empty");
  }

  if (!instance.apiKey.trim()) {
    throw new Error("Instance API key cannot be empty");
  }

  try {
    new URL(instance.url);
  } catch {
    throw new Error("Instance URL is not valid");
  }
}

export function getSonarrInstanceChoices(): Array<{ title: string; value: string }> {
  const instances = getSonarrInstances();

  return instances.map((instance) => ({
    title: `${instance.name} (${instance.url})`,
    value: JSON.stringify({
      name: instance.name,
      url: instance.url,
      apiKey: instance.apiKey,
      isDefault: instance.isDefault,
    }),
  }));
}
