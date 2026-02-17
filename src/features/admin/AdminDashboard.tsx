import { useMemo, useState } from 'react';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';

type DashboardTab = 'overview' | 'learning' | 'ai' | 'infrastructure' | 'safety';

type MetricCardProps = {
  label: string;
  value: string;
  trend?: string;
};

type ProgressMetricProps = {
  label: string;
  value: number;
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

const ProgressMetric = ({ label, value }: ProgressMetricProps) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900">{value}%</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-emerald-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);

const Panel = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const TrendRow = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-sky-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const topicAccuracy = [
  { topic: 'Algebra', accuracy: 88, mastery: 84, asked: 2540, feedback: 4.4, retrievalFailure: 4.2 },
  { topic: 'Calculus', accuracy: 81, mastery: 76, asked: 2010, feedback: 4.1, retrievalFailure: 6.1 },
  { topic: 'Geometry', accuracy: 85, mastery: 79, asked: 1695, feedback: 4.3, retrievalFailure: 4.8 },
  { topic: 'Statistics', accuracy: 79, mastery: 72, asked: 1430, feedback: 3.9, retrievalFailure: 7.6 },
  { topic: 'Trigonometry', accuracy: 77, mastery: 70, asked: 1210, feedback: 3.8, retrievalFailure: 8.2 },
];

const weakestTopics = [
  { student: 'Ariane K.', topics: 'Trigonometry, Statistics' },
  { student: 'Moussa D.', topics: 'Calculus, Geometry proofs' },
  { student: 'Iris P.', topics: 'Word problems, Fractions' },
];

const renderOverview = () => (
  <div className="space-y-6">
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tab 1 — Overview</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="DAU" value="1,248" trend="+8.4% vs yesterday" />
        <MetricCard label="WAU" value="5,931" trend="+6.1% vs last week" />
        <MetricCard label="Total questions today" value="18,420" />
        <MetricCard label="Overall accuracy rate" value="86.9%" />
        <MetricCard label="System health" value="99.92% uptime" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Active topics" subtitle="Current topic intensity and solved accuracy">
        <ul className="space-y-2 text-sm text-slate-700">
          {topicAccuracy.map((item) => (
            <li key={item.topic} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span>{item.topic}</span>
              <span className="font-medium">{item.accuracy}% solved accuracy</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Engagement snapshot" subtitle="Quick view of usage behavior">
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Session duration" value="17m 23s" />
          <MetricCard label="Questions / session" value="6.8" />
          <MetricCard label="Drop-off per lesson" value="12.7%" />
          <MetricCard label="Peak usage hours" value="7 PM - 10 PM" />
        </div>
      </Panel>
    </section>

  </div>
);

const renderLearning = () => (
  <div className="space-y-6">
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tab 2 — Learning Analytics</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Accuracy rate per student" value="84.3% avg" />
        <MetricCard label="Improvement over time" value="+12.5% in 30 days" />
        <MetricCard label="First-attempt success rate" value="61.4%" />
        <MetricCard label="Hint usage rate" value="39.8%" />
        <MetricCard label="Step-by-step completion rate" value="74.2%" />
        <MetricCard label="Concept retention rate" value="71.6%" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Usage & engagement" subtitle="Questions per day/week, peak hours, and repeat usage">
        <div className="grid grid-cols-1 gap-3">
          <TrendRow label="Mon" value={1980} max={2600} />
          <TrendRow label="Tue" value={2140} max={2600} />
          <TrendRow label="Wed" value={2215} max={2600} />
          <TrendRow label="Thu" value={2390} max={2600} />
          <TrendRow label="Fri" value={2485} max={2600} />
          <TrendRow label="Sat" value={1960} max={2600} />
          <TrendRow label="Sun" value={1750} max={2600} />
        </div>
      </Panel>
      <Panel title="Engagement KPIs" subtitle="Adoption and retention indicators">
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Questions per student" value="14.7 / week" />
          <MetricCard label="Repeat usage rate" value="68.9%" />
          <MetricCard label="Daily returning users" value="42.1%" />
          <MetricCard label="Weekly active learners" value="5,931" />
        </div>
      </Panel>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Topic heatmap" subtitle="Accuracy + mastery by topic">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4">Topic</th>
                <th className="py-2 pr-4">Accuracy</th>
                <th className="py-2">Skill mastery</th>
              </tr>
            </thead>
            <tbody>
              {topicAccuracy.map((row) => (
                <tr key={row.topic} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-800">{row.topic}</td>
                  <td className="py-2 pr-4">{row.accuracy}%</td>
                  <td className="py-2">{row.mastery}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Mastery tracking" subtitle="Learning depth and progression speed">
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Time to mastery" value="9.3 days median" />
          <MetricCard label="Learning velocity score" value="7.9 / 10" />
          <MetricCard label="Conceptual understanding index" value="78.4 / 100" />
          <MetricCard label="AI trust score" value="82.1 / 100" />
        </div>
      </Panel>
    </section>

    <section>
      <Panel title="Weakest topics per student" subtitle="Targeted intervention candidates">
      <ul className="space-y-2 text-sm text-slate-700">
        {weakestTopics.map((row) => (
          <li key={row.student} className="rounded bg-slate-50 px-3 py-2">
            <span className="font-medium text-slate-900">{row.student}</span> — {row.topics}
          </li>
        ))}
      </ul>
      </Panel>
    </section>
  </div>
);

const renderAiPerformance = () => (
  <div className="space-y-6">
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tab 3 — AI Performance</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Model accuracy by topic" value="86.9% weighted" />
        <MetricCard label="Accuracy by difficulty" value="Easy 93% / Hard 74%" />
        <MetricCard label="Error rate by question type" value="9.8% avg" />
        <MetricCard label="Hallucination rate" value="1.9%" />
        <MetricCard label="% Correct answers" value="84.8%" />
        <MetricCard label="% Incorrect answers" value="15.2%" />
        <MetricCard label="Step-by-step correctness" value="83.7%" />
        <MetricCard label="Logical consistency rate" value="91.2%" />
        <MetricCard label="Math verification mismatch" value="2.4%" />
        <MetricCard label="Re-asked question frequency" value="18.3%" />
        <MetricCard label="Teacher-reviewed sample accuracy" value="87.6%" />
        <MetricCard label="Model-evaluated correctness" value="89.1%" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Retrieval performance (RAG-specific)" subtitle="Diagnose retrieval vs generation failures">
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Avg retrieved documents" value="5.2" />
          <MetricCard label="Retrieval failure rate" value="6.4%" />
          <MetricCard label="Similarity score p50 / p90" value="0.78 / 0.91" />
          <MetricCard label="Incorrect answer but retrieval correct" value="3.1%" />
        </div>
      </Panel>
      <Panel title="Similarity distribution" subtitle="Proxy for retrieval confidence">
        <div className="grid grid-cols-1 gap-3">
          <ProgressMetric label="0.90 - 1.00" value={29} />
          <ProgressMetric label="0.80 - 0.89" value={38} />
          <ProgressMetric label="0.70 - 0.79" value={20} />
          <ProgressMetric label="< 0.70" value={13} />
        </div>
      </Panel>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Model drift monitoring" subtitle="Distribution and degradation alerts">
        <div className="grid grid-cols-1 gap-3">
          <ProgressMetric label="Confidence distribution shift" value={22} />
          <ProgressMetric label="Error spike alert level" value={37} />
          <ProgressMetric label="Topic-level degradation" value={19} />
        </div>
      </Panel>

      <Panel title="Feedback loop" subtitle="How users and teachers signal quality gaps">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="rounded bg-slate-50 px-3 py-2">User flagged answers: <span className="font-semibold">142 / day</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Teacher correction rate: <span className="font-semibold">6.7%</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Correction frequency: <span className="font-semibold">0.31 per session</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Flag rate: <span className="font-semibold">0.77%</span></li>
        </ul>
      </Panel>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Topic-level analysis" subtitle="Find weak knowledge areas quickly">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4">Topic</th>
                <th className="py-2 pr-4">Asked</th>
                <th className="py-2 pr-4">Accuracy</th>
                <th className="py-2 pr-4">Feedback</th>
                <th className="py-2">Retrieval failures</th>
              </tr>
            </thead>
            <tbody>
              {topicAccuracy.map((row) => (
                <tr key={row.topic} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-800">{row.topic}</td>
                  <td className="py-2 pr-4">{row.asked}</td>
                  <td className="py-2 pr-4">{row.accuracy}%</td>
                  <td className="py-2 pr-4">{row.feedback} / 5</td>
                  <td className="py-2">{row.retrievalFailure}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Error & failure analysis" subtitle="Most recurring failure patterns and examples">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="rounded bg-slate-50 px-3 py-2">Wrong final numeric answer — 28% of flagged responses</li>
          <li className="rounded bg-slate-50 px-3 py-2">Hallucinated formulas — 21% of flagged responses</li>
          <li className="rounded bg-slate-50 px-3 py-2">Irrelevant retrieval — 19% of flagged responses</li>
          <li className="rounded bg-slate-50 px-3 py-2">Incomplete solution steps — 17% of flagged responses</li>
          <li className="rounded bg-slate-50 px-3 py-2">Timeout/API failures — 15% of flagged responses</li>
        </ul>
      </Panel>
    </section>

    <section>
      <Panel title="Performance over time" subtitle="Track impact after prompt/retrieval updates">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Accuracy trend (30d)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">+4.7 pts</p>
          </div>
          <div className="rounded bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Feedback trend (30d)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">+0.3 / 5</p>
          </div>
          <div className="rounded bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Latency trend (30d)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">-180 ms p95</p>
          </div>
        </div>
      </Panel>
    </section>
  </div>
);

const renderInfrastructure = () => (
  <div className="space-y-6">
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tab 4 — Infrastructure</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="API latency" value="248 ms p95" />
        <MetricCard label="Model inference time" value="1.82 s p95" />
        <MetricCard label="GPU utilization" value="71%" />
        <MetricCard label="Error rate (500/timeout)" value="0.43%" />
        <MetricCard label="Queue backlog" value="34 requests" />
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Usage metrics</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total queries per day" value="62,410" />
        <MetricCard label="Tokens / user / day" value="18,240" />
        <MetricCard label="Image uploads vs text" value="21% vs 79%" />
        <MetricCard label="Peak usage hours" value="7 PM - 10 PM" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Logging pipeline health" subtitle="Data completeness needed for reliable analytics">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="rounded bg-slate-50 px-3 py-2">Events captured with user_id + timestamp: <span className="font-semibold">99.4%</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Topic classification coverage: <span className="font-semibold">94.1%</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Feedback signal coverage: <span className="font-semibold">62.8%</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Retrieval-doc IDs logged: <span className="font-semibold">91.7%</span></li>
        </ul>
      </Panel>
      <Panel title="Operational alerts" subtitle="Infrastructure incidents affecting student experience">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="rounded bg-slate-50 px-3 py-2">Error spike detected in Calculus pipeline (resolved)</li>
          <li className="rounded bg-slate-50 px-3 py-2">Queue backlog &gt; 100 requests for 12 minutes (investigate autoscaling)</li>
          <li className="rounded bg-slate-50 px-3 py-2">GPU saturation alert triggered twice in last 24h</li>
        </ul>
      </Panel>
    </section>
  </div>
);

const renderSafety = () => (
  <div className="space-y-6">
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tab 5 — Safety</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Harmful prompt detections" value="67" />
        <MetricCard label="Bypass attempts" value="49" />
        <MetricCard label="Policy violation attempts" value="88" />
        <MetricCard label="Suspicious usage spikes" value="6" />
        <MetricCard label="Account misuse patterns" value="12 cases" />
      </div>
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Safety watchlist</h3>
      <ul className="space-y-2 text-sm text-slate-700">
        <li className="rounded bg-slate-50 px-3 py-2">Policy violation stats: <span className="font-semibold">0.14% of daily prompts</span></li>
        <li className="rounded bg-slate-50 px-3 py-2">Suspicious activity alerts: <span className="font-semibold">3 high-priority alerts today</span></li>
        <li className="rounded bg-slate-50 px-3 py-2">Misuse follow-up completion: <span className="font-semibold">92%</span></li>
      </ul>
    </section>
  </div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const { data, loading, error } = useAdminAnalytics(30);

  const liveOverview = data?.overview;
  const liveCoverage = data?.loggingCoverage;

  const fmtNum = (value: unknown, fallback = '0') => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Intl.NumberFormat().format(value);
  };

  const fmtPct = (value: unknown, fallback = '0%') => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return `${value.toFixed(1)}%`;
  };

  const activeContent = useMemo(() => {
    if (activeTab === 'overview') return renderOverview();
    if (activeTab === 'learning') return renderLearning();
    if (activeTab === 'ai') return renderAiPerformance();
    if (activeTab === 'infrastructure') return renderInfrastructure();
    return renderSafety();
  }, [activeTab]);

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Math RAG analytics command center: student outcomes, retrieval quality, model behavior, infra reliability, and safety risk.</p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Live total questions" value={fmtNum(liveOverview?.totalQuestions)} />
          <MetricCard label="Live DAU" value={fmtNum(liveOverview?.dau)} />
          <MetricCard label="Live WAU" value={fmtNum(liveOverview?.wau)} />
          <MetricCard label="Live avg response" value={`${fmtNum(liveOverview?.avgResponseTimeMs)} ms`} />
          <MetricCard label="Live satisfaction" value={fmtPct(liveOverview?.userSatisfactionRate)} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Pipeline status</h3>
            {loading && <span className="text-xs text-slate-500">Refreshing live metrics...</span>}
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
              <div className="rounded bg-slate-50 px-3 py-2">Topic coverage: <span className="font-semibold">{fmtPct(liveCoverage?.topicCoveragePct)}</span></div>
              <div className="rounded bg-slate-50 px-3 py-2">Retrieval coverage: <span className="font-semibold">{fmtPct(liveCoverage?.retrievalCoveragePct)}</span></div>
              <div className="rounded bg-slate-50 px-3 py-2">Latency coverage: <span className="font-semibold">{fmtPct(liveCoverage?.latencyCoveragePct)}</span></div>
              <div className="rounded bg-slate-50 px-3 py-2">Model-answer coverage: <span className="font-semibold">{fmtPct(liveCoverage?.modelAnswerCoveragePct)}</span></div>
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