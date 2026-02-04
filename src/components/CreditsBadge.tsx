import React, { useEffect, useState } from 'react';
import { getCredits } from '../services/api';
import { useUser, useClerk } from '@clerk/clerk-react';

const CreditsBadge: React.FC<{ userId?: string }> = ({ userId }) => {
  const { user } = useUser();
  const clerk = useClerk();
  const uid = userId || user?.id || 'guest';
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let token: string | undefined;
      try {
        token = await (clerk as any).getToken?.();
      } catch (e) {
        token = undefined;
      }

      const data = await getCredits(uid, token);
      if (!mounted) return;
      setRemaining(data.remaining ?? null);
    })();

    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if ((ev.detail?.userId || 'guest') === uid) setRemaining(ev.detail.remaining);
    };

    window.addEventListener('creditsUpdated', handler as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('creditsUpdated', handler as EventListener);
    };
  }, [uid, clerk]);

  return (
    <div className="inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg backdrop-blur-sm min-w-0">
      {/* Compact mobile view */}
      <div className="flex items-center gap-2 md:hidden">
        <span className={`text-lg font-bold ${remaining === null ? 'text-gray-500' : remaining > 0 ? 'text-blue-600' : 'text-red-500'}`}>{remaining === null ? '—' : remaining}</span>
      </div>

      {/* Desktop / larger screens */}
      <div className="hidden md:flex items-baseline gap-2">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Credits</span>
        <span className={`text-2xl font-bold ${remaining === null ? 'text-gray-500' : remaining > 0 ? 'text-blue-600' : 'text-red-500'}`}>{remaining === null ? '—' : remaining}</span>
      </div>

      <div className="hidden md:block h-6 w-px bg-gradient-to-b from-blue-300 to-indigo-300" />
      <div className="hidden md:block text-xs text-gray-500 font-medium">Resets at midnight (France time)</div>
    </div>
  );
};

export default CreditsBadge;