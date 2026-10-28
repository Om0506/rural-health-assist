import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import Navbar from './components/Navbar';
import AppShell from './components/layout/AppShell';
import LoadingScreen from './components/layout/LoadingScreen';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import VillagerDashboard from './pages/VillagerDashboard';
import ASHADashboard from './pages/ASHADashboard';
import AshaAiFlagged from './pages/asha/AshaAiFlagged';
import DoctorLayout from './pages/doctor/DoctorLayout';
import DoctorOverview from './pages/doctor/DoctorOverview';
import DoctorEscalated from './pages/doctor/DoctorEscalated';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorInsights from './pages/doctor/DoctorInsights';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorNotifications from './pages/doctor/DoctorNotifications';
import NotFound from './pages/NotFound';
import { userAPI } from './services/api';
import PatientProfile from './pages/PatientProfile';
import VillageRecords from './pages/VillageRecords';
import AddHealthRecord from './pages/AddHealthRecord';
import MedicineLog from './pages/MedicineLog';
import DailyVisits from './pages/DailyVisits';
import PatientSearch from './pages/PatientSearch';
import { ScanProvider, useScan } from './context/ScanContext';
import { TopbarProvider } from './context/TopbarContext';
import { isAuthPath, isDashboardPath } from './utils/roleNav';

const normalizeRole = (role = '') => {
  const value = String(role).trim().toLowerCase();
  if (value === 'villager') return 'Villager';
  if (value === 'asha' || value === 'asha worker') return 'ASHA';
  if (value === 'doctor') return 'Doctor';
  return role;
};

function AppRoutes({ user, userProfile, loading }) {
  const location = useLocation();
  const { requestScan } = useScan();
  const showNavbar = !isAuthPath(location.pathname) && !isDashboardPath(location.pathname);
  const showAppShell = user && isDashboardPath(location.pathname);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }, [location.pathname]);

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (loading) {
      return <LoadingScreen message="Authenticating..." />;
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    if (allowedRoles && userProfile) {
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
      const normalizedUserRole = normalizeRole(userProfile.role);
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        return <Navigate to="/" />;
      }
    }

    return children;
  };

  const pageContent = (
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
            <VillagerDashboard userProfile={userProfile} user={user} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/asha"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA']}>
            <ASHADashboard userProfile={userProfile} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/:patientId"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <PatientProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/asha/flagged-cases"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA']}>
            <AshaAiFlagged />
          </ProtectedRoute>
        }
      />

      <Route path="/asha/ai-flagged" element={<Navigate to="/asha/flagged-cases" replace />} />

      <Route
        path="/asha/village-records"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <VillageRecords />
          </ProtectedRoute>
        }
      />

      <Route
        path="/asha/health-record/add"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <AddHealthRecord />
          </ProtectedRoute>
        }
      />

      <Route
        path="/asha/medicine-log"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <MedicineLog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/asha/daily-visits"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <DailyVisits userProfile={userProfile} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/asha/patient-search"
        element={
          <ProtectedRoute allowedRoles={['ASHA Worker', 'ASHA', 'Doctor']}>
            <PatientSearch />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/doctor"
        element={<Navigate to="/doctor-dashboard" replace />}
      />

      <Route
        element={
          <ProtectedRoute allowedRoles={['Doctor']}>
            <DoctorLayout userProfile={userProfile} />
          </ProtectedRoute>
        }
      >
        <Route path="/doctor-dashboard" element={<DoctorOverview />} />
        <Route path="/doctor/escalated" element={<DoctorEscalated />} />
        <Route path="/doctor/patients" element={<DoctorPatients />} />
        <Route path="/doctor/insights" element={<DoctorInsights />} />
        <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        <Route path="/doctor/notifications" element={<DoctorNotifications />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <div className="min-h-screen bg-app">
      {showNavbar && <Navbar user={user} userProfile={userProfile} />}
      {showAppShell ? (
        <AppShell user={user} userProfile={userProfile} onScanRequest={requestScan}>
          {pageContent}
        </AppShell>
      ) : (
        pageContent
      )}
    </div>
  );
}

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

  return (
    <Router>
      <TopbarProvider>
        <ScanProvider>
          <AppRoutes user={user} userProfile={userProfile} loading={loading} />
        </ScanProvider>
      </TopbarProvider>
    </Router>
  );
}

export default App;
