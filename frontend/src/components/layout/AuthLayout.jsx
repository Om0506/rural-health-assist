import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeartbeat, FaHospitalAlt, FaQrcode, FaShieldAlt, FaUsers } from 'react-icons/fa';

const features = [
  { icon: FaQrcode, title: 'Digital Health Cards', desc: 'Instant QR access to patient records in the field' },
  { icon: FaHeartbeat, title: 'Real-time Vitals', desc: 'Track temperature, BP, and symptoms seamlessly' },
  { icon: FaUsers, title: 'ASHA Coordination', desc: 'Connect workers, doctors, and villagers' },
  { icon: FaShieldAlt, title: 'Secure & Trusted', desc: 'Role-based access with encrypted authentication' },
];

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-auth relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <FaHospitalAlt className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">Rural Health Assist</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Healthcare that reaches every village
            </h2>
            <p className="text-white/80 text-lg max-w-md">
              A modern platform connecting ASHA workers, doctors, and rural communities with digital health records.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/10"
              >
                <f.icon className="w-5 h-5 mb-2 text-teal-200" />
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-white/70 mt-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-mesh dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center">
              <FaHospitalAlt className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Rural Health Assist</span>
          </div>

          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>}
              {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
            </div>
          )}

          <div className="card shadow-card">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
