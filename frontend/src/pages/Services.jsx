import { Link } from 'react-router-dom';
import { FaComments, FaQrcode, FaClipboardList, FaBell, FaUserNurse, FaChartLine } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getDashboardPath } from '../utils/navigation';

function Services({ user, userProfile }) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(user);
  const dashboardPath = getDashboardPath(userProfile);
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
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-800">
          {t('Our Services')}
        </h1>
        <p className="text-center text-lg text-gray-600 mb-4 max-w-3xl mx-auto">
          {t('Services intro')}
        </p>
        <p className="text-center text-base text-gray-500 mb-12 max-w-3xl mx-auto">
          {t('Services Detailed Intro')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="card hover:shadow-xl transition-shadow">
              <div className="mb-4">
                {service.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">
                {service.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Service Benefits Section */}
        <div className="mt-16 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">
            {t('Service Benefits Title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 1')}</p>
              </div>
            </div>
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 2')}</p>
              </div>
            </div>
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 3')}</p>
              </div>
            </div>
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 4')}</p>
              </div>
            </div>
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 5')}</p>
              </div>
            </div>
            <div className="card hover:shadow-lg transition">
              <div className="flex items-start space-x-3">
                <span className="text-primary text-xl font-bold">✓</span>
                <p className="text-gray-700">{t('Service Benefit 6')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* How Services Work Together */}
        <div className="mt-12 mb-12 bg-gradient-to-br from-primary/10 to-green-600/10 rounded-lg p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
            {t('How Services Work Title')}
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
            {t('Service Integration Description')}
          </p>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-primary to-green-600 rounded-lg p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('Ready to Access These Services?')}
          </h2>
          <p className="text-lg mb-6 text-green-100">
            {t('Create your account today and start managing your health digitally')}
          </p>
          <Link
            to={ctaPath}
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg hover:bg-green-100 transition font-semibold text-lg"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Services;
