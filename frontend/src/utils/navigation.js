export const getDashboardPath = (userProfile) => {
  if (!userProfile || !userProfile.role) {
    return '/';
  }

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

