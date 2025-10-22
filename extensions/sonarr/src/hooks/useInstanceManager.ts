import { useState, useEffect, useCallback, useMemo } from "react";
import { getActiveSonarrInstance, getSonarrInstances } from "../config";
import type { SonarrInstance } from "../types";

export function useInstanceManager() {
  const [currentInstance, setCurrentInstanceState] = useState<SonarrInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDefaultInstance = useCallback(() => {
    try {
      const instance = getActiveSonarrInstance();
      setCurrentInstanceState(instance);
    } catch (error) {
      console.error("Failed to load default instance:", error);
      setCurrentInstanceState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultInstance();
  }, [loadDefaultInstance]);

  const switchToInstance = useCallback((instance: SonarrInstance) => {
    setCurrentInstanceState(instance);
  }, []);

  const availableInstances = useMemo(() => {
    try {
      return getSonarrInstances();
    } catch {
      return [];
    }
  }, []);

  return {
    currentInstance,
    isLoading,
    availableInstances,
    switchToInstance,
  };
}
