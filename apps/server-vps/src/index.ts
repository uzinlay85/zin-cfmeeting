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

/* ---------- VPS Local Recordings Management & Security ---------- */

function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function checkRecordingAuth(c: { req: { query: (k: string) => string | undefined; header: (k: string) => string | undefined } }): boolean {
  const code = env.CREATE_ACCESS_CODE;
  if (!code) return true; // If no password is configured, allow
  const cookieCode = getCookie(c.req.header('cookie'), 'vps_access_code');
  const token =
    c.req.query('key') ||
    c.req.query('access_code') ||
    cookieCode ||
    c.req.header('x-access-code') ||
    c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  return token === code;
}

/** List all recordings downloaded on the VPS disk */
app.get('/api/vps/recordings', (c) => {
  if (!checkRecordingAuth(c)) {
    return jsonError(c, 401, 'unauthorized', 'Access code required to view recordings. Use ?key=YOUR_ACCESS_CODE or log in.');
  }

  const keyParam = env.CREATE_ACCESS_CODE ? `?key=${encodeURIComponent(env.CREATE_ACCESS_CODE)}` : '';
  const list = recordingManager.listLocal().map((r: LocalRecording) => ({
    ...r,
    streamUrl: `/api/vps/recordings/${encodeURIComponent(r.filename)}${keyParam}`,
    downloadUrl: `/api/vps/recordings/${encodeURIComponent(r.filename)}${keyParam ? `${keyParam}&download=1` : '?download=1'}`,
  }));
  return c.json({ ok: true, recordings: list, directory: env.RECORDINGS_DIR });
});

/** Trigger immediate manual sync from Cloudflare R2 to VPS disk */
app.post('/api/vps/recordings/sync', async (c) => {
  if (!checkRecordingAuth(c)) {
    return jsonError(c, 401, 'unauthorized', 'Access code required');
  }
  const result = await recordingManager.syncFromCloudflare();
  return c.json({ ok: true, result });
});

/** Stream or download a recording MP4 file from VPS disk */
app.get('/api/vps/recordings/:filename', (c) => {
  if (!checkRecordingAuth(c)) {
    return jsonError(c, 401, 'unauthorized', 'Access code required');
  }

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

/** Delete a single recording from VPS disk */
app.delete('/api/vps/recordings/:filename', (c) => {
  if (!checkRecordingAuth(c)) {
    return jsonError(c, 401, 'unauthorized', 'Access code required');
  }
  const filename = c.req.param('filename');
  const deleted = recordingManager.deleteRecording(filename);
  if (!deleted) return jsonError(c, 404, 'not_found', 'Recording file not found');
  return c.json({ ok: true, deleted: true, filename });
});

/** Batch delete multiple recordings from VPS disk */
app.post('/api/vps/recordings/delete-batch', async (c) => {
  if (!checkRecordingAuth(c)) {
    return jsonError(c, 401, 'unauthorized', 'Access code required');
  }
  const body = (await c.req.json().catch(() => ({}))) as { filenames?: string[] };
  const filenames = Array.isArray(body.filenames) ? body.filenames : [];
  if (filenames.length === 0) {
    return jsonError(c, 400, 'bad_request', 'No filenames provided for deletion');
  }
  const result = recordingManager.deleteRecordings(filenames);
  return c.json({ ok: true, ...result });
});

/** Password-Protected Web UI for Recordings Dashboard */
app.get('/recordings', (c) => {
  const html = `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFMeeting Recordings Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --border: #334155;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 24px 16px; min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 1.5rem; display: flex; align-items: center; gap: 8px; }
    .header-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn { background: var(--primary); color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; transition: background 0.2s; }
    .btn:hover { background: var(--primary-hover); }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-danger:hover { background: var(--danger); color: white; }
    .btn-danger-solid { background: var(--danger); color: white; }
    .btn-danger-solid:hover { background: var(--danger-hover); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
    .rec-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
    .rec-item:last-child { border-bottom: none; }
    .rec-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 240px; }
    .rec-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); }
    .rec-info { flex: 1; }
    .rec-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; color: #e2e8f0; word-break: break-all; }
    .rec-meta { font-size: 0.82rem; color: var(--muted); display: flex; gap: 14px; flex-wrap: wrap; }
    .rec-actions { display: flex; gap: 6px; align-items: center; }
    .login-box { max-width: 400px; margin: 80px auto; text-align: center; }
    .input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid var(--border); border-radius: 8px; color: white; margin-bottom: 16px; font-size: 1rem; }
    .input:focus { outline: 2px solid var(--primary); }
    #videoModal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; align-items: center; justify-content: center; padding: 20px; }
    #videoModal video { max-width: 900px; width: 100%; max-height: 80vh; border-radius: 8px; background: black; }
    .close-modal { position: absolute; top: 20px; right: 20px; color: white; font-size: 2rem; cursor: pointer; }
    .badge { background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎥 CFMeeting Recordings</h1>
      <div id="headerActions" class="header-btns" style="display:none;">
        <button class="btn btn-secondary" onclick="syncRecordings()" id="syncBtn">🔄 Sync Cloudflare</button>
        <button class="btn btn-secondary" onclick="logout()">🔒 Logout</button>
      </div>
    </header>

    <div id="loginView" class="card login-box">
      <h2 style="margin-bottom:8px;">🔒 Protected Storage</h2>
      <p style="color:var(--muted); margin-bottom:20px; font-size:0.9rem;">Recording ဖိုင်များကို ကြည့်ရှုရန် Access Code ထည့်ပါ</p>
      <input type="password" id="accessInput" class="input" placeholder="Enter Access Code..." />
      <button class="btn" style="width:100%; justify-content:center;" onclick="login()">Unlock Dashboard</button>
      <div id="loginErr" style="color:#ef4444; margin-top:12px; font-size:0.9rem; display:none;">Invalid access code</div>
    </div>

    <div id="mainView" style="display:none;">
      <div class="card">
        <div class="toolbar" id="toolbar">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.9rem; font-weight:500;">
            <input type="checkbox" id="selectAllBox" onchange="toggleSelectAll(this)" style="width:18px; height:18px; accent-color:var(--primary);" />
            <span>Select All</span>
          </label>
          <button class="btn btn-danger-solid" id="batchDelBtn" style="display:none;" onclick="deleteSelected()">
            🗑️ Delete Selected (<span id="selectedCount">0</span>)
          </button>
        </div>
        <div id="recList">Loading recordings...</div>
      </div>
    </div>
  </div>

  <div id="videoModal" onclick="closeVideo(event)">
    <span class="close-modal" onclick="closeVideo()">&times;</span>
    <video id="player" controls autoplay></video>
  </div>

  <script>
    let currentRecordings = [];

    function getStoredKey() {
      return localStorage.getItem('vps_rec_key') || '';
    }

    async function checkAuth() {
      const key = getStoredKey();
      if (!key) {
        document.getElementById('loginView').style.display = 'block';
        document.getElementById('mainView').style.display = 'none';
        document.getElementById('headerActions').style.display = 'none';
        return;
      }
      document.cookie = 'vps_access_code=' + encodeURIComponent(key) + '; path=/; max-age=2592000; SameSite=Lax';
      loadList(key);
    }

    async function login() {
      const code = document.getElementById('accessInput').value.trim();
      if (!code) return;
      localStorage.setItem('vps_rec_key', code);
      document.cookie = 'vps_access_code=' + encodeURIComponent(code) + '; path=/; max-age=2592000; SameSite=Lax';
      await loadList(code);
    }

    function logout() {
      localStorage.removeItem('vps_rec_key');
      document.cookie = 'vps_access_code=; path=/; max-age=0';
      location.reload();
    }

    async function loadList(key) {
      try {
        const res = await fetch('/api/vps/recordings?key=' + encodeURIComponent(key));
        if (res.status === 401) {
          document.getElementById('loginView').style.display = 'block';
          document.getElementById('loginErr').style.display = 'block';
          document.getElementById('mainView').style.display = 'none';
          document.getElementById('headerActions').style.display = 'none';
          return;
        }
        const data = await res.json();
        currentRecordings = data.recordings || [];
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('mainView').style.display = 'block';
        document.getElementById('headerActions').style.display = 'flex';
        renderList(currentRecordings, key);
        updateBatchBtn();
      } catch (err) {
        document.getElementById('recList').innerHTML = '<p style="color:#ef4444">Error loading recordings</p>';
      }
    }

    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      const k = 1024;
      const dm = 1;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function renderList(list, key) {
      const el = document.getElementById('recList');
      if (list.length === 0) {
        el.innerHTML = '<p style="text-align:center; color:var(--muted); padding:40px 0;">No recordings stored on VPS yet.</p>';
        document.getElementById('toolbar').style.display = 'none';
        return;
      }
      document.getElementById('toolbar').style.display = 'flex';
      el.innerHTML = list.map(r => {
        const date = new Date(r.createdAt).toLocaleString();
        const size = formatBytes(r.sizeBytes);
        return \`
          <div class="rec-item">
            <div class="rec-left">
              <input type="checkbox" class="rec-checkbox item-cb" data-file="\${r.filename}" onchange="updateBatchBtn()" />
              <div class="rec-info">
                <div class="rec-title">\${r.meetingTitle ? r.meetingTitle : r.filename}</div>
                <div class="rec-meta">
                  <span>📁 \${r.filename}</span>
                  <span>📅 \${date}</span>
                  <span>📦 \${size}</span>
                  <span class="badge">Meeting: \${r.meetingId}</span>
                </div>
              </div>
            </div>
            <div class="rec-actions">
              <button class="btn" onclick="playVideo('\${r.streamUrl}')">▶ Play</button>
              <a class="btn btn-secondary" href="\${r.downloadUrl}" download>⬇ Download</a>
              <button class="btn btn-danger" onclick="deleteSingle('\${r.filename}')">🗑️ Delete</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    function toggleSelectAll(master) {
      const cbs = document.querySelectorAll('.item-cb');
      cbs.forEach(cb => cb.checked = master.checked);
      updateBatchBtn();
    }

    function updateBatchBtn() {
      const checked = document.querySelectorAll('.item-cb:checked');
      const count = checked.length;
      const batchBtn = document.getElementById('batchDelBtn');
      const countEl = document.getElementById('selectedCount');
      countEl.innerText = count;
      batchBtn.style.display = count > 0 ? 'inline-flex' : 'none';

      const master = document.getElementById('selectAllBox');
      const all = document.querySelectorAll('.item-cb');
      if (all.length > 0 && count === all.length) {
        master.checked = true;
      } else {
        master.checked = false;
      }
    }

    async function deleteSingle(filename) {
      if (!confirm('ဒီ recording ဖိုင်ကို VPS Hard Disk မှ ဖျက်ရန် သေချာပါသလား?')) return;
      const key = getStoredKey();
      try {
        const res = await fetch('/api/vps/recordings/' + encodeURIComponent(filename) + '?key=' + encodeURIComponent(key), {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.ok) {
          await loadList(key);
        } else {
          alert(data.error?.message || 'Failed to delete');
        }
      } catch (err) {
        alert('Error deleting recording');
      }
    }

    async function deleteSelected() {
      const checked = Array.from(document.querySelectorAll('.item-cb:checked')).map(cb => cb.getAttribute('data-file'));
      if (checked.length === 0) return;
      if (!confirm('ရွေးချယ်ထားသော recording ဖိုင် (' + checked.length + ') ခုကို ဖျက်ရန် သေချာပါသလား?')) return;

      const key = getStoredKey();
      try {
        const res = await fetch('/api/vps/recordings/delete-batch?key=' + encodeURIComponent(key), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: checked })
        });
        const data = await res.json();
        if (data.ok) {
          await loadList(key);
        } else {
          alert(data.error?.message || 'Failed to delete selected');
        }
      } catch (err) {
        alert('Error deleting recordings');
      }
    }

    function playVideo(url) {
      const modal = document.getElementById('videoModal');
      const player = document.getElementById('player');
      player.src = url;
      modal.style.display = 'flex';
      player.play();
    }

    function closeVideo(e) {
      if (e && e.target.id !== 'videoModal' && !e.target.classList.contains('close-modal')) return;
      const modal = document.getElementById('videoModal');
      const player = document.getElementById('player');
      player.pause();
      player.src = '';
      modal.style.display = 'none';
    }

    async function syncRecordings() {
      const btn = document.getElementById('syncBtn');
      btn.innerText = '⏳ Syncing...';
      btn.disabled = true;
      try {
        const key = getStoredKey();
        await fetch('/api/vps/recordings/sync?key=' + encodeURIComponent(key), { method: 'POST' });
        await loadList(key);
      } finally {
        btn.innerText = '🔄 Sync Cloudflare';
        btn.disabled = false;
      }
    }

    checkAuth();
  </script>
</body>
</html>`;
  return c.html(html);
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

function findStaticDir(): string | null {
  const candidates = [
    env.STATIC_DIR,
    '/app/public',
    '/app/static',
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return path.resolve(candidate);
    }
  }
  return null;
}

app.get('*', (c) => {
  const staticDir = findStaticDir();
  if (!staticDir) {
    return c.text('CFMeeting VPS Server is running. Static web assets not found (tried ' + env.STATIC_DIR + ', /app/public, public, ../web/dist)', 200);
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
