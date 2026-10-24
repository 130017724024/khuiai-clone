export type ApiError = Error & { status?: number; retryAfter?: number };

/** JSON fetch helper that keeps the session cookie and normalises errors. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error((data.error as string) || 'เกิดข้อผิดพลาด กรุณาลองใหม่') as ApiError;
    err.status = res.status;
    if (typeof data.retryAfter === 'number') err.retryAfter = data.retryAfter;
    throw err;
  }
  return data as T;
}

export function formatCoins(value: number) {
  return value.toLocaleString('en-US');
}

/** 3600 -> "1 ชม.", 90000 -> "1 วัน 1 ชม." */
export function formatDuration(seconds: number) {
  if (seconds <= 0) return 'พร้อมใช้';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return h > 0 ? `${d} วัน ${h} ชม.` : `${d} วัน`;
  if (h > 0) return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  if (m > 0) return `${m} นาที`;
  return 'ไม่ถึง 1 นาที';
}

export function formatDateTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
