import { motion } from 'framer-motion';
import { FaHeartbeat } from 'react-icons/fa';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center shadow-glow">
            <FaHeartbeat className="w-8 h-8 text-white animate-pulse-soft" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-brand-400/30 animate-ping" />
        </div>
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </motion.div>
    </div>
  );
}
