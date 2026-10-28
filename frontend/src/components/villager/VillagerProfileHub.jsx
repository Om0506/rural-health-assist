import { useEffect, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaShieldAlt,
  FaUser,
} from 'react-icons/fa';
import { villagerProfileAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VillagerPersonalInfo from './VillagerPersonalInfo';
import ChangePasswordModal from '../layout/ChangePasswordModal';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export default function VillagerProfileHub({ userProfile, user }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [subView, setSubView] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const hasPasswordProvider = Boolean(
    user?.providerData?.some((p) => p.providerId === 'password')
  );

  useEffect(() => {
    villagerProfileAPI
      .getMine()
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, []);

  if (subView === 'personal') {
    return (
      <VillagerPersonalInfo
        userProfile={userProfile}
        onBack={() => setSubView(null)}
      />
    );
  }

  if (subView === 'emergency') {
    return (
      <div className="villager-screen">
        <button type="button" onClick={() => setSubView(null)} className="villager-back-btn">
          <FaChevronLeft /> {t('Back')}
        </button>
        <h2 className="villager-section-header-title mt-4">{t('Emergency Contact')}</h2>
        <div className="villager-info-rows mt-4">
          <div className="villager-info-row">
            <FaPhoneAlt className="villager-info-row-icon" />
            <div>
              <p className="villager-info-row-label">{t('Contact Number')}</p>
              <p className="villager-info-row-value">{profile?.emergencyContact || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'address') {
    return (
      <div className="villager-screen">
        <button type="button" onClick={() => setSubView(null)} className="villager-back-btn">
          <FaChevronLeft /> {t('Back')}
        </button>
        <h2 className="villager-section-header-title mt-4">{t('Address')}</h2>
        <div className="villager-info-rows mt-4">
          <div className="villager-info-row">
            <FaMapMarkerAlt className="villager-info-row-icon" />
            <div>
              <p className="villager-info-row-label">{t('Home Address')}</p>
              <p className="villager-info-row-value">{profile?.address || '—'}</p>
            </div>
          </div>
          <div className="villager-info-row">
            <FaMapMarkerAlt className="villager-info-row-icon" />
            <div>
              <p className="villager-info-row-label">{t('Village')}</p>
              <p className="villager-info-row-value">{profile?.villageName || userProfile?.village || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subView === 'privacy') {
    return (
      <div className="villager-screen">
        <button type="button" onClick={() => setSubView(null)} className="villager-back-btn">
          <FaChevronLeft /> {t('Back')}
        </button>
        <h2 className="villager-section-header-title mt-4">{t('Privacy & Security')}</h2>
        <div className="villager-privacy-card mt-4">
          <FaShieldAlt className="h-8 w-8 text-brand-500" />
          <p>
            {t('Your health data is stored securely and only shared with authorized ASHA workers and doctors involved in your care.')}
          </p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'personal', icon: FaUser, label: t('Personal Information') },
    { id: 'emergency', icon: FaPhoneAlt, label: t('Emergency Contact') },
    { id: 'address', icon: FaMapMarkerAlt, label: t('Address') },
    {
      id: 'password',
      icon: FaLock,
      label: t('Change Password'),
      action: () => setPasswordOpen(true),
      hidden: !hasPasswordProvider,
    },
    { id: 'privacy', icon: FaShieldAlt, label: t('Privacy & Security') },
  ].filter((item) => !item.hidden);

  return (
    <div className="villager-screen">
      <div className="villager-profile-head">
        <div className="villager-profile-avatar">{getInitials(userProfile?.name)}</div>
        <div>
          <h2 className="villager-profile-name">{userProfile?.name}</h2>
          <p className="villager-profile-contact">{profile?.phoneNumber || userProfile?.phone || '—'}</p>
          <p className="villager-profile-contact">{user?.email || '—'}</p>
        </div>
      </div>

      <nav className="villager-menu-list">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.action ? item.action() : setSubView(item.id))}
              className="villager-menu-item"
            >
              <span className="villager-menu-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              <FaChevronRight className="h-3.5 w-3.5 text-muted-fg" />
            </button>
          );
        })}
      </nav>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        userEmail={user?.email}
        hasPasswordProvider={hasPasswordProvider}
      />
    </div>
  );
}
