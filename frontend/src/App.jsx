import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import VillagerDashboard from './pages/VillagerDashboard';
import ASHADashboard from './pages/ASHADashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NotFound from './pages/NotFound';
import { userAPI } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const response = await userAPI.getProfile();
          setUserProfile(response.data);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (loading) {
      return <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>;
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
      return <Navigate to="/" />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} userProfile={userProfile} />
        <Routes>
          <Route path="/" element={<Home user={user} userProfile={userProfile} />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services user={user} userProfile={userProfile} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/dashboard/villager" 
            element={
              <ProtectedRoute allowedRoles={['Villager']}>
                <VillagerDashboard userProfile={userProfile} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard/asha" 
            element={
              <ProtectedRoute allowedRoles={['ASHA Worker']}>
                <ASHADashboard userProfile={userProfile} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard/doctor" 
            element={
              <ProtectedRoute allowedRoles={['Doctor']}>
                <DoctorDashboard userProfile={userProfile} />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
