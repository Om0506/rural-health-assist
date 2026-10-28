export function getRouteMeta(pathname, nav) {
  const portal = nav?.label || 'Portal';

  const routes = {
    '/dashboard/asha': { title: 'Dashboard', breadcrumbs: [portal, 'Overview'] },
    '/asha/flagged-cases': { title: 'Flagged Cases', breadcrumbs: [portal, 'Flagged Cases'] },
    '/asha/daily-visits': { title: 'Daily Visits', breadcrumbs: [portal, 'Visits'] },
    '/asha/medicine-log': { title: 'Medicine Log', breadcrumbs: [portal, 'Medicine'] },
    '/asha/village-records': { title: 'Village Records', breadcrumbs: [portal, 'Villages'] },
    '/asha/patient-search': { title: 'Patient Search', breadcrumbs: [portal, 'Search'] },
    '/asha/health-record/add': {
      title: 'Add Health Record',
      subtitle: 'Record vitals and visit details for a patient',
      breadcrumbs: [portal, 'Records', 'New'],
    },
    '/dashboard/villager': { title: 'My Health', breadcrumbs: [portal, 'Overview'] },
    '/doctor-dashboard': { title: 'Dashboard', breadcrumbs: [portal, 'Overview'] },
    '/dashboard/doctor': { title: 'Dashboard', breadcrumbs: [portal, 'Overview'] },
    '/doctor/escalated': { title: 'AI Escalated', breadcrumbs: [portal, 'Escalated'] },
    '/doctor/patients': { title: 'Patients', breadcrumbs: [portal, 'Patients'] },
    '/doctor/insights': { title: 'AI Insights', breadcrumbs: [portal, 'Insights'] },
    '/doctor/prescriptions': { title: 'Prescriptions', breadcrumbs: [portal, 'Prescriptions'] },
    '/doctor/notifications': { title: 'Notifications', breadcrumbs: [portal, 'Alerts'] },
  };

  if (routes[pathname]) return routes[pathname];
  if (pathname.startsWith('/patient/')) {
    return { title: 'Patient Profile', breadcrumbs: [portal, 'Patients', 'Profile'] };
  }
  return { title: 'Dashboard', breadcrumbs: [portal] };
}
