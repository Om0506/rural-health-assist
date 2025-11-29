import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { qrAPI } from '../services/api';
import { FaDownload } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

function QRCard({ userId, userName }) {
  const { t } = useLanguage();
  const [qrValue, setQrValue] = useState(null);
  const [loading, setLoading] = useState(false);

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
    try {
      const response = await qrAPI.generate(userId);
      setQrValue(response.data.qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert(t('Failed to generate QR code'));
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `health-card-${userName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="card text-center">
      <h3 className="text-2xl font-bold mb-4 text-gray-800">{t('Digital Health Card')}</h3>
      
      {qrValue ? (
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-lg inline-block">
            {qrValue.startsWith('data:image') ? (
              <img src={qrValue} alt="QR Code" className="w-48 h-48 mx-auto" />
            ) : (
              <QRCodeSVG
                id="qr-code"
                value={qrValue}
                size={192}
                level="H"
                includeMargin={true}
              />
            )}
          </div>
          
          <div className="text-left bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>{t('Name:')}</strong> {userName}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>{t('User ID:')}</strong> {userId}
            </p>
            <p className="text-xs text-gray-600">
              {t('Share QR message')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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
              <span>{t('Download')}</span>
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
