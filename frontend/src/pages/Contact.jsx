import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import Section from '../components/marketing/Section.jsx';
import MarketingCard from '../components/marketing/MarketingCard.jsx';
import Footer from '../components/marketing/Footer.jsx';
import Button from '../components/ui/Button.jsx';

function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen marketing-bg">
      <div className="mx-auto w-full max-w-7xl px-5 pt-10 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:text-brand-200">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-brand-600 to-teal-500" />
            {t('Contact Us')}
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
            {t("Let's talk")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-secondary sm:text-lg">
            {t("Have questions? We're here to help!")}
          </p>
        </motion.div>
      </div>

      <Section
        eyebrow={t('Get in Touch')}
        title={t('Premium support for healthcare workflows')}
        subtitle={t("Share your questions, feedback, or demo requests — we'll respond quickly.")}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MarketingCard className="p-8">
            {submitted && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                {t('Thank you! Your message has been sent successfully.')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="label">
                    {t('Name')} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder={t('Your full name')}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="label">
                    {t('Phone')}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder={t('Your phone number')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="label">
                  {t('Email')} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder={t('your.email@example.com')}
                />
              </div>

              <div>
                <label htmlFor="message" className="label">
                  {t('Message')} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="input-field resize-none"
                  placeholder={t('How can we help you?')}
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                {t('Send Message')}
              </Button>

              <p className="text-xs leading-relaxed text-muted-fg">
                {t('For medical emergencies, please contact your nearest health center or call emergency services.')}
              </p>
            </form>
          </MarketingCard>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: <FaPhone className="h-4 w-4" />,
                  title: t('Phone'),
                  lines: ['+91 1800-XXX-XXXX', t('Mon-Sat, 9 AM - 6 PM')],
                },
                {
                  icon: <FaEnvelope className="h-4 w-4" />,
                  title: t('Email'),
                  lines: ['support@ruralhealthcare.org', t("We'll respond within 24 hours")],
                },
                {
                  icon: <FaMapMarkerAlt className="h-4 w-4" />,
                  title: t('Address'),
                  lines: [t('Rural Health Center'), t('District Hospital Complex'), t('Main Road, City - 000000')],
                },
              ].map((c) => (
                <MarketingCard key={c.title} className="p-7">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                      {c.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-fg">{c.title}</p>
                      <div className="mt-1 space-y-0.5 text-sm text-fg-secondary">
                        {c.lines.map((l) => (
                          <p key={l} className="truncate sm:whitespace-normal">
                            {l}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </MarketingCard>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 p-[1px] shadow-card">
              <div className="relative rounded-[2.5rem] bg-white/80 p-8 backdrop-blur dark:bg-slate-950/35">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />
                <h3 className="text-lg font-semibold text-fg">{t('Need Immediate Help?')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                  {t('For medical emergencies, please contact your nearest health center or call emergency services.')}
                </p>
                <div className="mt-6 rounded-2xl border border-default bg-card-secondary px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Emergency')}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-fg">108</p>
                </div>
              </div>
            </div>

            <MarketingCard className="p-0 overflow-hidden" hover={false}>
              <div className="h-56 w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(6,182,212,0.14),rgba(16,185,129,0.10))]">
                <div className="flex h-full w-full items-center justify-center">
                  <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm font-semibold text-fg shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
                    {t('Map placeholder')}
                  </div>
                </div>
              </div>
            </MarketingCard>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  );
}

export default Contact;
