import { getItem, setItem } from './storage';

export interface SavedUserDevices {
  audioId?: string;
  audioLabel?: string;
  videoId?: string;
  videoLabel?: string;
  speakerId?: string;
  speakerLabel?: string;
}

const STORAGE_KEY = 'userSelectedDevices';

export function getSavedUserDevices(): SavedUserDevices {
  return getItem<SavedUserDevices>(STORAGE_KEY, {});
}

export function saveUserDevice(kind: 'audio' | 'video' | 'speaker', device: MediaDeviceInfo): void {
  const current = getSavedUserDevices();
  const updated: SavedUserDevices = {
    ...current,
    [`${kind}Id`]: device.deviceId,
    [`${kind}Label`]: device.label,
  };
  setItem(STORAGE_KEY, updated);
}

/**
 * Match a saved device against currently available devices.
 * Tries matching by deviceId first, then by device label (in case deviceId changed across sessions).
 */
export function findMatchingDevice(
  savedId?: string,
  savedLabel?: string,
  availableDevices: MediaDeviceInfo[] = [],
): MediaDeviceInfo | undefined {
  if (!availableDevices || availableDevices.length === 0) return undefined;

  if (savedId) {
    const byId = availableDevices.find((d) => d.deviceId === savedId);
    if (byId) return byId;
  }

  if (savedLabel && savedLabel.trim()) {
    const byLabel = availableDevices.find((d) => d.label && d.label.trim() === savedLabel.trim());
    if (byLabel) return byLabel;
  }

  return undefined;
}
