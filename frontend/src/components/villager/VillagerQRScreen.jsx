import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { FaDownload, FaShieldAlt, FaTint, FaWind } from 'react-icons/fa';
import { qrAPI, villagerProfileAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VillagerSectionHeader from './VillagerSectionHeader';
import VillagerQRCardExport from './VillagerQRCardExport';
import FeedbackBanner from '../ui/FeedbackBanner';
import { getApiErrorMessage } from '../../utils/apiError';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VH';
}

function formatPatientId(userId) {
  if (!userId) return '—';
  const compact = String(userId).replace(/-/g, '').toUpperCase();
  if (compact.length <= 12) return `RHV${compact}`;
  return `RHV${compact.slice(-9)}`;
}

function QrWave() {
  return (
    <svg
      className="villager-qr-wave"
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0,36 C240,8 480,52 720,28 C960,4 1200,48 1440,24 L1440,56 L0,56 Z"
        className="villager-qr-wave-fill"
      />
    </svg>
  );
}

export default function VillagerQRScreen({ userId, userProfile }) {
  const { t } = useLanguage();
  const [qrValue, setQrValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', variant: 'info' });

  useEffect(() => {
    loadQR();
    loadProfile();
  }, [userId]);

  const loadQR = async () => {
    try {
      const res = await qrAPI.get(userId);
      setQrValue(res.data.qr_value);
    } catch {
      /* generate on demand */
    }
  };

  const loadProfile = async () => {
    try {
      const res = await villagerProfileAPI.getMine();
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  };

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await qrAPI.generate(userId);
      setQrValue(res.data.qrCode);
      setFeedback({ message: t('QR code generated.'), variant: 'success' });
    } catch {
      setFeedback({ message: t('Failed to generate QR code'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getQrImageDataUrl = () => {
    if (!qrValue) return null;
    if (qrValue.startsWith('data:image')) return qrValue;
    const liveCanvas = document.querySelector('#villager-qr-card canvas');
    if (liveCanvas) return liveCanvas.toDataURL('image/png');
    return null;
  };

  const downloadCard = async () => {
    if (downloading) return;
    const qrImageSrc = getQrImageDataUrl();
    if (!qrImageSrc) {
      setFeedback({ message: t('Please generate a QR code first'), variant: 'warning' });
      return;
    }

    setDownloading(true);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;opacity:0;pointer-events:none';
    document.body.appendChild(host);

    const root = createRoot(host);
    root.render(
      <VillagerQRCardExport
        initials={getInitials(userProfile?.name)}
        name={userProfile?.name || '—'}
        gender={profile?.gender || userProfile?.gender || '—'}
        age={userProfile?.age || profile?.age || '—'}
        patientId={formatPatientId(userId)}
        bloodGroup={profile?.bloodGroup || userProfile?.blood_group || '—'}
        allergies={profile?.allergies?.filter((a) => a !== 'None').join(', ') || t('None')}
        chronic={profile?.existingDiseases?.filter((d) => d !== 'None').join(', ') || t('None')}
        qrImageSrc={qrImageSrc}
        brandTitle="Rural Health"
      />
    );

    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const el = document.getElementById('villager-qr-export');
      if (!el) throw new Error('Export card not ready');

      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 420,
        windowWidth: 420,
      });

      const link = document.createElement('a');
      const safeName = (userProfile?.name || 'patient').replace(/\s+/g, '_');
      link.download = `rural_health_card_${safeName}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setFeedback({ message: t('Health card downloaded.'), variant: 'success' });
    } catch (err) {
      console.error(err);
      setFeedback({ message: getApiErrorMessage(err, t('Failed to download QR card')), variant: 'error' });
    } finally {
      root.unmount();
      host.remove();
      setDownloading(false);
    }
  };

  const gender = profile?.gender || userProfile?.gender || '—';
  const age = userProfile?.age || profile?.age || '—';
  const allergies =
    profile?.allergies?.filter((a) => a !== 'None').join(', ') || t('None');
  const chronic =
    profile?.existingDiseases?.filter((d) => d !== 'None').join(', ') || t('None');
  const bloodGroup = profile?.bloodGroup || userProfile?.blood_group || '—';

  const stats = [
    { icon: FaTint, label: t('Blood Group'), value: bloodGroup, tone: 'red' },
    { icon: FaWind, label: t('Allergies'), value: allergies, tone: 'blue' },
    { icon: FaShieldAlt, label: t('Chronic Condition'), value: chronic, tone: 'teal' },
  ];

  return (
    <div className="villager-screen villager-qr-page">
      <VillagerSectionHeader
        title={t('QR Health Card')}
        subtitle={t('Show this card at any health center')}
      />
      <FeedbackBanner message={feedback.message} variant={feedback.variant} className="mb-4" />

      <div id="villager-qr-card" className="villager-qr-premium">
        <div className="villager-qr-premium-top">
          <div className="villager-qr-premium-row">
            <div className="villager-qr-premium-info">
              <div className="villager-qr-premium-avatar">{getInitials(userProfile?.name)}</div>
              <h2 className="villager-qr-premium-name">{userProfile?.name || '—'}</h2>
              <p className="villager-qr-premium-demo">
                {gender} • {age} {t('Years')}
              </p>
              <p className="villager-qr-premium-id">
                {t('ID')}: {formatPatientId(userId)}
              </p>
            </div>

            <div className="villager-qr-premium-code">
              {qrValue ? (
                <div className="villager-qr-code-box">
                  {qrValue.startsWith('data:image') ? (
                    <img src={qrValue} alt={t('QR Health Card')} className="h-full w-full object-contain" />
                  ) : (
                    <QRCodeCanvas value={qrValue} size={128} level="H" includeMargin={false} />
                  )}
                </div>
              ) : (
                <div className="villager-qr-code-box villager-qr-code-box--empty">
                  <p className="text-center text-xs text-white/90">{t("No QR yet")}</p>
                  <button
                    type="button"
                    onClick={generateQR}
                    disabled={loading}
                    className="villager-qr-gen-btn"
                  >
                    {loading ? t('Generating...') : t('Generate')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <QrWave />
        </div>

        <div className="villager-qr-premium-stats">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="villager-qr-stat">
                <span className={`villager-qr-stat-icon villager-qr-stat-icon--${item.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="villager-qr-stat-label">{item.label}</p>
                <p className="villager-qr-stat-value">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="villager-qr-howto">
        <div className="villager-qr-howto-text">
          <h3>{t('How to use?')}</h3>
          <p>
            {t(
              'Show this QR code to any ASHA worker or doctor to access your health information instantly.'
            )}
          </p>
        </div>
        {qrValue && (
          <button
            type="button"
            onClick={downloadCard}
            disabled={downloading}
            className="villager-qr-download-btn"
          >
            <FaDownload className="h-4 w-4" />
            {downloading ? t('Downloading...') : t('Download Card')}
          </button>
        )}
      </div>

      {qrValue && (
        <button
          type="button"
          onClick={generateQR}
          disabled={loading}
          className="villager-qr-regenerate"
        >
          {loading ? t('Regenerating...') : t('Regenerate QR Code')}
        </button>
      )}
    </div>
  );
}
