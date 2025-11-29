import { Link } from 'react-router-dom';
import { FaUserMd, FaHeartbeat, FaQrcode, FaComments, FaUserPlus, FaChartLine, FaShieldAlt, FaClock, FaUsers, FaAward, FaQuoteLeft } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getDashboardPath } from '../utils/navigation';

function Home({ user, userProfile }) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(user);
  const dashboardPath = getDashboardPath(userProfile);
  const heroButtonPath = isLoggedIn ? dashboardPath : '/register';
  const ctaPath = isLoggedIn ? dashboardPath : '/login';
  const ctaLabel = isLoggedIn ? t('Dashboard') : t('Login');

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-primary to-green-600 text-white py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('Rural Healthcare Assistance')}
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            {t('Home hero description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={heroButtonPath}
              className="bg-white text-primary px-8 py-3 rounded-lg hover:bg-green-100 transition font-semibold text-lg"
            >
              {t('Get Started')}
            </Link>
            <Link
              to="/about"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-primary transition font-semibold text-lg"
            >
              {t('Learn More')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            {t('Our Features')}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center hover:shadow-xl transition">
              <FaComments className="text-5xl text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('AI Chatbot')}</h3>
              <p className="text-gray-600">
                {t('AI Chatbot description')}
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaHeartbeat className="text-5xl text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('Health Records')}</h3>
              <p className="text-gray-600">
                {t('Health Records description')}
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaQrcode className="text-5xl text-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('Digital Health Card')}</h3>
              <p className="text-gray-600">
                {t('Digital Health Card description')}
              </p>
            </div>

            <div className="card text-center hover:shadow-xl transition">
              <FaUserMd className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('ASHA Support')}</h3>
              <p className="text-gray-600">
                {t('ASHA Support description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            {t('How It Works')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Step 1')}</h3>
              <h4 className="text-lg font-semibold mb-2 text-primary">{t('Create Account')}</h4>
              <p className="text-gray-600">{t('Create your free account in minutes')}</p>
            </div>
            <div className="text-center">
              <div className="bg-secondary text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Step 2')}</h3>
              <h4 className="text-lg font-semibold mb-2 text-secondary">{t('Access Services')}</h4>
              <p className="text-gray-600">{t('Use AI chatbot, health records, and QR cards')}</p>
            </div>
            <div className="text-center">
              <div className="bg-accent text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Step 3')}</h3>
              <h4 className="text-lg font-semibold mb-2 text-accent">{t('Connect with ASHA')}</h4>
              <p className="text-gray-600">{t('Get personalized care from health workers')}</p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Step 4')}</h3>
              <h4 className="text-lg font-semibold mb-2 text-green-600">{t('Track Your Health')}</h4>
              <p className="text-gray-600">{t('Monitor your health data and get insights')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            {t('Benefits Section Title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <FaClock className="text-3xl text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Benefit 1 Title')}</h3>
                  <p className="text-gray-600">{t('Benefit 1 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <FaHeartbeat className="text-3xl text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Benefit 2 Title')}</h3>
                  <p className="text-gray-600">{t('Benefit 2 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <FaUsers className="text-3xl text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Benefit 3 Title')}</h3>
                  <p className="text-gray-600">{t('Benefit 3 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-green-600/10 p-4 rounded-lg">
                  <FaQrcode className="text-3xl text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Benefit 4 Title')}</h3>
                  <p className="text-gray-600">{t('Benefit 4 Description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-green-600 text-white">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t('Statistics Section Title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{t('Stat 1 Number')}</div>
              <div className="text-lg text-green-100">{t('Stat 1 Label')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{t('Stat 2 Number')}</div>
              <div className="text-lg text-green-100">{t('Stat 2 Label')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{t('Stat 3 Number')}</div>
              <div className="text-lg text-green-100">{t('Stat 3 Label')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{t('Stat 4 Number')}</div>
              <div className="text-lg text-green-100">{t('Stat 4 Label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            {t('Testimonials Title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card hover:shadow-xl transition">
              <FaQuoteLeft className="text-4xl text-primary mb-4" />
              <p className="text-gray-700 mb-4 italic">"{t('Testimonial 1')}"</p>
              <p className="font-semibold text-gray-800">— {t('Testimonial 1 Author')}</p>
            </div>
            <div className="card hover:shadow-xl transition">
              <FaQuoteLeft className="text-4xl text-secondary mb-4" />
              <p className="text-gray-700 mb-4 italic">"{t('Testimonial 2')}"</p>
              <p className="font-semibold text-gray-800">— {t('Testimonial 2 Author')}</p>
            </div>
            <div className="card hover:shadow-xl transition">
              <FaQuoteLeft className="text-4xl text-accent mb-4" />
              <p className="text-gray-700 mb-4 italic">"{t('Testimonial 3')}"</p>
              <p className="font-semibold text-gray-800">— {t('Testimonial 3 Author')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
            {t('Ready to Get Started?')}
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('Join thousands message')}
          </p>
          <Link
            to={ctaPath}
            className="btn-primary inline-block"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
