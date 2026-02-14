import { useMemo, useState } from 'react';

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

const topicAccuracy = [
  { topic: 'Algebra', accuracy: 88, mastery: 84 },
  { topic: 'Calculus', accuracy: 81, mastery: 76 },
  { topic: 'Geometry', accuracy: 85, mastery: 79 },
  { topic: 'Statistics', accuracy: 79, mastery: 72 },
  { topic: 'Trigonometry', accuracy: 77, mastery: 70 },
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
        <MetricCard label="Overall model accuracy" value="86.9%" />
        <MetricCard label="System health" value="99.92% uptime" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Active topics</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          {topicAccuracy.map((item) => (
            <li key={item.topic} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span>{item.topic}</span>
              <span className="font-medium">{item.accuracy}% solved accuracy</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Engagement snapshot</h3>
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Session duration" value="17m 23s" />
          <MetricCard label="Questions / session" value="6.8" />
          <MetricCard label="Drop-off per lesson" value="12.7%" />
          <MetricCard label="Peak usage hours" value="7 PM - 10 PM" />
        </div>
      </div>
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
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Topic heatmap (accuracy + mastery)</h3>
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
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Mastery tracking</h3>
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Time to mastery" value="9.3 days median" />
          <MetricCard label="Learning velocity score" value="7.9 / 10" />
          <MetricCard label="Conceptual understanding index" value="78.4 / 100" />
          <MetricCard label="AI trust score" value="82.1 / 100" />
        </div>
      </div>
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Weakest topics per student</h3>
      <ul className="space-y-2 text-sm text-slate-700">
        {weakestTopics.map((row) => (
          <li key={row.student} className="rounded bg-slate-50 px-3 py-2">
            <span className="font-medium text-slate-900">{row.student}</span> — {row.topics}
          </li>
        ))}
      </ul>
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
        <MetricCard label="Step-by-step correctness" value="83.7%" />
        <MetricCard label="Logical consistency rate" value="91.2%" />
        <MetricCard label="Math verification mismatch" value="2.4%" />
        <MetricCard label="Re-asked question frequency" value="18.3%" />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Model drift monitoring</h3>
        <div className="grid grid-cols-1 gap-3">
          <ProgressMetric label="Confidence distribution shift" value={22} />
          <ProgressMetric label="Error spike alert level" value={37} />
          <ProgressMetric label="Topic-level degradation" value={19} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Feedback loop</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="rounded bg-slate-50 px-3 py-2">User flagged answers: <span className="font-semibold">142 / day</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Teacher correction rate: <span className="font-semibold">6.7%</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Correction frequency: <span className="font-semibold">0.31 per session</span></li>
          <li className="rounded bg-slate-50 px-3 py-2">Flag rate: <span className="font-semibold">0.77%</span></li>
        </ul>
      </div>
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
          <p className="mt-1 text-sm text-slate-600">Learning analytics, AI quality metrics, infrastructure health, and safety moderation insights.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
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