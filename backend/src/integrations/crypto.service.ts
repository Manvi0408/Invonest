import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption for OAuth tokens and API keys at rest.
 *
 * The key comes from INTEGRATIONS_ENCRYPTION_KEY (32 bytes, hex or base64). In
 * development, if that is not set, we derive a stable key from JWT_SECRET so the
 * app still runs with placeholder config — but that is logged loudly, because a
 * real deployment MUST set a dedicated key (rotating JWT_SECRET would otherwise
 * make every stored token undecryptable).
 *
 * Output format: v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor() {
    this.key = this.resolveKey();
  }

  private resolveKey(): Buffer {
    const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
    if (raw && raw.trim()) {
      const buf = /^[0-9a-fA-F]{64}$/.test(raw.trim())
        ? Buffer.from(raw.trim(), 'hex')
        : Buffer.from(raw.trim(), 'base64');
      if (buf.length === 32) return buf;
      this.logger.warn('INTEGRATIONS_ENCRYPTION_KEY is not 32 bytes; deriving a key instead.');
    } else {
      this.logger.warn(
        'INTEGRATIONS_ENCRYPTION_KEY is not set — deriving a dev key from JWT_SECRET. Set a dedicated 32-byte key before storing real credentials.',
      );
    }
    // Deterministic 32-byte fallback so tokens stay decryptable across restarts.
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'invonest-dev-secret').digest();
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = payload.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Malformed ciphertext.');
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  }

  /** Never throws — returns null on a bad/tampered value so callers can degrade. */
  tryDecrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    try {
      return this.decrypt(payload);
    } catch {
      return null;
    }
  }
}
