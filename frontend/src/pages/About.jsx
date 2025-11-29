import { FaHandHoldingHeart, FaBullseye, FaUsers, FaShieldAlt, FaLightbulb, FaHeart, FaChartLine, FaUserFriends } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-gray-800">
          {t('About Us')}
        </h1>

        <div className="max-w-4xl mx-auto mb-12">
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            {t('About Detailed Intro')}
          </p>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            {t('Mission paragraph 1')}
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            {t('Mission paragraph 2')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="card text-center">
            <FaHandHoldingHeart className="text-6xl text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">{t('Our Mission')}</h3>
            <p className="text-gray-600">
              {t('Our mission text')}
            </p>
          </div>

          <div className="card text-center">
            <FaBullseye className="text-6xl text-secondary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">{t('Our Vision')}</h3>
            <p className="text-gray-600">
              {t('Our vision text')}
            </p>
          </div>

          <div className="card text-center">
            <FaUsers className="text-6xl text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">{t('Our Community')}</h3>
            <p className="text-gray-600">
              {t('Our community text')}
            </p>
          </div>
        </div>

        {/* Our Story Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">
            {t('Our Story Title')}
          </h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-lg text-gray-700 leading-relaxed">
              {t('Our Story Paragraph 1')}
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t('Our Story Paragraph 2')}
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t('Our Story Paragraph 3')}
            </p>
          </div>
        </div>

        {/* Our Values Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">
            {t('Our Values Title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <FaShieldAlt className="text-3xl text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Value 1 Title')}</h3>
                  <p className="text-gray-600">{t('Value 1 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-secondary/10 p-4 rounded-lg">
                  <FaHeart className="text-3xl text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Value 2 Title')}</h3>
                  <p className="text-gray-600">{t('Value 2 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <FaUsers className="text-3xl text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Value 3 Title')}</h3>
                  <p className="text-gray-600">{t('Value 3 Description')}</p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-xl transition">
              <div className="flex items-start space-x-4">
                <div className="bg-green-600/10 p-4 rounded-lg">
                  <FaLightbulb className="text-3xl text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{t('Value 4 Title')}</h3>
                  <p className="text-gray-600">{t('Value 4 Description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Section */}
        <div className="mb-12 bg-gradient-to-br from-primary/10 to-green-600/10 rounded-lg p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
            {t('Impact Title')}
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
            {t('Impact Description')}
          </p>
        </div>

        {/* Team Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
            {t('Team Title')}
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
            {t('Team Description')}
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary to-green-600 text-white rounded-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6 text-center">{t('Why Choose Us?')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">{t('Mobile-First Design')}</h4>
                <p className="text-green-100">{t('Mobile first description')}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">{t('AI-Powered Assistance')}</h4>
                <p className="text-green-100">{t('AI assistance description')}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">{t('Digital Health Cards')}</h4>
                <p className="text-green-100">{t('Digital cards description')}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-bold mb-1">{t('ASHA Worker Integration')}</h4>
                <p className="text-green-100">{t('ASHA integration description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
