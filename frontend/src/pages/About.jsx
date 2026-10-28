import { motion } from 'framer-motion';
import { FaHandHoldingHeart, FaBullseye, FaUsers, FaShieldAlt, FaLightbulb, FaHeart } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import Section from '../components/marketing/Section.jsx';
import MarketingCard from '../components/marketing/MarketingCard.jsx';
import Footer from '../components/marketing/Footer.jsx';

function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen marketing-bg">
      <div className="mx-auto w-full max-w-7xl px-5 pt-10 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:text-brand-200">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-600 to-teal-500" />
            {t('About Us')}
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
            {t('Building trust-first healthcare for rural communities')}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-secondary sm:text-lg">
            {t('About Detailed Intro')}
          </p>
        </motion.div>
      </div>

      <Section
        eyebrow={t('Our Mission')}
        title={t('A mission-driven platform with a premium experience')}
        subtitle={t('We combine AI assistance, QR-first identity, and structured records to make rural healthcare easier to deliver.')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { icon: <FaHandHoldingHeart className="h-5 w-5" />, title: t('Our Mission'), desc: t('Our mission text'), tone: 'from-emerald-500 to-cyan-500' },
            { icon: <FaBullseye className="h-5 w-5" />, title: t('Our Vision'), desc: t('Our vision text'), tone: 'from-brand-600 to-cyan-500' },
            { icon: <FaUsers className="h-5 w-5" />, title: t('Our Community'), desc: t('Our community text'), tone: 'from-cyan-500 to-emerald-500' },
          ].map((c) => (
            <MarketingCard key={c.title} glow>
              <div className="flex items-start gap-4">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tone} text-white shadow-soft`}>
                  {c.icon}
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-fg">{c.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{c.desc}</p>
                </div>
              </div>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t('Impact Title')}
        title={t('Real impact, measurable outcomes')}
        subtitle={t('Impact Description')}
        align="center"
        className="bg-white/35 dark:bg-slate-950/15"
      >
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {[
            { label: t('Villages Benefited'), value: '25K+' },
            { label: t('ASHA Workers'), value: '1,200+' },
            { label: t('Partner Doctors'), value: '350+' },
            { label: t('Health Records'), value: '15K+' },
          ].map((s) => (
            <MarketingCard key={s.label} className="p-6 text-center" hover={false}>
              <p className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t('Our Values Title')}
        title={t('Values that shape the product')}
        subtitle={t('Built for clarity, safety, and a delightful experience — even on low-end devices.')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[
            { icon: <FaShieldAlt className="h-4 w-4" />, title: t('Value 1 Title'), desc: t('Value 1 Description') },
            { icon: <FaHeart className="h-4 w-4" />, title: t('Value 2 Title'), desc: t('Value 2 Description') },
            { icon: <FaUsers className="h-4 w-4" />, title: t('Value 3 Title'), desc: t('Value 3 Description') },
            { icon: <FaLightbulb className="h-4 w-4" />, title: t('Value 4 Title'), desc: t('Value 4 Description') },
          ].map((v) => (
            <MarketingCard key={v.title} className="p-7">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                  {v.icon}
                </span>
                <div>
                  <p className="text-base font-semibold text-fg">{v.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{v.desc}</p>
                </div>
              </div>
            </MarketingCard>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t('Why Choose Us?')}
        title={t('Premium UX, practical deployment')}
        subtitle={t('A startup-quality UI that still respects rural connectivity, devices, and workflows.')}
        className="pb-10"
      >
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 p-[1px] shadow-card">
          <div className="relative rounded-[2.5rem] bg-white/80 p-10 backdrop-blur dark:bg-slate-950/35 sm:p-12">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { title: t('Mobile-First Design'), desc: t('Mobile first description') },
                { title: t('AI-Powered Assistance'), desc: t('AI assistance description') },
                { title: t('Digital Health Cards'), desc: t('Digital cards description') },
                { title: t('ASHA Worker Integration'), desc: t('ASHA integration description') },
              ].map((x) => (
                <div key={x.title} className="flex items-start gap-3 rounded-2xl bg-white/60 p-5 shadow-soft backdrop-blur dark:bg-slate-950/20">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 font-extrabold shadow-soft">
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-fg">{x.title}</p>
                    <p className="mt-1 text-sm text-fg-secondary">{x.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}

export default About;
