import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { getTranslation } from '../../utils/translations'

const LandingPage = () => {
  const language = useLanguage()

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -left-24 h-96 w-96 rounded-full bg-[#00b876] opacity-20 blur-[120px]" />
          <div className="absolute top-32 right-0 h-[28rem] w-[28rem] rounded-full bg-[#008751] opacity-25 blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#0a7a4a] opacity-20 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)]" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00b876] to-[#008751] text-lg font-bold">M</div>
            <span className="text-lg font-semibold tracking-wide">MathAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
            >
              {getTranslation('landingSignIn', language)}
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b0f14] transition hover:bg-white/90"
            >
              {getTranslation('landingGetStarted', language)}
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 md:flex-row md:items-center md:pt-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#00b876]" />
              {getTranslation('landingBadge', language)}
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl" style={{ fontFamily: '"Sora", sans-serif' }}>
              {getTranslation('landingHeroTitle', language)}
            </h1>
            <p className="max-w-xl text-base text-white/70 md:text-lg">
              {getTranslation('landingHeroSubtitle', language)}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-gradient-to-r from-[#00b876] to-[#008751] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:translate-y-[-1px]"
              >
                {getTranslation('landingPrimaryCta', language)}
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
              >
                {getTranslation('landingSecondaryCta', language)}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00b876]" />
                {getTranslation('landingTrustOne', language)}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00b876]" />
                {getTranslation('landingTrustTwo', language)}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">{getTranslation('landingDemoLabel', language)}</div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">MathAI</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/70">
                  {getTranslation('landingDemoQuestion', language)}
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0f14] via-[#0e1b14] to-[#0b0f14] p-4 text-sm text-white/80">
                  <p className="text-white/80">{getTranslation('landingDemoAnswerTitle', language)}</p>
                  <p className="mt-2 text-white/60">{getTranslation('landingDemoAnswerBody', language)}</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#00b876]/20 px-3 py-1 text-xs text-[#7ce8b8]">
                    {getTranslation('landingDemoBadge', language)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: getTranslation('landingFeatureOneTitle', language),
              body: getTranslation('landingFeatureOneBody', language),
            },
            {
              title: getTranslation('landingFeatureTwoTitle', language),
              body: getTranslation('landingFeatureTwoBody', language),
            },
            {
              title: getTranslation('landingFeatureThreeTitle', language),
              body: getTranslation('landingFeatureThreeBody', language),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/30"
            >
              <h3 className="text-lg font-semibold" style={{ fontFamily: '"Sora", sans-serif' }}>{item.title}</h3>
              <p className="mt-3 text-sm text-white/65">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1f18] via-[#0b0f14] to-[#0b0f14] p-8">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: '"Sora", sans-serif' }}>
              {getTranslation('landingWorkflowTitle', language)}
            </h2>
            <p className="mt-3 text-sm text-white/65">
              {getTranslation('landingWorkflowSubtitle', language)}
            </p>
            <div className="mt-6 space-y-4">
              {['landingWorkflowStepOne', 'landingWorkflowStepTwo', 'landingWorkflowStepThree'].map((key, index) => (
                <div key={key} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                    0{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{getTranslation(`${key}Title` as any, language)}</p>
                    <p className="mt-1 text-sm text-white/60">{getTranslation(`${key}Body` as any, language)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8">
            <div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: '"Sora", sans-serif' }}>
                {getTranslation('landingCtaTitle', language)}
              </h2>
              <p className="mt-3 text-sm text-white/65">
                {getTranslation('landingCtaBody', language)}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#0b0f14] transition hover:bg-white/90"
              >
                {getTranslation('landingPrimaryCta', language)}
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/20 px-5 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
              >
                {getTranslation('landingSecondaryCta', language)}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
