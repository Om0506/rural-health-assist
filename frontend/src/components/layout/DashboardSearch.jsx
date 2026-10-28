import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

export default function DashboardSearch({ role }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const searchPath =
    role === 'doctor' ? '/asha/patient-search' : role === 'asha' ? '/asha/patient-search' : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchPath) return;
    const q = query.trim();
    navigate(q ? `${searchPath}?q=${encodeURIComponent(q)}` : searchPath);
  };

  if (!searchPath) return null;

  return (
    <form onSubmit={handleSubmit} className="dashboard-topnav-search">
      <FaSearch className="dashboard-topnav-search-icon" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('Search patients, records...')}
        className="dashboard-topnav-search-input"
        aria-label={t('Search patients and records')}
      />
    </form>
  );
}
