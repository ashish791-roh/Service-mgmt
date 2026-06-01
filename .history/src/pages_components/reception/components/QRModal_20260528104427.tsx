import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, X } from 'lucide-react';

interface QRModalProps {
  job: any;
  customer: any;
  device: any;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  job,
  customer,
  device,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const shortId = job.id.slice(-8).toUpperCase();
  const trackingUrl = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/track?job=${job.id}`;

  useEffect(() => {
    generateQR(trackingUrl).then((url) => {
      setQrDataUrl(url);
      setLoading(false);
    });
  }, [trackingUrl]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `FixHub-Job-${shortId}.png`;
    a.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>FixHub Job #${shortId}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
        .card { border: 2px solid #000; border-radius: 12px; padding: 24px; max-width: 320px; text-align: center; }
        h2 { margin: 0 0 4px; font-size: 22px; } p { margin: 4px 0; color: #555; font-size: 13px; }
        img { margin: 16px 0; width: 200px; height: 200px; }
        .ref { font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
        .status { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      </style></head><body>
      <div class="card">
        <h2>FixHub</h2>
        <p>Service Job Tracking</p>
        <img src="${qrDataUrl}" alt="QR Code" />
        <div class="ref">#${shortId}</div>
        <p><strong>${customer?.name ?? 'Customer'}</strong></p>
        <p>${device?.brand ?? ''} ${device?.model ?? ''}</p>
        <p style="margin-top:8px">${job.problemDescription?.slice(0, 60) ?? ''}</p>
        <div class="status" style="margin-top:12px">${job.status}</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-teal-600" />
            <h2 className="text-[16px] font-semibold text-gray-900">Job QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Job info */}
          <div className="w-full bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Job Reference
            </p>
            <p className="text-[20px] font-bold text-gray-900 tracking-widest">
              #{shortId}
            </p>
            <p className="text-[13px] font-medium text-gray-700 mt-1">
              {customer?.name}
            </p>
            <p className="text-[11px] text-gray-500">
              {device?.brand} {device?.model}
            </p>
          </div>
          {/* QR Image */}
          <div className="w-52 h-52 rounded-xl border-2 border-gray-200 flex items-center justify-center bg-white overflow-hidden">
            {loading ? (
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
            )}
          </div>
          <p className="text-[11px] text-gray-400 text-center px-4">
            Scan to track job status · <span className="font-mono text-gray-500 break-all">{trackingUrl}</span>
          </p>
          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Download size={15} /> Download
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Generate QR code using QR Server API with fallback to canvas
 */
async function generateQR(text: string): Promise<string> {
  try {
    const size = 200;
    const encoded = encodeURIComponent(text);
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&margin=10`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('QR API failed');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: return a simple placeholder data URL
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR unavailable', 100, 90);
      ctx.fillText('(check connection)', 100, 110);
    }
    return canvas.toDataURL();
  }
}
