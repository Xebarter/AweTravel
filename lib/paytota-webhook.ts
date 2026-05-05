import { createVerify } from 'crypto';

/**
 * Verifies Paytota webhook `X-Signature` (base64 RSA PKCS#1 v1.5 over SHA-256 of raw body).
 * @see additems.txt — Webhook Authorization
 */
export function verifyPaytotaWebhookSignature(rawBody: string, signatureB64: string, publicKeyPem: string): boolean {
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(rawBody, 'utf8');
    verifier.end();
    return verifier.verify(publicKeyPem, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}
