import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";

import { addSeries, getRootFolders, getQualityProfiles, getLanguageProfiles } from "./hooks/useSonarrAPI";
import { formatSeriesTitle } from "./utils";
import type { SeriesLookup, SonarrInstance } from "./types";

interface AddSeriesFormProps {
  series: SeriesLookup;
  instance: SonarrInstance;
}

interface FormValues {
  qualityProfileId: string;
  languageProfileId: string;
  rootFolderPath: string;
  seriesType: "standard" | "daily" | "anime";
  seasonFolder: boolean;
  monitored: boolean;
  searchOnAdd: boolean;
}

export default function AddSeriesForm({ series, instance }: AddSeriesFormProps) {
  const [rootFolders, setRootFolders] = useState<{ path: string; id: number }[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<{ name: string; id: number }[]>([]);
  const [languageProfiles, setLanguageProfiles] = useState<{ name: string; id: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [folders, qProfiles, lProfiles] = await Promise.all([
          getRootFolders(instance),
          getQualityProfiles(instance),
          getLanguageProfiles(instance),
        ]);

        setRootFolders(folders);
        setQualityProfiles(qProfiles);
        setLanguageProfiles(lProfiles);

        if (folders.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Root Folders",
            message: "Please configure root folders in Sonarr first",
          });
        }

        if (qProfiles.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Quality Profiles",
            message: "Please configure quality profiles in Sonarr first",
          });
        }

        if (lProfiles.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No Language Profiles",
            message: "Please configure language profiles in Sonarr first",
          });
        }
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Loading Error",
          message: "Unable to load configuration options",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [instance]);

  const handleSubmit = async (values: FormValues) => {
    try {
      await addSeries(
        instance,
        series,
        parseInt(values.qualityProfileId),
        values.rootFolderPath,
        parseInt(values.languageProfileId),
        values.seriesType,
        values.seasonFolder,
        values.monitored,
        values.searchOnAdd,
      );

      popToRoot();
    } catch (error) {
      console.error("Add series error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Series",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (rootFolders.length === 0 || qualityProfiles.length === 0 || languageProfiles.length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Back" onAction={popToRoot} />
          </ActionPanel>
        }
      >
        <Form.Description text="Incomplete configuration. Please check your Sonarr settings." />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle={`Add: ${formatSeriesTitle(series)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Series" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={popToRoot} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Configure settings to add "${formatSeriesTitle(series)}" to your Sonarr collection`} />

      <Form.Dropdown id="qualityProfileId" title="Quality Profile" defaultValue={qualityProfiles[0]?.id.toString()}>
        {qualityProfiles.map(profile => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="languageProfileId"
        title="Language Profile"
        defaultValue={languageProfiles[0]?.id.toString()}
      >
        {languageProfiles.map(profile => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="rootFolderPath" title="Root Folder" defaultValue={rootFolders[0]?.path}>
        {rootFolders.map(folder => (
          <Form.Dropdown.Item key={folder.id} value={folder.path} title={folder.path} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="seriesType"
        title="Series Type"
        defaultValue={series.seriesType || "standard"}
        info="Choose the appropriate series type"
      >
        <Form.Dropdown.Item value="standard" title="Standard" />
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="anime" title="Anime" />
      </Form.Dropdown>

      <Form.Checkbox
        id="seasonFolder"
        label="Use season folders"
        defaultValue={true}
        info="If enabled, episodes will be organized into season folders"
      />

      <Form.Checkbox
        id="monitored"
        label="Monitor this series"
        defaultValue={true}
        info="If enabled, Sonarr will automatically monitor for new episodes"
      />

      <Form.Checkbox
        id="searchOnAdd"
        label="Search immediately"
        defaultValue={true}
        info="If enabled, Sonarr will immediately search for missing episodes after adding"
      />
    </Form>
  );
}
