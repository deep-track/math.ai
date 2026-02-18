import { useMemo, useState } from 'react';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';

type DashboardTab = 'overview' | 'learning' | 'ai' | 'infrastructure' | 'safety';

type MetricCardProps = {
  label: string;
  value: string;
  trend?: string;
};

type PanelProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const tabs: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'learning', label: 'Learning Analytics' },
  { id: 'ai', label: 'AI Performance' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'safety', label: 'Safety' },
];

const MetricCard = ({ label, value, trend }: MetricCardProps) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    {trend && <p className="mt-1 text-xs text-emerald-600">{trend}</p>}
  </div>
);

const Panel = ({ title, subtitle, children }: PanelProps) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div>
);

const formatNumber = (value: unknown, fallback = '—') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Intl.NumberFormat().format(value);
};

const formatPercent = (value: unknown, fallback = '—') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return `${value.toFixed(2)}%`;
};

const formatMs = (value: unknown, fallback = '—') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return `${Intl.NumberFormat().format(Math.round(value))} ms`;
};

const renderOverview = (data: any, hideZeroDays: boolean, onToggleHideZeroDays: () => void) => {
  const overview = data?.overview;
  const usage = data?.usage;
  const questionsPerDay = Array.isArray(usage?.questionsPerDay) ? usage.questionsPerDay : [];
  const peakHours = Array.isArray(usage?.peakUsageHours) ? usage.peakUsageHours : [];
  const visibleQuestionsPerDay = hideZeroDays
    ? questionsPerDay.filter((row: any) => Number(row?.count || 0) > 0)
    : questionsPerDay;
  const activeDayCount = questionsPerDay.filter((row: any) => Number(row?.count || 0) > 0).length;
  const maxDailyCount = visibleQuestionsPerDay.reduce(
    (max: number, row: any) => Math.max(max, Number(row?.count || 0)),
    0,
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total questions" value={formatNumber(overview?.totalQuestions)} />
        <MetricCard label="DAU" value={formatNumber(overview?.dau)} />
        <MetricCard label="WAU" value={formatNumber(overview?.wau)} />
        <MetricCard label="Avg response" value={formatMs(overview?.avgResponseTimeMs)} />
        <MetricCard label="Overall accuracy" value={formatPercent(overview?.overallAccuracyRate)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Questions per day" subtitle="Observed daily activity from telemetry logs">
          {questionsPerDay.length === 0 ? (
            <EmptyState message="No daily usage data available." />
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                  Active days: <span className="font-semibold text-slate-900">{formatNumber(activeDayCount, '0')}</span>
                </div>
                <div className="rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                  Total days: <span className="font-semibold text-slate-900">{formatNumber(questionsPerDay.length, '0')}</span>
                </div>
                <button
                  onClick={onToggleHideZeroDays}
                  className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {hideZeroDays ? 'Show zero days' : 'Hide zero days'}
                </button>
              </div>

              {visibleQuestionsPerDay.length === 0 ? (
                <EmptyState message="No active days found in this period." />
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {visibleQuestionsPerDay.map((row: any) => {
                    const count = Number(row?.count || 0);
                    const width = maxDailyCount > 0 ? (count / maxDailyCount) * 100 : 0;

                    return (
                      <div key={String(row?.date)} className="rounded bg-slate-50 px-3 py-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span>{String(row?.date || 'unknown')}</span>
                          <span className="font-medium">{formatNumber(count, '0')}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200">
                          <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Peak usage hours" subtitle="Top observed hours based on authenticated interactions">
          {peakHours.length === 0 ? (
            <EmptyState message="No peak-hour data available." />
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              {peakHours.map((row: any) => (
                <div key={`${row?.hour}`} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                  <span>{`${row?.hour ?? '-'}:00`}</span>
                  <span className="font-medium">{formatNumber(row?.count, '0')}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
};

const renderLearning = (data: any) => {
  const usage = data?.usage;
  const topicAnalysis = data?.topicAnalysis;
  const quality = data?.quality;
  const accuracyByTopic = Array.isArray(quality?.accuracyByTopic) ? quality.accuracyByTopic : [];
  const mostAsked = Array.isArray(topicAnalysis?.mostAskedTopics) ? topicAnalysis.mostAskedTopics : [];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Questions per student" value={formatNumber(usage?.questionsPerStudent)} />
        <MetricCard label="Repeat usage rate" value={formatPercent(usage?.repeatUsageRate)} />
        <MetricCard label="Active users" value={formatNumber(usage?.activeUsers)} />
        <MetricCard label="User satisfaction" value={formatPercent(data?.overview?.userSatisfactionRate)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Most asked topics" subtitle="Based on observed question volume">
          {mostAsked.length === 0 ? (
            <EmptyState message="No topic-volume data available." />
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              {mostAsked.map((row: any) => (
                <div key={String(row?.topic)} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                  <span>{String(row?.topic || 'Unknown')}</span>
                  <span className="font-medium">{formatNumber(row?.count, '0')}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Accuracy by topic" subtitle="Calculated from correctness flags and feedback telemetry">
          {accuracyByTopic.length === 0 ? (
            <EmptyState message="No topic-accuracy data available." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2 pr-4">Topic</th>
                    <th className="py-2 pr-4">Asked</th>
                    <th className="py-2">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyByTopic.map((row: any) => (
                    <tr key={String(row?.topic)} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-800">{String(row?.topic || 'Unknown')}</td>
                      <td className="py-2 pr-4">{formatNumber(row?.count, '0')}</td>
                      <td className="py-2">{formatPercent(row?.accuracy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
};

const renderAiPerformance = (data: any) => {
  const quality = data?.quality;
  const retrieval = data?.retrieval;
  const aiLayer = data?.aiLayer;
  const errors = data?.errors;
  const topFailures = Array.isArray(errors?.topFailurePatterns) ? errors.topFailurePatterns : [];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Correct answers" value={formatPercent(quality?.correctAnswersPct)} />
        <MetricCard label="Incorrect answers" value={formatPercent(quality?.incorrectAnswersPct)} />
        <MetricCard label="Hallucination rate" value={formatPercent(aiLayer?.hallucinationRate)} />
        <MetricCard label="Retrieval failure rate" value={formatPercent(retrieval?.retrievalFailureRate)} />
        <MetricCard label="Avg retrieved docs" value={formatNumber(retrieval?.avgRetrievedDocuments)} />
        <MetricCard label="Logical consistency" value={formatPercent(aiLayer?.logicalConsistencyRate)} />
        <MetricCard label="Verification mismatch" value={formatPercent(aiLayer?.mathVerificationMismatchRate)} />
        <MetricCard label="Flagged answers" value={formatNumber(aiLayer?.userFlaggedAnswers)} />
      </section>

      <Panel title="Top failure patterns" subtitle="Most frequent error flags captured in logs">
        {topFailures.length === 0 ? (
          <EmptyState message="No failure-pattern data available." />
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            {topFailures.map((row: any) => (
              <div key={String(row?.pattern)} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
                <span>{String(row?.pattern || 'unknown')}</span>
                <span className="font-medium">{formatNumber(row?.count, '0')}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

const renderInfrastructure = (data: any) => {
  const system = data?.system;
  const coverage = data?.loggingCoverage;
  const sources = data?.meta?.dataSources;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="API latency" value={formatMs(system?.apiLatencyMs)} />
        <MetricCard label="Model inference" value={formatMs(system?.modelInferenceMs)} />
        <MetricCard label="Error rate" value={formatPercent(system?.errorRate)} />
        <MetricCard label="Queue backlog" value={formatNumber(system?.queueBacklog)} />
        <MetricCard label="GPU utilization" value={formatPercent(system?.gpuUtilization)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Logging coverage" subtitle="Percent of interactions containing required analytics fields">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Topic coverage</span><span className="font-medium">{formatPercent(coverage?.topicCoveragePct)}</span></div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Retrieval coverage</span><span className="font-medium">{formatPercent(coverage?.retrievalCoveragePct)}</span></div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Latency coverage</span><span className="font-medium">{formatPercent(coverage?.latencyCoveragePct)}</span></div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Model-answer coverage</span><span className="font-medium">{formatPercent(coverage?.modelAnswerCoveragePct)}</span></div>
          </div>
        </Panel>

        <Panel title="Data source counts" subtitle="Raw record counts used to compute these metrics">
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Interactions</span><span className="font-medium">{formatNumber(sources?.interactions)}</span></div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Feedback</span><span className="font-medium">{formatNumber(sources?.feedback)}</span></div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2"><span>Events</span><span className="font-medium">{formatNumber(sources?.events)}</span></div>
          </div>
        </Panel>
      </section>
    </div>
  );
};

const renderSafety = (data: any) => {
  const safety = data?.safety;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Harmful prompt detections" value={formatNumber(safety?.harmfulPromptDetectionCount)} />
        <MetricCard label="Bypass attempts" value={formatNumber(safety?.bypassAttempts)} />
        <MetricCard label="Policy violations" value={formatNumber(safety?.policyViolationAttempts)} />
        <MetricCard label="Suspicious spikes" value={formatNumber(safety?.suspiciousUsageSpikes)} />
        <MetricCard label="Misuse patterns" value={formatNumber(safety?.accountMisusePatterns)} />
      </section>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [hideZeroDays, setHideZeroDays] = useState(true);
  const { data, loading, error } = useAdminAnalytics(30);

  const activeContent = useMemo(() => {
    if (activeTab === 'overview') return renderOverview(data, hideZeroDays, () => setHideZeroDays((prev) => !prev));
    if (activeTab === 'learning') return renderLearning(data);
    if (activeTab === 'ai') return renderAiPerformance(data);
    if (activeTab === 'infrastructure') return renderInfrastructure(data);
    return renderSafety(data);
  }, [activeTab, data, hideZeroDays]);

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Authenticated analytics view driven by live backend telemetry.</p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Pipeline status</h3>
            {loading && <span className="text-xs text-slate-500">Refreshing live metrics...</span>}
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-3 text-sm text-slate-600">
              {data ? 'Metrics loaded from authenticated API response.' : 'No authenticated metrics available yet.'}
            </div>
          )}
        </section>

        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm overflow-x-auto">
          <div className="flex flex-nowrap sm:flex-wrap gap-2 min-w-max sm:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeContent}
      </div>
    </div>
  );
};

export default AdminDashboard;
