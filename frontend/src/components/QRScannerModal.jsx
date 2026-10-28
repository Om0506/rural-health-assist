import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { FaQrcode, FaTimes, FaCamera } from 'react-icons/fa';
import Button from './ui/Button';

function QRScannerModal({ open, onClose, onScanSuccess, loading = false, error = '' }) {
  const [sessionKey, setSessionKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [localError, setLocalError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const decoderRef = useRef(null);
  const decoderRegionId = useMemo(() => `rha-hidden-frame-decoder-${sessionKey}`, [sessionKey]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setSessionKey((prev) => prev + 1);
    setLocalError('');
    setCameraReady(false);

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setLocalError('Unable to open camera. Please allow camera permission and try again.');
      }
    };

    startPreview();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (decoderRef.current) {
        decoderRef.current.clear().catch(() => {});
        decoderRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!loading) setCapturing(false);
  }, [loading, error]);

  useEffect(() => {
    if (!capturing) return undefined;
    const timer = setTimeout(() => setCapturing(false), 8000);
    return () => clearTimeout(timer);
  }, [capturing]);

  const handleManualScan = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    setLocalError('');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context unavailable');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('frame capture failed');

      const frameFile = new File([blob], 'qr-frame.png', { type: 'image/png' });
      const decoder = new Html5Qrcode(decoderRegionId);
      decoderRef.current = decoder;

      const decodedText = await decoder.scanFile(frameFile, true);
      if (!decodedText) throw new Error('no qr');

      const scanResult = await onScanSuccess?.(decodedText);
      if (scanResult === true) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        onClose?.();
      } else {
        setLocalError(error || 'QR not detected. Align the code in the frame and try again.');
      }
    } catch {
      setLocalError('QR code not detected. Hold steady and try again.');
    } finally {
      if (decoderRef.current) {
        decoderRef.current.clear().catch(() => {});
        decoderRef.current = null;
      }
      setCapturing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950"
        >
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-slate-900/90 backdrop-blur border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-semibold">
                <FaQrcode className="text-brand-400" />
                <span>Scan Patient QR</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                aria-label="Close scanner"
              >
                <FaTimes />
              </button>
            </div>

            {/* Scanner viewport */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-slate-950/30" />

              {/* Scan frame */}
              <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72">
                <div className="absolute inset-0 rounded-3xl border-2 border-white/90 scanner-frame" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-2xl" />
                <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-scan-line top-1/2" />
              </div>

              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-white gap-3">
                  <FaCamera className="w-12 h-12 text-brand-400 animate-pulse-soft" />
                  <p className="text-sm">Starting camera...</p>
                  <p className="text-xs text-slate-400 max-w-xs text-center px-4">
                    Allow camera access when prompted
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 sm:p-6 bg-slate-900/95 backdrop-blur border-t border-slate-800 space-y-3">
              <p className="text-center text-sm text-slate-400">
                Align the patient QR code inside the frame
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <Button
                  onClick={handleManualScan}
                  disabled={!cameraReady || capturing}
                  loading={capturing || loading}
                  className="flex-1"
                >
                  {capturing || loading ? 'Scanning...' : 'Scan Now'}
                </Button>
                <Button variant="ghost" onClick={onClose} className="!bg-slate-800 !text-white !border-slate-700">
                  Cancel
                </Button>
              </div>
              <div id={decoderRegionId} className="hidden" />
              {localError && (
                <p className="text-center text-sm text-red-400" role="alert">{localError}</p>
              )}
              {error && (
                <p className="text-center text-sm text-red-400" role="alert">{error}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QRScannerModal;
