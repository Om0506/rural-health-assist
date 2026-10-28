import { useEffect } from 'react';
import { useTopbar } from '../../context/TopbarContext';

export default function useDoctorPageMeta({ title, subtitle = '', notificationCount = 0 }) {
  const { setTopbarMeta, resetTopbarMeta } = useTopbar();

  useEffect(() => {
    setTopbarMeta({
      navTitle: title,
      title,
      subtitle,
      breadcrumbs: [],
      notificationCount,
    });
    return () => resetTopbarMeta();
  }, [title, subtitle, notificationCount, setTopbarMeta, resetTopbarMeta]);
}
