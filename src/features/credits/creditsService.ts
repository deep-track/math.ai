type CreditsRecord = {
  remaining: number;
  lastReset: string; // YYYY-MM-DD
};

const DEFAULT_CREDITS = 100;

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msToMidnight = tomorrow.getTime() - now.getTime();

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
