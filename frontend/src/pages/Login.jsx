import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { userAPI } from '../services/api';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First: authenticate with Firebase
      await signInWithEmailAndPassword(auth, formData.email, formData.password);

      // Then: try to fetch the user profile to decide where to navigate.
      // If profile fetching fails, we still consider login successful and
      // let the global auth listener in App.jsx handle things.
      try {
        const response = await userAPI.getProfile();
        const userProfile = response.data;

        switch (userProfile.role) {
          case 'Villager':
            navigate('/dashboard/villager');
            break;
          case 'ASHA Worker':
            navigate('/dashboard/asha');
            break;
          case 'Doctor':
            navigate('/dashboard/doctor');
            break;
          default:
            navigate('/');
        }
      } catch (profileError) {
        console.error('Profile fetch error after login:', profileError);

        // If the backend says "User not found", redirect to registration
        // so the user can complete their profile.
        if (profileError?.response?.status === 404) {
          setError('Account created, but profile not found. Please complete registration.');
          navigate('/register');
        } else {
          // For other errors, don't block login – just go to home.
          navigate('/');
        }
      }
    } catch (authError) {
      console.error('Login error:', authError);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary to-green-600">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          {t('Welcome Back')}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {t('Login to access your healthcare dashboard')}
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
              {t('Email Address')}
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder={t('your.email@example.com')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
              {t('Password')}
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder={t('Enter your password')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('Logging in...') : t('Login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t("Don't have an account?")}{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              {t('Register here')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
