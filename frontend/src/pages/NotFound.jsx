import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaSearch } from 'react-icons/fa';
import Button from '../components/ui/Button';

function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-mesh">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <div className="relative inline-block mb-6">
          <span className="text-[120px] sm:text-[160px] font-black gradient-text leading-none opacity-20">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center shadow-glow">
              <FaSearch className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/">
          <Button className="gap-2">
            <FaHome />
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

export default NotFound;
