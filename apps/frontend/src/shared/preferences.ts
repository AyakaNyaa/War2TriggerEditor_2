import { useEffect, useState } from 'react';

export function storedText(key: string, fallback = '') {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function storeText(key: string, value: string) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
export function useStored<T>(key: string, initial: T, sanitize: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try { return sanitize(JSON.parse(storedText(key, JSON.stringify(initial)))); } catch { return initial; }
  });
  const [persistent, setPersistent] = useState(true);
  useEffect(() => { setPersistent(storeText(key, JSON.stringify(value))); }, [key, value]);
  return [value, setValue, persistent] as const;
}
export const defaultWorkspace = { width: 320, density: 'comfortable', scale: 1, contrast: false, hints: true };
export type WorkspacePreferences = typeof defaultWorkspace;
export function sanitizeWorkspace(value: unknown): WorkspacePreferences {
  const v = value && typeof value === 'object' ? value as Partial<WorkspacePreferences> : {};
  return { width: typeof v.width === 'number' && Number.isFinite(v.width) ? Math.max(220, Math.min(480, v.width)) : 320,
    density: v.density === 'compact' ? 'compact' : 'comfortable', scale: [1, 1.15, 1.3].includes(v.scale ?? 0) ? v.scale! : 1,
    contrast: v.contrast === true, hints: v.hints !== false };
}
export const commandIds = (value: unknown): number[] => Array.isArray(value)
  ? [...new Set(value.filter((id) => Number.isInteger(id) && id >= 0 && id < 254))].slice(0, 64) : [];
export function formatBytes(bytes: number, locale: string) {
  const unit = bytes >= 1048576 ? 'MiB' : bytes >= 1024 ? 'KiB' : 'B';
  return `${(bytes / (unit === 'MiB' ? 1048576 : unit === 'KiB' ? 1024 : 1)).toLocaleString(locale, { maximumFractionDigits: 1 })} ${unit}`;
}
