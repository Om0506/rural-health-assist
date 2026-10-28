export const getDashboardPath = (userProfile) => {
  if (!userProfile || !userProfile.role) {
    return '/';
  }

  const role = String(userProfile.role).trim().toLowerCase();

  switch (role) {
    case 'Villager':
    case 'villager':
      return '/dashboard/villager';
    case 'asha worker':
    case 'asha':
      return '/dashboard/asha';
    case 'doctor':
      return '/doctor-dashboard';
    default:
      return '/';
  }
};

