import { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

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
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-800">
          {t('Contact Us')}
        </h1>
        <p className="text-center text-lg text-gray-600 mb-12">
          {t("Have questions? We're here to help!")}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('Get in Touch')}</h2>
            
            {submitted && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {t('Thank you! Your message has been sent successfully.')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">
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
                <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
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
                <label htmlFor="phone" className="block text-gray-700 font-semibold mb-2">
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

              <div>
                <label htmlFor="message" className="block text-gray-700 font-semibold mb-2">
                  {t('Message')} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="input-field resize-none"
                  placeholder={t('How can we help you?')}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
              >
                {t('Send Message')}
              </button>
            </form>
          </div>

          <div>
            <div className="card mb-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('Contact Information')}</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <FaPhone className="text-2xl text-primary mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-800">{t('Phone')}</h3>
                    <p className="text-gray-600">+91 1800-XXX-XXXX</p>
                    <p className="text-gray-600 text-sm">{t('Mon-Sat, 9 AM - 6 PM')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <FaEnvelope className="text-2xl text-secondary mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-800">{t('Email')}</h3>
                    <p className="text-gray-600">support@ruralhealthcare.org</p>
                    <p className="text-gray-600 text-sm">{t("We'll respond within 24 hours")}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <FaMapMarkerAlt className="text-2xl text-accent mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-800">{t('Address')}</h3>
                    <p className="text-gray-600">{t('Rural Health Center')}</p>
                    <p className="text-gray-600">{t('District Hospital Complex')}</p>
                    <p className="text-gray-600">{t('Main Road, City - 000000')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-r from-primary to-green-600 text-white">
              <h3 className="text-xl font-bold mb-3">{t('Need Immediate Help?')}</h3>
              <p className="mb-4 text-green-100">
                {t('For medical emergencies, please contact your nearest health center or call emergency services.')}
              </p>
              <p className="font-bold text-2xl">{t('Emergency: 108')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
