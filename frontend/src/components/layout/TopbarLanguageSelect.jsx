import { FaGlobe } from 'react-icons/fa';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import { cn } from '../../utils/cn';

export default function TopbarLanguageSelect({ value, onChange, className }) {
  return (
    <div className={cn('topbar-lang-pill', className)}>
      <FaGlobe className="h-3 w-3 shrink-0 text-muted-fg" aria-hidden="true" />
      <select
        value={value}
        onChange={onChange}
        aria-label="Language"
        className="topbar-lang-select"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0 center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '0.75rem',
        }}
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.nativeLabel || opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
