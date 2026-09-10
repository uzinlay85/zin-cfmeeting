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
  sizeBytes: number;
  createdAt: string;
  downloadUrl?: string;
  meta?: Record<string, unknown>;
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
      const recordingId = (meta?.id as string) || parts[1] || f;

      recordings.push({
        filename: f,
        recordingId,
        meetingId,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString() || stat.mtime.toISOString(),
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

  async syncFromCloudflare(): Promise<{ downloaded: number; skipped: number; errors: number }> {
    if (this.syncing) return { downloaded: 0, skipped: 0, errors: 0 };
    if (!RtkApi.isConfigured(this.env)) return { downloaded: 0, skipped: 0, errors: 0 };

    this.syncing = true;
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const rtk = new RtkApi(this.env);
      const items = await rtk.listRecordings();

      for (const item of items) {
        if (!item.download_url && !item.file_path) continue;
        if (item.status !== 'COMPLETED' && item.status !== 'STOPPED') continue;

        const downloadUrl = item.download_url;
        if (!downloadUrl) continue;

        const datePrefix = (item.created_at || new Date().toISOString()).slice(0, 10);
        const filename = `${datePrefix}_${item.meeting_id}_${item.id}.mp4`;
        const targetPath = path.join(this.dir, filename);
        const metaPath = path.join(this.dir, `${datePrefix}_${item.meeting_id}_${item.id}.json`);

        // Check if already downloaded
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
          skipped++;
          continue;
        }

        console.log(`[VPS Recordings] Downloading recording ${item.id} to ${filename}...`);

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

          // Save metadata
          fs.writeFileSync(metaPath, JSON.stringify(item, null, 2), 'utf8');
          console.log(`[VPS Recordings] Successfully saved ${filename} (${fs.statSync(targetPath).size} bytes)`);
          downloaded++;
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
