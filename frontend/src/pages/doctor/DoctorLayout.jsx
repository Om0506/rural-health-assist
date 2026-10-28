import { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useScan } from '../../context/ScanContext';
import QRScannerModal from '../../components/QRScannerModal';
import { qrAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function DoctorLayout({ userProfile }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { registerScanHandler } = useScan();
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  const openScanner = useCallback(() => {
    setShowScanner(true);
    setScanError('');
    setScanLoading(false);
  }, []);

  useEffect(() => {
    registerScanHandler(openScanner);
    return () => registerScanHandler(null);
  }, [registerScanHandler, openScanner]);

  const handleScanSuccess = async (decoded) => {
    if (!decoded || scanLoading) return false;
    setScanLoading(true);
    setScanError('');
    try {
      const response = await qrAPI.resolveScan(decoded);
      const patientId = response.data?.patient?.id;
      if (!patientId) throw new Error(t('Patient not found'));
      setShowScanner(false);
      navigate(`/patient/${patientId}`);
      return true;
    } catch {
      setScanError(t('Invalid patient QR. Please scan a valid healthcare QR.'));
      return false;
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <>
      <Outlet context={{ userProfile, openScanner }} />
      <QRScannerModal
        open={showScanner}
        onClose={() => {
          setShowScanner(false);
          setScanLoading(false);
          setScanError('');
        }}
        onScanSuccess={handleScanSuccess}
        loading={scanLoading}
        error={scanError}
      />
    </>
  );
}
