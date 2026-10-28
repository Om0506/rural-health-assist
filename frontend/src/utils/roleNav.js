import {
  FaBell,
  FaClipboardList,
  FaFilePrescription,
  FaFlag,
  FaHeartbeat,
  FaHome,
  FaNotesMedical,
  FaPills,
  FaQrcode,
  FaRobot,
  FaSearch,
  FaUser,
  FaUserInjured,
  FaUsers,
} from 'react-icons/fa';

const normalizeRole = (role = '') => {
  const value = String(role).trim().toLowerCase();
  if (value === 'villager') return 'villager';
  if (value === 'asha' || value === 'asha worker') return 'asha';
  if (value === 'doctor') return 'doctor';
  return value;
};

export const getRoleNav = (userProfile) => {
  const role = normalizeRole(userProfile?.role);

  if (role === 'villager') {
    return {
      role: 'villager',
      label: 'Villager',
      portalLabel: 'Villager Portal',
      home: '/dashboard/villager',
      hideSidebar: true,
      items: [],
    };
  }

  if (role === 'asha') {
    return {
      role: 'asha',
      label: 'ASHA Worker',
      portalLabel: 'ASHA Worker Portal',
      home: '/dashboard/asha',
      items: [
        { to: '/dashboard/asha', label: 'Dashboard', icon: FaHome, end: true },
        { to: '/asha/flagged-cases', label: 'Flagged Cases', icon: FaFlag },
        { to: '/asha/medicine-log', label: 'Medicine Log', icon: FaPills },
        { to: '/asha/village-records', label: 'Village Records', icon: FaClipboardList },
        { to: '/asha/patient-search', label: 'Patient Search', icon: FaSearch },
        { to: '/asha/health-record/add', label: 'Add Record', icon: FaHeartbeat },
      ],
      mobileQuick: [
        { id: 'scan', label: 'Scan QR', icon: FaQrcode, action: 'scan' },
        { id: 'visits', label: 'Visits', icon: FaNotesMedical, to: '/asha/daily-visits' },
        { id: 'records', label: 'Records', icon: FaClipboardList, to: '/asha/village-records' },
        { id: 'home', label: 'Home', icon: FaHome, to: '/dashboard/asha' },
      ],
      fab: { label: 'Scan QR', icon: FaQrcode, action: 'scan' },
    };
  }

  if (role === 'doctor') {
    return {
      role: 'doctor',
      label: 'Doctor',
      portalLabel: 'Doctor Portal',
      home: '/doctor-dashboard',
      items: [
        { to: '/doctor-dashboard', label: 'Dashboard', icon: FaHome, end: true },
        { to: '/doctor/escalated', label: 'AI Escalated', icon: FaFlag },
        { to: '/doctor/patients', label: 'Patients', icon: FaUsers },
        { to: '/doctor/insights', label: 'AI Insights', icon: FaClipboardList },
        { to: '/doctor/prescriptions', label: 'Prescriptions', icon: FaFilePrescription },
        { to: '/doctor/notifications', label: 'Notifications', icon: FaBell },
        { to: '/asha/patient-search', label: 'Patient Search', icon: FaSearch },
      ],
      mobileQuick: [
        { id: 'scan', label: 'Scan', icon: FaQrcode, action: 'scan' },
        { id: 'escalated', label: 'Urgent', icon: FaFlag, to: '/doctor/escalated' },
        { id: 'patients', label: 'Patients', icon: FaUsers, to: '/doctor/patients' },
        { id: 'home', label: 'Home', icon: FaHome, to: '/doctor-dashboard' },
      ],
      fab: { label: 'Scan QR', icon: FaQrcode, action: 'scan' },
    };
  }

  return null;
};

export const isDashboardPath = (pathname) =>
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/asha') ||
  pathname.startsWith('/patient') ||
  pathname.startsWith('/doctor-dashboard') ||
  pathname.startsWith('/doctor/');

export const isAuthPath = (pathname) =>
  pathname === '/login' || pathname === '/register';

export const isPublicMarketingPath = (pathname) =>
  ['/', '/about', '/services', '/contact'].includes(pathname);
