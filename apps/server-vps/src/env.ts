import dotenv from 'dotenv';
import path from 'node:path';

// Load .env if present
dotenv.config();

export interface VpsEnv {
  PORT: number;
  HOST: string;
  APP_NAME: string;
  DEMO_PROXY: boolean;

  // Cloudflare RealtimeKit credentials
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  RTK_APP_ID?: string;

  // Legacy credentials
  REALTIMEKIT_ORG_ID?: string;
  REALTIMEKIT_API_KEY?: string;
  REALTIMEKIT_BASE_URL?: string;

  // Presets
  RTK_HOST_PRESET: string;
  RTK_PARTICIPANT_PRESET: string;
  RTK_WEBINAR_HOST_PRESET?: string;
  RTK_WEBINAR_PARTICIPANT_PRESET?: string;

  // Server security & settings
  ALLOWED_ORIGINS: string;
  ALLOW_RECORDING: boolean;
  SESSION_KEEP_ALIVE_SECS: number;
  HOST_KEY_SECRET: string;
  CREATE_ACCESS_CODE?: string;

  // VPS Recording storage
  RECORDINGS_DIR: string;
  AUTO_DOWNLOAD_RECORDINGS: boolean;
  SYNC_INTERVAL_SECS: number;

  // Static web assets path
  STATIC_DIR: string;
}

export function loadEnv(): VpsEnv {
  const recordingsDir = process.env.RECORDINGS_DIR || path.resolve(process.cwd(), 'recordings');
  const staticDir = process.env.STATIC_DIR || path.resolve(process.cwd(), '../web/dist');

  return {
    PORT: Number(process.env.PORT || 3000),
    HOST: process.env.HOST || '0.0.0.0',
    APP_NAME: process.env.APP_NAME || 'CFMeeting',
    DEMO_PROXY: process.env.DEMO_PROXY === 'true',

    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID?.trim(),
    CF_API_TOKEN: process.env.CF_API_TOKEN?.trim(),
    RTK_APP_ID: process.env.RTK_APP_ID?.trim(),

    REALTIMEKIT_ORG_ID: process.env.REALTIMEKIT_ORG_ID?.trim(),
    REALTIMEKIT_API_KEY: process.env.REALTIMEKIT_API_KEY?.trim(),
    REALTIMEKIT_BASE_URL: process.env.REALTIMEKIT_BASE_URL?.trim(),

    RTK_HOST_PRESET: process.env.RTK_HOST_PRESET || 'cfmeeting_host',
    RTK_PARTICIPANT_PRESET: process.env.RTK_PARTICIPANT_PRESET || 'cfmeeting_participant',
    RTK_WEBINAR_HOST_PRESET: process.env.RTK_WEBINAR_HOST_PRESET || 'cfmeeting_webinar_host',
    RTK_WEBINAR_PARTICIPANT_PRESET: process.env.RTK_WEBINAR_PARTICIPANT_PRESET || 'cfmeeting_webinar_participant',

    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
    ALLOW_RECORDING: process.env.ALLOW_RECORDING !== 'false',
    SESSION_KEEP_ALIVE_SECS: Number(process.env.SESSION_KEEP_ALIVE_SECS || 60),
    HOST_KEY_SECRET: process.env.HOST_KEY_SECRET || 'cfmeeting_vps_secret_key_change_me',
    CREATE_ACCESS_CODE: process.env.CREATE_ACCESS_CODE?.trim(),

    RECORDINGS_DIR: recordingsDir,
    AUTO_DOWNLOAD_RECORDINGS: process.env.AUTO_DOWNLOAD_RECORDINGS !== 'false',
    SYNC_INTERVAL_SECS: Number(process.env.SYNC_INTERVAL_SECS || 30),

    STATIC_DIR: staticDir,
  };
}
