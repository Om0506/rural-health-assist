import { motion } from 'framer-motion';
import { FaComments, FaQrcode, FaClipboardList, FaBell, FaUserNurse, FaChartLine, FaUserMd } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getDashboardPath } from '../utils/navigation';
import Section from '../components/marketing/Section.jsx';
import MarketingCard from '../components/marketing/MarketingCard.jsx';
import Footer from '../components/marketing/Footer.jsx';
import Button from '../components/ui/Button.jsx';

function Services({ user, userProfile }) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(user);
  const dashboardPath = userProfile?.role ? getDashboardPath(userProfile) : null;
  const ctaPath = isLoggedIn ? dashboardPath : '/login';
  const ctaLabel = isLoggedIn ? t('Dashboard') : t('Login');

  const services = [
    {
      icon: <FaComments className="text-5xl text-primary" />,
      title: t('AI Health Chatbot'),
      description: t('AI Health Chatbot long description'),
      features: [
        t('Symptom analysis'),
        t('Health advice for common ailments'),
        t('Escalation to ASHA workers when needed'),
        t('WhatsApp-like interface')
      ]
    },
    {
      icon: <FaQrcode className="text-5xl text-secondary" />,
      title: t('Digital Health Card'),
      description: t('Digital Health Card long description'),
      features: [
        t('Instant QR code generation'),
        t('Secure health data storage'),
        t('Easy scanning and access'),
        t('Mobile-friendly display')
      ]
    },
    {
      icon: <FaClipboardList className="text-5xl text-accent" />,
      title: t('Health Records Management'),
      description: t('Health Records Management description'),
      features: [
        t('Store vitals and health data'),
        t('Access records on any device'),
        t('History tracking'),
        t('Secure cloud storage')
      ]
    },
    {
      icon: <FaBell className="text-5xl text-green-600" />,
      title: t('Notification System'),
      description: t('Notification System description'),
      features: [
        t('Real-time notifications'),
        t('Health record updates'),
        t('Appointment reminders'),
        t('Emergency alerts')
      ]
    },
    {
      icon: <FaUserNurse className="text-5xl text-purple-600" />,
      title: t('ASHA Worker Support'),
      description: t('ASHA Worker Support description'),
      features: [
        t('Direct communication'),
        t('Case flagging for urgent issues'),
        t('Health monitoring'),
        t('Personalized care')
      ]
    },
    {
      icon: <FaChartLine className="text-5xl text-blue-600" />,
      title: t('Health Tracking'),
      description: t('Health Tracking description'),
      features: [
        t('Vital signs tracking'),
        t('Health trends analysis'),
        t('Progress monitoring'),
        t('Data visualization')
      ]
    }
  ];

  return (
    <div className="min-h-screen marketing-bg">
      <div className="mx-auto w-full max-w-7xl px-5 pt-10 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:text-brand-200">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-600 to-teal-500" />
            {t('Our Services')}
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
            {t('Healthcare services that feel premium')}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-secondary sm:text-lg">
            {t('Services Detailed Intro')}
          </p>
        </motion.div>
      </div>

      <Section
        eyebrow={t('Services intro')}
        title={t('A complete care stack')}
        subtitle={t('Modern card-first layouts, smooth interactions, and workflows tailored for villagers, ASHA workers, and doctors.')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <MarketingCard key={index} className="p-7" glow>
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600/15 to-teal-500/15 text-brand-700 ring-1 ring-brand-500/10 dark:text-brand-200">
                  <div className="text-brand-600 dark:text-brand-200">{service.icon}</div>
                </div>
                <span className="rounded-full border border-default bg-card-secondary px-3 py-1 text-xs font-semibold text-fg-secondary">
                  {t('Modern')}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight text-fg">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{service.description}</p>

              <ul className="mt-5 space-y-2">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-fg-secondary">
                    <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                      ✓
                    </span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t('Service Benefits Title')}
        title={t('Built for rural speed and safety')}
        subtitle={t('Service Integration Description')}
        className="bg-white/35 dark:bg-slate-950/15"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <MarketingCard key={n} className="p-6" hover={false}>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                  <FaChartLine className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-fg-secondary">{t(`Service Benefit ${n}`)}</p>
              </div>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t('Ready to Access These Services?')}
        title={t('Launch a premium dashboard experience')}
        subtitle={t('Create your account today and start managing your health digitally')}
        className="pb-10"
      >
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 p-[1px] shadow-card">
          <div className="relative rounded-[2.5rem] bg-white/80 p-10 backdrop-blur dark:bg-slate-950/35 sm:p-12">
            <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />

            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Premium healthcare platform')}</p>
                <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">{t('Ready to Get Started?')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-secondary sm:text-base">{t('Join thousands message')}</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button
                  to={ctaPath || undefined}
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isLoggedIn && !ctaPath}
                >
                  {ctaLabel}
                </Button>
                <Button to="/contact" variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('Contact')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}

export default Services;
