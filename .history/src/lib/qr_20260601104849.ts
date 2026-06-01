import QRCode from 'qrcode';

function createFallbackPlaceholder(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR unavailable', size / 2, size / 2 - 8);
    ctx.font = '10px monospace';
    ctx.fillText('Offline mode', size / 2, size / 2 + 10);
  }

  return canvas.toDataURL();
}

export async function generateQRCodeDataUrl(text: string, size = 200): Promise<string> {
  if (!text) {
    return createFallbackPlaceholder(size);
  }

  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    });
  } catch {
    return createFallbackPlaceholder(size);
  }
}
