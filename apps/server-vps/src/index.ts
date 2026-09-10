import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, type VpsEnv } from './env.js';
import { RtkApi, type MeetingApi } from './rtk.js';
import { DEMO_PRESETS, DemoProxyApi } from './demo-proxy.js';
import { makeHostKey, verifyHostKey } from './hostkey.js';
import { RecordingManager, type LocalRecording } from './recordings.js';

const VERSION = '0.1.0-vps';

type MeetingType = 'conference' | 'webinar';

const env = loadEnv();
const app = new Hono();
const recordingManager = new RecordingManager(env);

function createApi(): MeetingApi {
  return env.DEMO_PROXY ? new DemoProxyApi() : new RtkApi(env);
}

function isConfigured(): boolean {
  return env.DEMO_PROXY || RtkApi.isConfigured(env);
}

function jsonError(c: { json: (o: unknown, s?: number) => Response }, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return c.json({ ok: false, error: { code, message, ...extra } }, status as 400);
}

function cleanName(input: unknown): string {
  const s = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  return s.slice(0, 40);
}

function cleanTitle(input: unknown, fallback: string): string {
  const s = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  return (s || fallback).slice(0, 80);
}

function parseType(input: unknown): MeetingType {
  return input === 'webinar' ? 'webinar' : 'conference';
}

function presetFor(type: MeetingType, role: 'host' | 'participant'): string {
  if (env.DEMO_PROXY) return DEMO_PRESETS[type][role];
  if (type === 'webinar') {
    return role === 'host'
      ? env.RTK_WEBINAR_HOST_PRESET || (env.RTK_HOST_PRESET?.startsWith('cfmeeting_') ? env.RTK_HOST_PRESET.replace(/^cfmeeting_/, 'cfmeeting_webinar_') : 'cfmeeting_webinar_host')
      : env.RTK_WEBINAR_PARTICIPANT_PRESET || (env.RTK_PARTICIPANT_PRESET?.startsWith('cfmeeting_') ? env.RTK_PARTICIPANT_PRESET.replace(/^cfmeeting_/, 'cfmeeting_webinar_') : 'cfmeeting_webinar_participant');
  }
  return role === 'host' ? env.RTK_HOST_PRESET : env.RTK_PARTICIPANT_PRESET;
}

function participantId(name: string): string {
  return `${crypto.randomUUID()}:${name.slice(0, 20)}`;
}

function publicMeeting(m: { id: string; code?: string | null; title: string; type?: MeetingType | null }) {
  const ref = m.code ?? m.id;
  return {
    id: m.id,
    code: m.code ?? null,
    ref,
    displayCode: m.code || m.id,
    title: m.title,
    type: m.type ?? null,
  };
}

/* ---------- CORS Middleware ---------- */

app.use('/api/*', async (c, next) => {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s: string) => s.trim()).filter(Boolean);
  const handler = cors({
    origin: (origin) => {
      if (allowed.includes('*')) return origin || '*';
      if (!origin) return allowed[0] || '*';
      return allowed.includes(origin) ? origin : allowed[0] || '*';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposeHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges'],
  });
  return handler(c, next);
});

/* ---------- Core API Routes ---------- */

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    version: VERSION,
    appName: env.APP_NAME,
    configured: isConfigured(),
    vps: true,
    time: new Date().toISOString(),
  });
});

app.get('/api/config', (c) => {
  return c.json({
    ok: true,
    appName: env.APP_NAME,
    version: VERSION,
    configured: isConfigured(),
    demoProxy: env.DEMO_PROXY,
    createAccessCodeRequired: Boolean(env.CREATE_ACCESS_CODE),
    shortCodes: false,
    allowRecording: env.ALLOW_RECORDING,
    meetingTypes: ['conference', 'webinar'] as MeetingType[],
    vps: true,
    localRecordingStorage: true,
  });
});

/** Create a meeting and join as host */
app.post('/api/meetings', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const expectedCode = env.CREATE_ACCESS_CODE;
  const givenCode = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';
  if (expectedCode && givenCode !== expectedCode) {
    return jsonError(c, 403, 'access_code_required', 'A valid access code is required to create meetings');
  }

  const name = cleanName(body.name);
  if (!name) return jsonError(c, 400, 'name_required', 'Display name is required');

  const type = parseType(body.type);
  const title = cleanTitle(body.title, `${name}'s meeting`);
  const recordOnStart = env.ALLOW_RECORDING && body.recordOnStart === true;
  const keepAlive = env.SESSION_KEEP_ALIVE_SECS;

  const rtk = createApi();
  const meeting = await rtk.createMeeting({
    title,
    record_on_start: recordOnStart,
    persist_chat: false,
    session_keep_alive_time_in_secs: Number.isFinite(keepAlive) ? keepAlive : 60,
  });

  const participant = await rtk.addParticipant(meeting.id, {
    name,
    preset_name: presetFor(type, 'host'),
    custom_participant_id: participantId(name),
  });

  const hostKey = makeHostKey(env.HOST_KEY_SECRET, meeting.id);

  return c.json({
    ok: true,
    meeting: publicMeeting({ id: meeting.id, code: null, title, type }),
    token: participant.token,
    hostKey,
    isHost: true,
    recordOnStart,
  });
});

/** Look up meeting by ID */
app.get('/api/meetings/:ref', async (c) => {
  const rtk = createApi();
  const ref = c.req.param('ref');
  const meeting = await rtk.getMeeting(ref);
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');
  if (meeting.status === 'INACTIVE') return jsonError(c, 410, 'inactive', 'This meeting has been closed');

  const type = rtk.getMeetingType ? await rtk.getMeetingType(meeting.id) : undefined;
  return c.json({ ok: true, meeting: publicMeeting({ id: meeting.id, code: null, title: meeting.title || '', type }) });
});

/** Join an existing meeting */
app.post('/api/meetings/:ref/join', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanName(body.name);
  if (!name) return jsonError(c, 400, 'name_required', 'Display name is required');

  const ref = c.req.param('ref');
  const rtk = createApi();
  const meeting = await rtk.getMeeting(ref);
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');
  if (meeting.status === 'INACTIVE') return jsonError(c, 410, 'inactive', 'This meeting has been closed');

  const detectedType = rtk.getMeetingType ? await rtk.getMeetingType(meeting.id) : undefined;
  const type: MeetingType = detectedType ?? parseType(body.type);

  const isHost = verifyHostKey(env.HOST_KEY_SECRET, meeting.id, typeof body.hostKey === 'string' ? body.hostKey : undefined);
  const participant = await rtk.addParticipant(meeting.id, {
    name,
    preset_name: presetFor(type, isHost ? 'host' : 'participant'),
    custom_participant_id: participantId(name),
  });

  return c.json({
    ok: true,
    meeting: publicMeeting({ id: meeting.id, code: null, title: meeting.title || '', type }),
    token: participant.token,
    isHost,
  });
});

/** Start recording for a meeting */
app.post('/api/meetings/:ref/recording/start', async (c) => {
  const ref = c.req.param('ref');
  const rtk = createApi();
  const meeting = await rtk.getMeeting(ref);
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');

  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.RTK_APP_ID) {
    return jsonError(c, 500, 'not_configured', 'RealtimeKit credentials are not configured');
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/realtime/kit/${encodeURIComponent(env.RTK_APP_ID)}/recordings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ meeting_id: meeting.id }),
  });

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; data?: unknown; errors?: Array<{ message?: string }> };
  if (!data.success) {
    const msg = data.errors?.[0]?.message || 'Failed to start recording';
    return jsonError(c, 400, 'recording_failed', msg);
  }

  return c.json({ ok: true, recording: data.data });
});

/** Stop active recording for a meeting */
app.post('/api/meetings/:ref/recording/stop', async (c) => {
  const ref = c.req.param('ref');
  const rtk = createApi();
  const meeting = await rtk.getMeeting(ref);
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');

  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.RTK_APP_ID) {
    return jsonError(c, 500, 'not_configured', 'RealtimeKit credentials are not configured');
  }

  const listRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/realtime/kit/${encodeURIComponent(env.RTK_APP_ID)}/recordings?meeting_id=${encodeURIComponent(meeting.id)}`, {
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
  });

  const listData = (await listRes.json().catch(() => ({}))) as { data?: Array<{ id: string; status: string }> };
  const active = listData.data?.find((r) => r.status === 'INVOKED' || r.status === 'RECORDING' || r.status === 'STARTING');

  if (!active) {
    return c.json({ ok: true, message: 'No active recording found' });
  }

  const stopRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/realtime/kit/${encodeURIComponent(env.RTK_APP_ID)}/recordings/${encodeURIComponent(active.id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'stop' }),
  });

  const stopData = await stopRes.json().catch(() => ({}));

  // Trigger sync pass after 15s to download the newly stopped recording
  setTimeout(() => {
    void recordingManager.syncFromCloudflare();
  }, 15000);

  return c.json({ ok: true, result: stopData });
});

/* ---------- VPS Local Recordings Management ---------- */

/** List all recordings downloaded on the VPS disk */
app.get('/api/vps/recordings', (c) => {
  const list = recordingManager.listLocal().map((r: LocalRecording) => ({
    ...r,
    streamUrl: `/api/vps/recordings/${encodeURIComponent(r.filename)}`,
    downloadUrl: `/api/vps/recordings/${encodeURIComponent(r.filename)}?download=1`,
  }));
  return c.json({ ok: true, recordings: list, directory: env.RECORDINGS_DIR });
});

/** Trigger immediate manual sync from Cloudflare R2 to VPS disk */
app.post('/api/vps/recordings/sync', async (c) => {
  const result = await recordingManager.syncFromCloudflare();
  return c.json({ ok: true, result });
});

/** Stream or download a recording MP4 file from VPS disk */
app.get('/api/vps/recordings/:filename', (c) => {
  const filename = c.req.param('filename');
  const filePath = recordingManager.getFilePath(filename);
  if (!filePath) return jsonError(c, 404, 'not_found', 'Recording file not found on VPS');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const isDownload = c.req.query('download') === '1';

  const range = c.req.header('range');
  if (range && !isDownload) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    return new Response(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunksize),
        'Content-Type': 'video/mp4',
      },
    });
  }

  const fileStream = fs.createReadStream(filePath);
  const headers: Record<string, string> = {
    'Content-Length': String(fileSize),
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
  };
  if (isDownload) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }

  return new Response(fileStream as unknown as ReadableStream, {
    status: 200,
    headers,
  });
});

/* ---------- Static Web Asset Serving (SPA) ---------- */

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

app.get('*', (c) => {
  const staticDir = path.resolve(env.STATIC_DIR);
  if (!fs.existsSync(staticDir)) {
    return c.text('CFMeeting VPS Server is running. Static web assets not found at ' + staticDir, 200);
  }

  const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
  const filePath = path.join(staticDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: { 'Content-Type': contentType },
    });
  }

  // SPA fallback to index.html
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const stream = fs.createReadStream(indexPath);
    return new Response(stream as unknown as ReadableStream, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return c.text('404 Not Found', 404);
});

/* ---------- Start Server & Background Worker ---------- */

console.log(`[CFMeeting VPS] Starting server on http://${env.HOST}:${env.PORT}...`);
console.log(`[CFMeeting VPS] Mode: ${env.DEMO_PROXY ? 'Demo Proxy' : 'RealtimeKit Cloudflare'}`);
console.log(`[CFMeeting VPS] Static web directory: ${path.resolve(env.STATIC_DIR)}`);
console.log(`[CFMeeting VPS] Local recordings directory: ${path.resolve(env.RECORDINGS_DIR)}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: env.HOST,
});

// Start background auto-download sync service
recordingManager.startWorker();
