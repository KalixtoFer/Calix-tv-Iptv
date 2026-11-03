export interface XtreamUserInfo {
  username: string;
  password?: string;
  message?: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats?: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port?: string;
  server_protocol: string;
  rtmp_port?: string;
  timezone?: string;
  timestamp_now?: number;
  time_now?: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
  success?: boolean;
  isDemo?: boolean;
}

export interface LiveCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface LiveStream {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number | string;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
  current_program?: string;
  next_program?: string;
  stream_url?: string;
}

export interface VodCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface VodStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number | string;
  stream_icon?: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension?: string;
  year?: string;
  duration?: string;
  duration_secs?: number;
  plot?: string;
  genre?: string;
  director?: string;
  stream_url?: string;
}

export interface SeriesCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface SeriesItem {
  num?: number;
  name: string;
  series_id: number | string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  category_id: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: {
    duration?: string;
    plot?: string;
    releasedate?: string;
    movie_image?: string;
  };
  stream_url?: string;
}

export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

export interface SeriesDetails {
  seasons: Season[];
  info: Partial<SeriesItem>;
  episodes: Record<string, Episode[]>;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  tagColor: string;
  actionSection: string;
}

export interface AppUpdateConfig {
  latestVersion: string;
  minVersion: string;
  apkDownloadUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
  publishedAt?: string;
}

export interface CentralizedConfig {
  serverUrl: string;
  serverPort: string;
  serverProtocol: 'http' | 'https';
  serviceName: string;
  adminPin?: string;
  announcement: string;
  showAnnouncement: boolean;
  banners: BannerItem[];
  featuredStream: {
    streamId: string;
    name: string;
    category: string;
    streamUrl: string;
    poster: string;
    resolution: string;
    fps: string;
  };
  demoModeEnabled: boolean;
  appUpdate?: AppUpdateConfig;
}

export type ActiveSection = 'home' | 'live' | 'series' | 'movies' | 'anime' | 'especial';
export type DeviceViewMode = 'tv' | 'mobile';

export interface PlaybackState {
  streamId: string | number;
  title: string;
  url: string;
  type: 'live' | 'movie' | 'episode';
  poster?: string;
  subtitle?: string;
  category?: string;
  currentTime?: number;
}
