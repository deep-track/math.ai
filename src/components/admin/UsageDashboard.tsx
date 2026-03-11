import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getUsageAnalytics, type UsageAnalytics } from '../../services/analytics';

const dayOptions = [7, 30, 90];

const formatNumber = (value: number) => Intl.NumberFormat().format(value || 0);

const UsageDashboard = () => {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const { user, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const load = async () => {
      if (isAuthLoading) return;

      const email = user?.email;
      if (!email) {
        setError('Missing authenticated admin email');
        setLoading(false);
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
        const data = await getUsageAnalytics(days, token, email);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [days, user?.sub, isAuthLoading, getAccessTokenSilently]);

  const maxDailyCost = useMemo(() => {
    if (!analytics?.daily_trend?.length) return 0;
    return Math.max(...analytics.daily_trend.map((d) => Number(d.cost || 0)), 0);
  }, [analytics]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-600">
        Loading usage data...
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm text-red-700">
        {error || 'No usage analytics available'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Cost &amp; Usage Tracking</h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          {dayOptions.map((option) => (
            <option key={option} value={option}>
              Last {option} days
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-wide text-sky-100">Total Spend ({analytics.period_days} days)</p>
        <p className="mt-2 text-4xl font-bold">${Number(analytics.total_cost_usd || 0).toFixed(2)}</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">By Provider</h4>
        {analytics.providers.length === 0 ? (
          <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">No provider usage in this period.</div>
        ) : (
          <div className="space-y-2">
            {analytics.providers.map((provider) => (
              <div key={provider._id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-3">
                <div>
                  <div className="text-sm font-semibold capitalize text-slate-800">{provider._id}</div>
                  <div className="text-xs text-slate-600">
                    {formatNumber(provider.total_calls)} calls • {formatNumber(provider.total_tokens)} tokens
                  </div>
                </div>
                <div className="text-sm font-bold text-sky-700">${Number(provider.total_cost || 0).toFixed(4)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="mb-3 text-sm font-semibold text-slate-800">Daily Spend Trend</h4>
        {analytics.daily_trend.length === 0 ? (
          <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">No daily spend data available.</div>
        ) : (
          <div className="space-y-2">
            {analytics.daily_trend.map((day) => {
              const cost = Number(day.cost || 0);
              const width = maxDailyCost > 0 ? (cost / maxDailyCost) * 100 : 0;
              return (
                <div key={day._id} className="rounded bg-slate-50 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                    <span>{day._id}</span>
                    <span>${cost.toFixed(4)} • {formatNumber(day.calls)} calls</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UsageDashboard;
