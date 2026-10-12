import { describe, it, expect } from 'vitest';
import { generateSecret, verifyToken, getOtpAuthUrl, generateTempMfaToken, verifyTempMfaToken } from '@/lib/totp';
import { scanBuffer } from '@/lib/virusScan';

describe('Security Hardening Utilities', () => {
  describe('TOTP MFA', () => {
    it('should generate secrets and verify correct tokens', () => {
      const secret = generateSecret();
      expect(secret).toHaveLength(16);
      expect(secret).toMatch(/^[A-Z2-7]+$/);

      // Verify otpauth URL generation
      const url = getOtpAuthUrl('admin@fixhub.com', secret);
      expect(url).toContain('otpauth://totp/FixHub:admin%40fixhub.com');
      expect(url).toContain(`secret=${secret}`);
    });

    it('should reject invalid or expired tokens', () => {
      const secret = generateSecret();
      expect(verifyToken(secret, '000000')).toBe(false);
      expect(verifyToken(secret, 'invalid')).toBe(false);
    });
  });

  describe('Signed Temporary MFA Tokens', () => {
    it('should generate a token and verify it correctly', () => {
      const userId = 'user-admin-123';
      const token = generateTempMfaToken(userId);
      expect(token).toContain('.');

      const verifiedUserId = verifyTempMfaToken(token);
      expect(verifiedUserId).toBe(userId);
    });

    it('should reject tampered or expired tokens', () => {
      const userId = 'user-admin-123';
      const token = generateTempMfaToken(userId);
      const tampered = token + 'tamper';
      expect(verifyTempMfaToken(tampered)).toBeNull();
    });
  });

  describe('Virus Scanner', () => {
    it('should flag EICAR virus test string', async () => {
      const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      const result = await scanBuffer(eicar);
      expect(result.isInfected).toBe(true);
      expect(result.virusName).toBe('EICAR-Test-Signature');
    });

    it('should pass safe text files', async () => {
      const safe = Buffer.from('This is a completely safe file content.');
      const result = await scanBuffer(safe);
      expect(result.isInfected).toBe(false);
    });
  });
});
