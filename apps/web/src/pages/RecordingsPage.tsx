import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServerUrl } from '../lib/backend';
import { getItem, setItem } from '../lib/storage';
import { Icon } from '../components/Icons';
import { Layout } from '../components/Layout';
import { Button, Group, IconButton, InputRow, Row, useToast } from '../components/ui';

interface RecordingItem {
  filename: string;
  recordingId: string;
  meetingId: string;
  meetingTitle?: string;
  sizeBytes: number;
  createdAt: string;
  streamUrl?: string;
  downloadUrl?: string;
  meta?: {
    meeting_id?: string;
    meeting_title?: string;
    id?: string;
    started_time?: string;
    duration?: number;
    [key: string]: unknown;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RecordingsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState(() => getItem<string>('accessCode', ''));
  const [inputCode, setInputCode] = useState(() => getItem<string>('accessCode', ''));
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);

  // Selection mode for batch delete
  const [isSelecting, setIsSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchRecordings = async (key: string) => {
    setLoading(true);
    try {
      const base = getServerUrl();
      const url = `${base}/api/vps/recordings?key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; recordings?: RecordingItem[]; error?: { message?: string } };
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          setIsUnlocked(false);
          setRecordings([]);
        } else {
          toast(data.error?.message || 'Failed to fetch recordings', 'error');
        }
        return false;
      }
      setRecordings(data.recordings || []);
      setIsUnlocked(true);
      return true;
    } catch {
      toast('Failed to connect to server', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessCode) {
      void fetchRecordings(accessCode);
    } else {
      setLoading(false);
    }
  }, [accessCode]);

  const onUnlock = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = inputCode.trim();
    if (!code) {
      toast('Please enter Access Code', 'error');
      return;
    }
    const ok = await fetchRecordings(code);
    if (ok) {
      setAccessCode(code);
      setItem('accessCode', code);
      toast('Recordings unlocked', 'success');
    } else {
      toast('Invalid Access Code', 'error');
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const base = getServerUrl();
      const res = await fetch(`${base}/api/vps/recordings/sync?key=${encodeURIComponent(accessCode)}`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { downloaded?: number } };
      if (data.ok) {
        const count = data.result?.downloaded ?? 0;
        toast(count > 0 ? `Synced ${count} new recording(s)` : 'All recordings up to date', 'success');
        await fetchRecordings(accessCode);
      } else {
        toast('Sync failed', 'error');
      }
    } catch {
      toast('Failed to sync with Cloudflare', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelect = (filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === recordings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(recordings.map((r) => r.filename)));
    }
  };

  const deleteSingle = async (filename: string) => {
    if (!window.confirm('ဒီ recording ဖိုင်ကို VPS Hard Disk မှ ဖျက်ရန် သေချာပါသလား?')) return;
    setDeleting(true);
    try {
      const base = getServerUrl();
      const res = await fetch(`${base}/api/vps/recordings/${encodeURIComponent(filename)}?key=${encodeURIComponent(accessCode)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { message?: string } };
      if (data.ok) {
        toast('Recording ကို ဖျက်ပြီးပါပြီ', 'success');
        setRecordings((prev) => prev.filter((r) => r.filename !== filename));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(filename);
          return next;
        });
      } else {
        toast(data.error?.message || 'Delete failed', 'error');
      }
    } catch {
      toast('Failed to delete recording', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteBatch = async () => {
    const list = Array.from(selected);
    if (list.length === 0) return;
    if (!window.confirm(`ရွေးချယ်ထားသော recording ဖိုင် (${list.length}) ခုကို ဖျက်ရန် သေချာပါသလား?`)) return;

    setDeleting(true);
    try {
      const base = getServerUrl();
      const res = await fetch(`${base}/api/vps/recordings/delete-batch?key=${encodeURIComponent(accessCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: list }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; deleted?: number; error?: { message?: string } };
      if (data.ok) {
        toast(`ဖိုင် (${data.deleted ?? list.length}) ခုကို အောင်မြင်စွာ ဖျက်ပြီးပါပြီ`, 'success');
        setRecordings((prev) => prev.filter((r) => !selected.has(r.filename)));
        setSelected(new Set());
        setIsSelecting(false);
      } else {
        toast(data.error?.message || 'Batch delete failed', 'error');
      }
    } catch {
      toast('Failed to delete recordings', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout
      title="🎥 Recordings"
      headerRight={
        isUnlocked ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {recordings.length > 0 && (
              <Button
                size="sm"
                variant={isSelecting ? 'tinted' : 'gray'}
                onClick={() => {
                  setIsSelecting((v) => !v);
                  if (isSelecting) setSelected(new Set());
                }}
              >
                {isSelecting ? 'Done' : 'Select'}
              </Button>
            )}
            {!isSelecting && (
              <Button size="sm" variant="gray" loading={syncing} onClick={onSync}>
                <Icon name="refresh" size={14} /> Sync
              </Button>
            )}
            <IconButton
              icon="x"
              label="Close"
              size={32}
              onClick={() => {
                navigate('/');
              }}
            />
          </div>
        ) : (
          <IconButton icon="x" label="Close" size={32} onClick={() => navigate('/')} />
        )
      }
    >
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: '0 16px' }}>
        {!isUnlocked ? (
          <Group title="🔒 Protected Storage" footer="Enter the access code configured on your server to view recorded meetings.">
            <form onSubmit={onUnlock}>
              <InputRow
                icon="lock"
                iconTone="blue"
                type="password"
                placeholder="Enter Access Code..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
              />
              <div style={{ padding: '12px 16px' }}>
                <Button block variant="filled" loading={loading} onClick={onUnlock}>
                  Unlock Recordings
                </Button>
              </div>
            </form>
          </Group>
        ) : (
          <>
            {isSelecting && recordings.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                }}
              >
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--blue, #3b82f6)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  {selected.size === recordings.length ? 'Deselect All' : 'Select All'}
                </button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selected.size === 0 || deleting}
                  loading={deleting}
                  onClick={deleteBatch}
                >
                  <Icon name="trash" size={14} /> Delete Selected ({selected.size})
                </Button>
              </div>
            )}

            <Group
              title={`Saved Meetings (${recordings.length})`}
              footer={
                recordings.length === 0
                  ? 'No recordings downloaded on the VPS yet. Click Sync to pull from Cloudflare.'
                  : 'Recordings are stored directly on your VPS hard drive.'
              }
            >
              {recordings.length === 0 ? (
                <Row label="No recordings found" detail="Recordings will appear here after meetings finish" icon="info" iconTone="gray" />
              ) : (
                recordings.map((r) => {
                  const base = getServerUrl();
                  const streamUrl = `${base}/api/vps/recordings/${encodeURIComponent(r.filename)}?key=${encodeURIComponent(accessCode)}`;
                  const downloadUrl = `${base}/api/vps/recordings/${encodeURIComponent(r.filename)}?key=${encodeURIComponent(accessCode)}&download=1`;
                  const title = r.meetingTitle || (r.filename.endsWith('.mp4') ? r.filename.replace(/\.mp4$/, '') : (r.meetingId !== 'unknown' ? `Meeting: ${r.meetingId.slice(0, 8)}...` : r.filename));
                  const isChecked = selected.has(r.filename);

                  return (
                    <Row
                      key={r.filename}
                      icon={isSelecting ? (isChecked ? 'circle-check' : 'circle-x') : 'video'}
                      iconTone={isSelecting ? (isChecked ? 'blue' : 'gray') : 'indigo'}
                      label={title}
                      detail={`${formatDate(r.createdAt)} · ${formatBytes(r.sizeBytes)}`}
                      onClick={() => {
                        if (isSelecting) {
                          toggleSelect(r.filename);
                        } else {
                          setActiveVideo({ url: streamUrl, title });
                        }
                      }}
                    >
                      {!isSelecting ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <a
                            href={downloadUrl}
                            download={r.filename}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 10px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: 6,
                              color: 'inherit',
                              textDecoration: 'none',
                              fontSize: 13,
                            }}
                            title="Download MP4"
                          >
                            <Icon name="download" size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteSingle(r.filename);
                            }}
                            disabled={deleting}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 10px',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              transition: 'background 0.2s',
                            }}
                            title="Delete recording"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(r.filename)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: 18,
                            height: 18,
                            cursor: 'pointer',
                            accentColor: 'var(--blue, #3b82f6)',
                          }}
                        />
                      )}
                    </Row>
                  );
                })
              )}
            </Group>
          </>
        )}

        {/* Video Player Modal */}
        {activeVideo && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setActiveVideo(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 800,
                backgroundColor: '#1e293b',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 15 }}>{activeVideo.title}</span>
                <IconButton icon="x" label="Close" size={28} onClick={() => setActiveVideo(null)} />
              </div>
              <video
                src={activeVideo.url}
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: '65vh',
                  backgroundColor: '#000',
                  display: 'block',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
