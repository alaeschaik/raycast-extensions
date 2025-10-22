export interface SonarrInstance {
  name: string;
  url: string;
  apiKey: string;
  isDefault: boolean;
}

export interface Series {
  id: number;
  title: string;
  sortTitle: string;
  status: "continuing" | "ended" | "upcoming" | "deleted";
  overview: string;
  network?: string;
  airTime?: string;
  images: SeriesImage[];
  seasons: Season[];
  year: number;
  path: string;
  qualityProfileId: number;
  languageProfileId?: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  firstAired?: string;
  lastAired?: string;
  seriesType: "standard" | "daily" | "anime";
  cleanTitle: string;
  titleSlug: string;
  certification?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings?: {
    votes: number;
    value: number;
  };
  statistics?: SeriesStatistics;
  episodeCount?: number;
  episodeFileCount?: number;
  totalEpisodeCount?: number;
  sizeOnDisk?: number;
  percentOfEpisodes?: number;
}

export interface SeriesImage {
  coverType: "poster" | "banner" | "fanart" | "screenshot";
  url: string;
  remoteUrl?: string;
}

export interface Season {
  seasonNumber: number;
  monitored: boolean;
  statistics?: {
    previousAiring?: string;
    nextAiring?: string;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}

export interface SeriesStatistics {
  seasonCount: number;
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  releaseGroups: string[];
  percentOfEpisodes: number;
}

export interface Episode {
  id: number;
  seriesId: number;
  tvdbId?: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  airDateUtc?: string;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;
  sceneEpisodeNumber?: number;
  sceneSeasonNumber?: number;
  unverifiedSceneNumbering: boolean;
  endTime?: string;
  grabDate?: string;
  seriesTitle?: string;
  series?: Series;
  images?: SeriesImage[];
}

export interface EpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  quality: Quality;
  qualityVersion?: number;
  releaseGroup?: string;
  mediaInfo?: MediaInfo;
}

export interface Quality {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: string;
  };
  revision: {
    version: number;
    real: number;
  };
}

export interface MediaInfo {
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
}

export interface QueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
  series: Series;
  episode: Episode;
  quality: Quality;
  size: number;
  title: string;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  status: string;
  trackedDownloadStatus: "ok" | "warning" | "error";
  trackedDownloadState:
    | "downloading"
    | "downloadFailed"
    | "downloadFailedPending"
    | "importPending"
    | "importing"
    | "imported"
    | "failedPending"
    | "failed"
    | "ignored";
  statusMessages: Array<{
    title: string;
    messages: string[];
  }>;
  errorMessage?: string;
  downloadId: string;
  protocol: "unknown" | "usenet" | "torrent";
  downloadClient?: string;
  indexer?: string;
  outputPath?: string;
}

export interface CalendarEpisode extends Episode {
  series: Series;
}

export interface HealthCheck {
  source: string;
  type: "ok" | "notice" | "warning" | "error";
  message: string;
  wikiUrl?: string;
}

export interface SystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  mode: string;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  urlBase?: string;
  runtimeVersion: string;
  runtimeName: string;
  migrationVersion: number;
}

export interface HistoryRecord {
  id: number;
  episodeId: number;
  seriesId: number;
  sourceTitle: string;
  quality: Quality;
  qualityCutoffNotMet: boolean;
  date: string;
  downloadId?: string;
  eventType:
    | "grabbed"
    | "seriesFolderImported"
    | "downloadFolderImported"
    | "downloadFailed"
    | "episodeFileDeleted"
    | "episodeFileRenamed"
    | "downloadIgnored";
  data?: Record<string, unknown>;
  episode?: Episode;
  series?: Series;
}

export interface SeriesLookup {
  title: string;
  sortTitle: string;
  status: string;
  overview: string;
  network?: string;
  airTime?: string;
  images: SeriesImage[];
  seasons: Season[];
  year: number;
  seasonCount?: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  titleSlug: string;
  genres: string[];
  tags?: number[];
  added?: string;
  ratings?: {
    votes: number;
    value: number;
  };
  runtime: number;
  seriesType?: "standard" | "daily" | "anime";
  remotePoster?: string;
  certification?: string;
  firstAired?: string;
  statistics?: SeriesStatistics;
}

export interface AddSeriesOptions {
  title: string;
  qualityProfileId: number;
  languageProfileId?: number;
  rootFolderPath: string;
  monitored: boolean;
  tvdbId: number;
  seasons: Season[];
  addOptions: {
    searchForMissingEpisodes: boolean;
    searchForCutoffUnmetEpisodes?: boolean;
  };
}
