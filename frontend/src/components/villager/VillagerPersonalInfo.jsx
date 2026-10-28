import { useEffect, useState } from 'react';
import {
  FaBirthdayCake,
  FaChevronLeft,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaUser,
  FaVenusMars,
} from 'react-icons/fa';
import { villagerProfileAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VillagerProfileForm from '../VillagerProfileForm';
import Button from '../ui/Button';

export default function VillagerPersonalInfo({ userProfile, onBack }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    villagerProfileAPI
      .getMine()
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  if (editing) {
    return (
      <div className="villager-screen">
        <button type="button" onClick={() => setEditing(false)} className="villager-back-btn">
          <FaChevronLeft /> {t('Back')}
        </button>
        <div className="mt-4">
          <VillagerProfileForm userProfile={userProfile} />
        </div>
      </div>
    );
  }

  const rows = [
    { icon: FaUser, label: t('Full Name'), value: profile?.fullName || userProfile?.name },
    { icon: FaVenusMars, label: t('Gender'), value: profile?.gender },
    {
      icon: FaBirthdayCake,
      label: t('Date of Birth'),
      value: profile?.dateOfBirth
        ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : profile?.age
        ? `${profile.age} ${t('years old')}`
        : userProfile?.age
        ? `${userProfile.age} ${t('years old')}`
        : '—',
    },
    { icon: FaPhone, label: t('Phone Number'), value: profile?.phoneNumber || userProfile?.phone },
    { icon: FaEnvelope, label: t('Email'), value: profile?.email || '—' },
    {
      icon: FaMapMarkerAlt,
      label: t('Address'),
      value: [profile?.address, profile?.villageName].filter(Boolean).join(', ') || '—',
    },
  ];

  return (
    <div className="villager-screen villager-screen--with-footer">
      <button type="button" onClick={onBack} className="villager-back-btn">
        <FaChevronLeft /> {t('Back')}
      </button>

      <h2 className="villager-section-header-title mt-4">{t('Personal Information')}</h2>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-fg animate-pulse">{t('Loading...')}</p>
      ) : (
        <div className="villager-info-rows mt-4">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="villager-info-row">
                <Icon className="villager-info-row-icon" />
                <div>
                  <p className="villager-info-row-label">{row.label}</p>
                  <p className="villager-info-row-value">{row.value || '—'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="villager-sticky-foot">
        <Button className="w-full !rounded-xl" variant="secondary" onClick={() => setEditing(true)}>
          {t('Edit Profile')}
        </Button>
      </div>
    </div>
  );
}
