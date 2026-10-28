import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '../utils/firebase';
import { userAPI } from '../services/api';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const normalizeRole = (role = '') => {
  const value = String(role).trim().toLowerCase();
  if (value === 'villager') return 'Villager';
  if (value === 'asha' || value === 'asha worker') return 'ASHA';
  if (value === 'doctor') return 'Doctor';
  return role;
};

const REMEMBER_KEY = 'rha_remember_email';

function Login() {
  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBER_KEY) || '',
    password: '',
    remember: Boolean(localStorage.getItem(REMEMBER_KEY)),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      setRedirecting(true);
      setError('');

      try {
        let response = null;
        let lastProfileError = null;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            response = await userAPI.getProfile();
            break;
          } catch (err) {
            lastProfileError = err;
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }
        if (!response) throw lastProfileError;

        const userProfile = response.data;
        switch (normalizeRole(userProfile.role)) {
          case 'Villager':
            navigate('/dashboard/villager');
            break;
          case 'ASHA':
            navigate('/dashboard/asha');
            break;
          case 'Doctor':
            navigate('/doctor-dashboard');
            break;
          default:
            navigate('/');
        }
      } catch (profileError) {
        if (profileError?.response?.status === 404) {
          setError('Account created, but profile not found. Please complete registration.');
          navigate('/register');
        } else {
          setError('Login successful, but profile loading failed. Please try again once.');
        }
      } finally {
        setRedirecting(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (formData.remember) {
        localStorage.setItem(REMEMBER_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (authError) {
      console.error('Login error:', authError);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Enter your email address first, then click forgot password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setSuccess('Password reset email sent. Check your inbox.');
      setShowForgot(false);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('Welcome Back')}
      subtitle={t('Login to access your healthcare dashboard')}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </motion.div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm"
        >
          {success}
        </motion.div>
      )}

      {showForgot ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-slate-600">Enter your email to receive a password reset link.</p>
          <Input
            label={t('Email Address')}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            icon={FaEnvelope}
            placeholder={t('your.email@example.com')}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={loading} className="flex-1">
              Send Reset Link
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForgot(false)}>
              Back
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('Email Address')}
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            icon={FaEnvelope}
            placeholder={t('your.email@example.com')}
          />

          <div className="relative">
            <Input
              label={t('Password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              icon={FaLock}
              placeholder={t('Enter your password')}
              className="!pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-600 p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-brand-600 font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" loading={loading || redirecting} className="w-full">
            {loading || redirecting ? t('Logging in...') : t('Login')}
          </Button>
        </form>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-slate-600 text-sm">
          {t("Don't have an account?")}{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            {t('Register here')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
