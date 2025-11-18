import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { FaBars, FaTimes, FaHospitalAlt } from 'react-icons/fa';

function Navbar({ user, userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getDashboardPath = () => {
    if (!userProfile) return '/';
    
    switch (userProfile.role) {
      case 'Villager':
        return '/dashboard/villager';
      case 'ASHA Worker':
        return '/dashboard/asha';
      case 'Doctor':
        return '/dashboard/doctor';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
            <FaHospitalAlt className="text-2xl" />
            <span className="hidden sm:inline">Rural Healthcare</span>
            <span className="sm:hidden">RHA</span>
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-2xl focus:outline-none"
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-green-200 transition">Home</Link>
            <Link to="/about" className="hover:text-green-200 transition">About</Link>
            <Link to="/services" className="hover:text-green-200 transition">Services</Link>
            <Link to="/contact" className="hover:text-green-200 transition">Contact</Link>
            
            {user ? (
              <>
                <Link 
                  to={getDashboardPath()} 
                  className="hover:text-green-200 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link
              to="/"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              to="/services"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/contact"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            
            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  className="block hover:text-green-200 transition"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold text-center"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
