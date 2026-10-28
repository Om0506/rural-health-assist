import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserMd, FaHeartbeat, FaQrcode, FaComments, FaClock, FaUsers, FaQuoteLeft, FaShieldAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getDashboardPath } from '../utils/navigation';
import Section from '../components/marketing/Section.jsx';
import MarketingCard from '../components/marketing/MarketingCard.jsx';
import Footer from '../components/marketing/Footer.jsx';
import Button from '../components/ui/Button.jsx';

function Home({ user, userProfile }) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(user);
  const dashboardPath = userProfile?.role ? getDashboardPath(userProfile) : null;
  const heroButtonPath = isLoggedIn ? dashboardPath : '/login';
  const ctaPath = isLoggedIn ? dashboardPath : '/login';
  const ctaLabel = isLoggedIn ? t('Dashboard') : t('Login');
  const heroButtonDisabled = isLoggedIn && !dashboardPath;

  return (
    <div className="min-h-screen marketing-bg">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.25),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.22),transparent_55%),radial-gradient(circle_at_60%_90%,rgba(16,185,129,0.14),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:54px_54px]" />

        <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:text-brand-200">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-600 to-teal-500" />
                {t('Digital Healthcare for Rural India')}
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl lg:text-6xl">
                {t('Better Health,')}{' '}
                <span className="gradient-text">{t('Stronger Villages')}</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-secondary sm:text-lg">
                {t('Home hero description')}
              </p>

              <div className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  to={heroButtonPath || undefined}
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={heroButtonDisabled}
                >
                  {t('Get Started')}
                </Button>
                {!isLoggedIn && (
                  <Button to="/register" variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('Register')}
                  </Button>
                )}
                <Button to="/about" variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('Learn More')}
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: t('Villages Benefited'), value: '25K+' },
                  { label: t('ASHA Workers'), value: '1,200+' },
                  { label: t('Health Records'), value: '15K+' },
                ].map((s, idx) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.06, duration: 0.5 }}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <p className="text-lg font-extrabold tracking-tight text-fg sm:text-xl">{s.value}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-muted-fg sm:text-xs">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-500/15 via-cyan-500/10 to-emerald-500/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/60 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/35">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('AI Healthcare Assistant')}</p>
                      <p className="mt-1 text-xl font-extrabold tracking-tight text-fg sm:text-2xl">{t('Instant care guidance')}</p>
                      <p className="mt-2 text-sm text-fg-secondary">{t('Multi-language support')}</p>
                    </div>
                    <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-teal-500 text-white shadow-glow">
                      <FaComments className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/25">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                          <FaShieldAlt className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-fg">{t('Privacy protected')}</p>
                          <p className="text-xs text-muted-fg">{t('Secure records')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-950/25">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                          <FaClock className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-fg">{t('24/7 Support')}</p>
                          <p className="text-xs text-muted-fg">{t('Always available')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-gradient-to-br from-brand-600 to-teal-500 p-[1px]">
                    <div className="rounded-3xl bg-white/80 px-5 py-4 backdrop-blur dark:bg-slate-950/30">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-fg">{t('QR Health Card')}</p>
                          <p className="mt-0.5 text-xs text-muted-fg">{t('Instant access for doctors & ASHA')}</p>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-soft">
                          <FaQrcode className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute left-6 top-6 hidden xl:block">
                <div className="animate-float rounded-3xl border border-white/60 bg-white/70 p-4 shadow-card backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Trusted')}</p>
                  <p className="mt-1 text-sm font-semibold text-fg">{t('10,000+ villagers & workers')}</p>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-6 right-6 hidden xl:block">
                <div className="animate-float-delay rounded-3xl border border-white/60 bg-white/70 p-4 shadow-card backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Care')}</p>
                  <p className="mt-1 text-sm font-semibold text-fg">{t('Connect • Consult • Track')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section
        id="features"
        eyebrow={t('Our Features')}
        title={t('A modern rural healthcare platform')}
        subtitle={t('From AI symptom triage to secure QR-based health access — designed for speed, clarity, and trust.')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <FaComments className="h-5 w-5" />,
              title: t('AI Chatbot'),
              desc: t('AI Chatbot description'),
              tone: 'from-brand-600 to-cyan-500',
            },
            {
              icon: <FaHeartbeat className="h-5 w-5" />,
              title: t('Health Records'),
              desc: t('Health Records description'),
              tone: 'from-cyan-500 to-emerald-500',
            },
            {
              icon: <FaQrcode className="h-5 w-5" />,
              title: t('Digital Health Card'),
              desc: t('Digital Health Card description'),
              tone: 'from-emerald-500 to-brand-600',
            },
            {
              icon: <FaUserMd className="h-5 w-5" />,
              title: t('ASHA Support'),
              desc: t('ASHA Support description'),
              tone: 'from-brand-600 to-emerald-500',
            },
          ].map((f) => (
            <MarketingCard key={f.title} glow>
              <div className="flex items-start gap-4">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${f.tone} text-white shadow-soft`}>
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-fg">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{f.desc}</p>
                </div>
              </div>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        id="services"
        eyebrow={t('Our Services')}
        title={t('Healthcare services designed for real-world rural workflows')}
        subtitle={t('Fast triage, simple access, and a dashboard experience that feels premium on every device.')}
        className="bg-white/35 dark:bg-slate-950/15"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[
            { icon: <FaComments className="h-5 w-5" />, title: t('AI Health Assistant'), desc: t('AI Chatbot description') },
            { icon: <FaQrcode className="h-5 w-5" />, title: t('QR Health Card'), desc: t('Digital Health Card description') },
            { icon: <FaUserMd className="h-5 w-5" />, title: t('Doctor Consultation'), desc: t('Connect with ASHA') },
            { icon: <FaHeartbeat className="h-5 w-5" />, title: t('Health Records'), desc: t('Health Records description') },
            { icon: <FaUsers className="h-5 w-5" />, title: t('ASHA Worker Support'), desc: t('ASHA Support description') },
            { icon: <FaClock className="h-5 w-5" />, title: t('Alerts & Reminders'), desc: t('Real-time notifications') },
          ].map((s) => (
            <MarketingCard key={s.title} className="p-7">
              <div className="flex items-start justify-between gap-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                  {s.icon}
                </div>
                <span className="rounded-full border border-default bg-card-secondary px-3 py-1 text-xs font-semibold text-fg-secondary">
                  {t('Premium')}
                </span>
              </div>
              <p className="mt-5 text-lg font-semibold tracking-tight text-fg">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{s.desc}</p>
              <div className="mt-5">
                <Link to="/services" className="text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">
                  {t('Explore')} →
                </Link>
              </div>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        id="how"
        eyebrow={t('How It Works')}
        title={t('Simple steps to better health')}
        subtitle={t('Designed to be fast for ASHA workers, easy for villagers, and clear for doctors.')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { n: '01', title: t('Create Account'), desc: t('Create your free account in minutes') },
            { n: '02', title: t('Access Services'), desc: t('Use AI chatbot, health records, and QR cards') },
            { n: '03', title: t('Connect with ASHA'), desc: t('Get personalized care from health workers') },
            { n: '04', title: t('Track Your Health'), desc: t('Monitor your health data and get insights') },
          ].map((step) => (
            <MarketingCard key={step.n} className="p-7">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Step')}</span>
                <span className="text-sm font-extrabold tracking-tight text-brand-700 dark:text-brand-200">{step.n}</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-fg">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{step.desc}</p>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        id="testimonials"
        eyebrow={t('Testimonials Title')}
        title={t('Loved by healthcare workers and communities')}
        subtitle={t('A platform that feels modern, while staying practical for rural deployment.')}
        className="bg-white/35 dark:bg-slate-950/15"
        align="center"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { q: t('Testimonial 1'), a: t('Testimonial 1 Author') },
            { q: t('Testimonial 2'), a: t('Testimonial 2 Author') },
            { q: t('Testimonial 3'), a: t('Testimonial 3 Author') },
          ].map((x, idx) => (
            <MarketingCard key={idx} className="p-7">
              <FaQuoteLeft className="h-6 w-6 text-brand-600" />
              <p className="mt-4 text-sm leading-relaxed text-fg-secondary">“{x.q}”</p>
              <p className="mt-6 text-sm font-semibold text-fg">— {x.a}</p>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 p-[1px] shadow-card">
            <div className="relative rounded-[2.5rem] bg-white/80 p-10 backdrop-blur dark:bg-slate-950/35 sm:p-12">
              <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />

              <div className="relative">
                <h3 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                  {t('Ready to Get Started?')}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-secondary sm:text-base">
                  {t('Join thousands message')}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    to={ctaPath || undefined}
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={isLoggedIn && !ctaPath}
                  >
                    {ctaLabel}
                  </Button>
                  <Button to="/services" variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('View Services')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
