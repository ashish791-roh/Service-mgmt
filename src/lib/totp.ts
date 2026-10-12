import crypto from 'crypto';

/**
 * Generate a random Base32 string to use as a TOTP secret.
 */
export function generateSecret(length = 16): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

/**
 * Decode a Base32 string into a Uint8Array.
 */
function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

/**
 * Generate the TOTP code for a specific time step.
 */
function generateTOTP(secret: string, step: number): string {
  const key = base32Decode(secret);
  
  // Convert step to 8-byte big-endian buffer
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0); // Upper 32 bits
  buffer.writeUInt32BE(step, 4); // Lower 32 bits
  
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
    
  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP token against a secret.
 * Allows a clock drift window of ±1 step (30 seconds before/after).
 */
export function verifyToken(secret: string, token: string, window = 1): boolean {
  const cleanToken = token.trim().replace(/\s/g, '');
  if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) return false;
  
  const currentStep = Math.floor(Date.now() / 30000);
  
  for (let i = -window; i <= window; i++) {
    const step = currentStep + i;
    if (generateTOTP(secret, step) === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Construct standard otpauth:// URL for QR scanners.
 */
export function getOtpAuthUrl(email: string, secret: string, issuer = 'FixHub'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

const TEMP_TOKEN_SECRET = process.env.SESSION_SECRET || 'fixhub-temp-mfa-secret-key-12345';

export function generateTempMfaToken(userId: string): string {
  const payload = JSON.stringify({ userId, expiresAt: Date.now() + 5 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', TEMP_TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

export function verifyTempMfaToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;
    const payloadStr = Buffer.from(base64Payload, 'base64').toString('utf8');
    
    const expectedSignature = crypto.createHmac('sha256', TEMP_TOKEN_SECRET).update(payloadStr).digest('hex');
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(payloadStr);
    if (payload.expiresAt < Date.now()) return null;
    
    return payload.userId;
  } catch {
    return null;
  }
}
