import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '../utils/firebase';
import { userAPI, villageAPI } from '../services/api';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaUserTag, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import AuthLayout from '../components/layout/AuthLayout';
import Input, { Select } from '../components/ui/Input';
import Button from '../components/ui/Button';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    phone: '',
    role: 'Villager',
    village_id: '',
    worker_id: '',
  });
  const [villages, setVillages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const loadVillages = async () => {
      try {
        const response = await villageAPI.getAll();
        setVillages(response.data || []);
      } catch {
        setVillages([]);
      }
    };
    loadVillages();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('Passwords do not match'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('Password must be at least 6 characters'));
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      await userAPI.register({
        name: formData.name,
        age: parseInt(formData.age, 10),
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
        village_id: formData.village_id || null,
        worker_id: formData.worker_id || null,
      });

      switch (formData.role) {
        case 'Villager':
          navigate('/dashboard/villager');
          break;
        case 'ASHA Worker':
        case 'ASHA':
          navigate('/dashboard/asha');
          break;
        case 'Doctor':
          navigate('/doctor-dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError(t('Email already in use. Please use a different email or login.'));
      } else {
        setError(t('Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('Create Account')}
      subtitle={t('Join our healthcare community today')}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t('Full Name')} *`}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            icon={FaUser}
            placeholder={t('Your full name')}
          />
          <Input
            label={`${t('Email Address')} *`}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            icon={FaEnvelope}
            placeholder={t('your.email@example.com')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t('Age')} *`}
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
            min="1"
            max="120"
            placeholder={t('Your age')}
          />
          <Input
            label={`${t('Phone Number')} *`}
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            icon={FaPhone}
            placeholder={t('Your phone number')}
          />
        </div>

        <Select
          label={`${t('Select Your Role')} *`}
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <option value="Villager">{t('Villager')}</option>
          <option value="ASHA">{t('ASHA Worker')}</option>
          <option value="Doctor">{t('Doctor')}</option>
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Village"
            name="village_id"
            value={formData.village_id}
            onChange={handleChange}
            required={formData.role === 'Villager'}
          >
            <option value="">Select village</option>
            {villages.map((village) => (
              <option key={village.id} value={village.id}>
                {village.village_name}
              </option>
            ))}
          </Select>

          {formData.role === 'ASHA' && (
            <Input
              label="ASHA Worker ID"
              name="worker_id"
              value={formData.worker_id}
              onChange={handleChange}
              placeholder="ASHA-001"
              required
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label={`${t('Password')} *`}
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              icon={FaLock}
              placeholder={t('At least 6 characters')}
              className="!pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Toggle password"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <Input
            label={`${t('Confirm Password')} *`}
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            icon={FaLock}
            placeholder={t('Re-enter password')}
          />
        </div>

        <Button type="submit" loading={loading} className="w-full sticky bottom-0">
          {loading ? t('Creating Account...') : t('Register')}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-slate-600 text-sm">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            {t('Login here')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Register;
