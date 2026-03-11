import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  addInfrastructureCost,
  getInfrastructureCosts,
  type InfrastructureCost,
} from '../../services/analytics';

function currentBillingPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const InfrastructureManager = () => {
  const [costs, setCosts] = useState<InfrastructureCost[]>([]);
  const [provider, setProvider] = useState<'render' | 'vercel'>('render');
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<string>(currentBillingPeriod());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();

  const loadCosts = async () => {
    if (isAuthLoading) return;

    const email = user?.email;
    if (!email) {
      setError('Missing authenticated admin email');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,
        },
      });
      const rows = await getInfrastructureCosts(3, token, email);
      setCosts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load infrastructure costs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCosts();
  }, [user?.sub, isAuthLoading, getAccessTokenSilently]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    const email = user?.email;
    if (!email) {
      setError('Missing authenticated admin email');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,
        },
      });
      await addInfrastructureCost(
        {
          provider,
          amount_usd: numericAmount,
          billing_period: period,
        },
        token,
        email
      );
      setAmount('');
      await loadCosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save infrastructure cost');
    } finally {
      setLoading(false);
    }
  };

  const sortedCosts = useMemo(
    () => [...costs].sort((a, b) => b.billing_period.localeCompare(a.billing_period)),
    [costs]
  );

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">Infrastructure Costs</h4>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'render' | 'vercel')}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="render">Render</option>
          <option value="vercel">Vercel</option>
        </select>

        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USD)"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Add Cost'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Period</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedCosts.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-slate-500">No infrastructure costs found.</td>
              </tr>
            ) : (
              sortedCosts.map((row, index) => (
                <tr key={`${row.provider}-${row.billing_period}-${index}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4 capitalize text-slate-800">{row.provider}</td>
                  <td className="py-2 pr-4 text-slate-700">{row.billing_period}</td>
                  <td className="py-2 font-medium text-slate-900">${Number(row.amount_usd || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InfrastructureManager;
