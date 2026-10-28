import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function QRScanner({ onScanSuccess, regionId = 'rha-qr-scanner-region' }) {
  const scannerRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const regionEl = document.getElementById(regionId);
    if (!regionEl) return;
    regionEl.innerHTML = '';
    setCameraError('');

    const scanner = new Html5QrcodeScanner(
      regionId,
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        supportedScanTypes: [0], // Camera scan only
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScanSuccess?.(decodedText);
      },
      () => {}
    );

    return () => {
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        current.clear().catch(() => {});
      }
      regionEl.innerHTML = '';
    };
  }, [onScanSuccess, regionId]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2">
      <div id={regionId} className="min-h-[320px]" />
      <p className="text-xs text-gray-500 mt-2">
        Tip: Select back camera from dropdown and hold QR steady for 1-2 seconds.
      </p>
      {cameraError && <p className="text-sm text-red-600 mt-2">{cameraError}</p>}
    </div>
  );
}

export default QRScanner;
