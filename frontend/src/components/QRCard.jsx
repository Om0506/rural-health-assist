import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { qrAPI } from '../services/api';
import { FaDownload } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import FeedbackBanner from './ui/FeedbackBanner';
import { getApiErrorMessage } from '../utils/apiError';

function QRCard({ userId, userName }) {
  const { t } = useLanguage();
  const [qrValue, setQrValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadQRCode();
  }, [userId]);

  const loadQRCode = async () => {
    try {
      const response = await qrAPI.get(userId);
      setQrValue(response.data.qr_value);
    } catch (error) {
      console.log('No existing QR code, will generate new one');
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await qrAPI.generate(userId);
      setQrValue(response.data.qrCode);
      setSuccess(t('QR code generated.'));
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError(getApiErrorMessage(error, t('Failed to generate QR code')));
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async () => {
    const element = document.getElementById('qr-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `patient_qr_${userId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSuccess(t('QR card downloaded.'));
    } catch (error) {
      console.error('Error downloading QR card:', error);
      setError(getApiErrorMessage(error, t('Failed to download QR card. Please try again.')));
    }
  };

  return (
    <div className="card text-center">
      <FeedbackBanner message={error} variant="error" className="mb-3 text-left" />
      <FeedbackBanner message={success} variant="success" className="mb-3 text-left" />
      <h3 className="text-2xl font-bold mb-2 gradient-text">{t('Digital Health Card')}</h3>
      <p className="mb-6 text-sm text-muted-fg">Your portable health identity for field visits</p>

      {qrValue ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div
              id="qr-card"
              className="w-full max-w-[320px] rounded-2xl border border-default bg-card-secondary px-6 py-5 text-center shadow-soft dark:shadow-dark-card"
            >
              <p className="border-b border-default pb-3 text-sm font-semibold text-brand-600 dark:text-brand-400">
                Rural Health Assistance System
              </p>
              <div className="pt-3 pb-2 text-left text-sm text-fg-secondary">
                <p><strong>Patient Name:</strong> {userName || '-'}</p>
                <p><strong>Patient ID:</strong> {userId}</p>
              </div>

              <div className="my-3 flex justify-center">
                {qrValue.startsWith('data:image') ? (
                  <img src={qrValue} alt="QR Code" className="w-44 h-44 mx-auto" />
                ) : (
                  <QRCodeCanvas
                    id="qr-code"
                    value={qrValue}
                    size={176}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </div>

              <p className="border-t border-default pt-2 text-xs text-muted-fg">
                Scan this QR to view patient profile
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-[420px] mx-auto">
            <button
              onClick={generateQRCode}
              disabled={loading}
              className="btn-secondary flex-1 disabled:opacity-50"
            >
              {loading ? t('Regenerating...') : t('Regenerate QR')}
            </button>
            <button
              onClick={downloadQR}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <FaDownload />
              <span>Download QR</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8">
          <p className="text-gray-600 mb-4">{t("You don't have a QR code yet")}</p>
          <button
            onClick={generateQRCode}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? t('Generating...') : t('Generate QR Code')}
          </button>
        </div>
      )}
    </div>
  );
}

export default QRCard;
