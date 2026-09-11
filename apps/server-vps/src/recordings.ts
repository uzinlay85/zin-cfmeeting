import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { VpsEnv } from './env.js';
import { RtkApi, type RtkRecordingItem } from './rtk.js';

export interface LocalRecording {
  filename: string;
  recordingId: string;
  meetingId: string;
  meetingTitle?: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl?: string;
  streamUrl?: string;
  meta?: Record<string, unknown>;
}

function sanitizeTitle(title?: string): string {
  if (!title) return 'Meeting';
  // Remove illegal characters for filesystems (/ \ : * ? " < > |) and normalize whitespace
  const cleaned = title
    .trim()
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Meeting';
}

function formatDateTime(isoString?: string, timeZone = 'Asia/Yangon'): { date: string; time: string; full: string } {
  let d = new Date();
  if (isoString) {
    const parsed = new Date(isoString);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    }
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'Asia/Yangon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    const date = `${year}-${month}-${day}`;
    const time = `${hour}-${minute}-${second}`;
    return { date, time, full: `${date}_${time}` };
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    const seconds = pad(d.getUTCSeconds());
    const date = `${year}-${month}-${day}`;
    const time = `${hours}-${minutes}-${seconds}`;
    return { date, time, full: `${date}_${time}` };
  }
}

export class RecordingManager {
  private dir: string;
  private syncing = false;

  constructor(private env: VpsEnv) {
    this.dir = env.RECORDINGS_DIR;
    this.ensureDirectory();
  }

  ensureDirectory(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  getExistingRecordingIds(): Set<string> {
    const ids = new Set<string>();
    if (!fs.existsSync(this.dir)) return ids;
    const files = fs.readdirSync(this.dir);
    for (const f of files) {
      if (f.endsWith('.json') && !f.startsWith('.')) {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
          if (meta?.id) ids.add(meta.id);
        } catch {
          /* ignore */
        }
      } else if (f.endsWith('.mp4')) {
        const base = f.replace(/\.mp4$/, '');
        const parts = base.split('_');
        if (parts.length > 0) {
          const lastPart = parts[parts.length - 1];
          if (lastPart) ids.add(lastPart);
        }
      }
    }
    return ids;
  }

  listLocal(): LocalRecording[] {
    this.ensureDirectory();
    const files = fs.readdirSync(this.dir);
    const recordings: LocalRecording[] = [];

    for (const f of files) {
      if (!f.endsWith('.mp4')) continue;
      const fullPath = path.join(this.dir, f);
      const stat = fs.statSync(fullPath);

      // Check for metadata JSON
      const jsonPath = path.join(this.dir, `${f.replace(/\.mp4$/, '')}.json`);
      let meta: Record<string, unknown> | undefined;
      if (fs.existsSync(jsonPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } catch {
          /* ignore */
        }
      }

      const parts = f.replace(/\.mp4$/, '').split('_');
      const meetingId = (meta?.meeting_id as string) || parts[0] || 'unknown';
      const recordingId = (meta?.id as string) || parts[parts.length - 1] || f;
      const meetingTitle = (meta?.meeting_title as string) || (meta?.title as string) || undefined;

      recordings.push({
        filename: f,
        recordingId,
        meetingId,
        meetingTitle,
        sizeBytes: stat.size,
        createdAt: (meta?.created_at as string) || stat.birthtime.toISOString() || stat.mtime.toISOString(),
        meta,
      });
    }

    return recordings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getFilePath(filename: string): string | null {
    const safeName = path.basename(filename);
    const fullPath = path.join(this.dir, safeName);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
    return null;
  }

  private getDeletedIds(): Set<string> {
    const tombstonePath = path.join(this.dir, '.deleted.json');
    if (fs.existsSync(tombstonePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tombstonePath, 'utf8'));
        if (Array.isArray(raw)) return new Set(raw);
      } catch {
        /* ignore */
      }
    }
    return new Set();
  }

  private addDeletedId(id: string): void {
    if (!id) return;
    const current = this.getDeletedIds();
    current.add(id);
    const tombstonePath = path.join(this.dir, '.deleted.json');
    try {
      fs.writeFileSync(tombstonePath, JSON.stringify(Array.from(current)), 'utf8');
    } catch {
      /* ignore */
    }
  }

  deleteRecording(filename: string): boolean {
    const safeName = path.basename(filename);
    const filePath = path.join(this.dir, safeName);
    const metaPath = path.join(this.dir, `${safeName.replace(/\.mp4$/, '')}.json`);

    let recordingId = '';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        recordingId = meta?.id || '';
      } catch {
        /* ignore */
      }
    }
    if (!recordingId) {
      const parts = safeName.replace(/\.mp4$/, '').split('_');
      recordingId = parts[parts.length - 1] || parts[1] || '';
    }

    if (recordingId) {
      this.addDeletedId(recordingId);
    }

    let deleted = false;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deleted = true;
      } catch {
        /* ignore */
      }
    }
    if (fs.existsSync(metaPath)) {
      try {
        fs.unlinkSync(metaPath);
      } catch {
        /* ignore */
      }
    }

    return deleted;
  }

  deleteRecordings(filenames: string[]): { deleted: number; failed: number } {
    let deleted = 0;
    let failed = 0;
    for (const name of filenames) {
      if (this.deleteRecording(name)) deleted++;
      else failed++;
    }
    return { deleted, failed };
  }

  async syncFromCloudflare(): Promise<{ downloaded: number; skipped: number; errors: number }> {
    if (this.syncing) return { downloaded: 0, skipped: 0, errors: 0 };
    if (!RtkApi.isConfigured(this.env)) return { downloaded: 0, skipped: 0, errors: 0 };

    this.syncing = true;
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const deletedIds = this.getDeletedIds();
      const existingIds = this.getExistingRecordingIds();
      const rtk = new RtkApi(this.env);
      const items = await rtk.listRecordings();

      for (const item of items) {
        if (deletedIds.has(item.id)) {
          skipped++;
          continue;
        }

        const downloadUrl = item.download_url;
        if (!downloadUrl) continue;
        if (item.status === 'INVOKED' || item.status === 'STARTING' || item.status === 'RECORDING' || item.status === 'FAILED') {
          continue;
        }

        // Check if recording is already saved (either exact ID match or file already exists)
        if (existingIds.has(item.id)) {
          skipped++;
          continue;
        }

        // Fetch meeting details to get user-friendly title
        let meetingTitle = 'Meeting';
        try {
          const meeting = await rtk.getMeeting(item.meeting_id);
          if (meeting?.title) {
            meetingTitle = meeting.title;
          }
        } catch {
          /* fallback to default title */
        }

        const safeTitle = sanitizeTitle(meetingTitle);
        const { full: dateTimeStr } = formatDateTime(item.invoked_time || item.started_time || item.created_at, this.env.TIMEZONE);
        const shortRecId = item.id.slice(0, 8);

        // Format: [MeetingTitle]_[Date]_[Time]_[ShortID].mp4
        // Example: General_Meeting_2026-09-11_21-35-10_fff37534.mp4
        const fileBase = `${safeTitle}_${dateTimeStr}_${shortRecId}`;
        const filename = `${fileBase}.mp4`;
        const targetPath = path.join(this.dir, filename);
        const metaPath = path.join(this.dir, `${fileBase}.json`);

        // Check if already downloaded on disk
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
          skipped++;
          continue;
        }

        console.log(`[VPS Recordings] Downloading recording (${meetingTitle}) to ${filename}...`);

        try {
          const res = await fetch(downloadUrl);
          if (!res.ok || !res.body) {
            console.error(`[VPS Recordings] Failed to fetch ${downloadUrl}: ${res.status}`);
            errors++;
            continue;
          }

          const fileStream = fs.createWriteStream(targetPath);
          // Convert web stream to Node readable stream
          // @ts-expect-error web ReadableStream to node Readable
          const nodeReadable = Readable.fromWeb(res.body);
          await pipeline(nodeReadable, fileStream);

          // Save enriched metadata alongside .mp4
          const enrichedMeta = {
            ...item,
            meeting_title: meetingTitle,
          };
          fs.writeFileSync(metaPath, JSON.stringify(enrichedMeta, null, 2), 'utf8');
          console.log(`[VPS Recordings] Successfully saved ${filename} (${fs.statSync(targetPath).size} bytes)`);
          downloaded++;
          existingIds.add(item.id);
        } catch (err) {
          console.error(`[VPS Recordings] Error downloading ${item.id}:`, err);
          errors++;
          // Clean up partial file
          if (fs.existsSync(targetPath)) {
            try {
              fs.unlinkSync(targetPath);
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch (err) {
      console.error('[VPS Recordings] Sync pass error:', err);
    } finally {
      this.syncing = false;
    }

    return { downloaded, skipped, errors };
  }

  startWorker(): void {
    if (!this.env.AUTO_DOWNLOAD_RECORDINGS) {
      console.log('[VPS Recordings] Auto-download is disabled.');
      return;
    }

    const intervalMs = Math.max(10, this.env.SYNC_INTERVAL_SECS) * 1000;
    console.log(`[VPS Recordings] Auto-download worker active (checking every ${this.env.SYNC_INTERVAL_SECS}s).`);

    // Initial sync pass after 5s
    setTimeout(() => {
      void this.syncFromCloudflare();
    }, 5000);

    // Periodic sync
    setInterval(() => {
      void this.syncFromCloudflare();
    }, intervalMs);
  }
}
