type CreditsRecord = {
  remaining: number;
  lastReset: string; // YYYY-MM-DD
};

const DEFAULT_CREDITS = 100;

const BENIN_TZ = 'Africa/Porto-Novo';

function getBeninParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BENIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function todayStr() {
  const p = getBeninParts(new Date());
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

function keyForUser(userId: string | undefined) {
  return `credits_${userId || 'guest'}`;
}

export function getCredits(userId?: string) {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) {
      const record: CreditsRecord = { remaining: DEFAULT_CREDITS, lastReset: todayStr() };
      localStorage.setItem(keyForUser(userId), JSON.stringify(record));
      return record;
    }
    const rec = JSON.parse(raw) as CreditsRecord;
    // Reset if lastReset < today
    if (rec.lastReset < todayStr()) {
      const newRec: CreditsRecord = { remaining: DEFAULT_CREDITS, lastReset: todayStr() };
      localStorage.setItem(keyForUser(userId), JSON.stringify(newRec));
      return newRec;
    }
    return rec;
  } catch (err) {
    return { remaining: DEFAULT_CREDITS, lastReset: todayStr() };
  }
}

export function spendCredit(userId?: string) {
  const rec = getCredits(userId);
  if (rec.remaining <= 0) return { success: false, remaining: 0 };
  rec.remaining -= 1;
  localStorage.setItem(keyForUser(userId), JSON.stringify(rec));
  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: { userId, remaining: rec.remaining } }));
  return { success: true, remaining: rec.remaining };
}

export function resetCreditsNow(userId?: string) {
  const rec = { remaining: DEFAULT_CREDITS, lastReset: todayStr() };
  localStorage.setItem(keyForUser(userId), JSON.stringify(rec));
  window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: { userId, remaining: rec.remaining } }));
  return rec;
}

let scheduled: Record<string, number | null> = {};

export function scheduleMidnightReset(userId?: string) {
  const key = keyForUser(userId);
  if (scheduled[key]) return; // already scheduled

  const now = new Date();
  const p = getBeninParts(now);
  const beninAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMs = beninAsUtc - now.getTime();
  const nextMidnightBeninAsUtc = Date.UTC(p.year, p.month - 1, p.day + 1, 0, 0, 0);
  const nextMidnightUtc = nextMidnightBeninAsUtc - offsetMs;
  const msToMidnight = Math.max(0, nextMidnightUtc - now.getTime());

  const id = window.setTimeout(() => {
    resetCreditsNow(userId);
    scheduled[key] = null;
    // reschedule for next day
    scheduleMidnightReset(userId);
  }, msToMidnight + 1000);

  scheduled[key] = id;
}

export function subscribeCredits(cb: (detail: { userId?: string; remaining: number }) => void) {
  const handler = (e: Event) => {
    const ev = e as CustomEvent;
    cb(ev.detail);
  };
  window.addEventListener('creditsUpdated', handler as EventListener);
  return () => window.removeEventListener('creditsUpdated', handler as EventListener);
}
