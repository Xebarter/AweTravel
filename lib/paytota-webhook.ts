import { createVerify } from 'crypto';

/**
 * PEM from env often uses literal `\n` — OpenSSL/Node expect real newlines.
 */
export function normalizePaytotaWebhookPublicKeyPem(pem: string): string {
  return pem.trim().replace(/\\n/g, '\n');
}

/**
 * Reads webhook signature per Paytota / implementation guides: `X-Signature` or `Signature`.
 */
export function getPaytotaWebhookSignatureFromHeaders(headers: Headers): string | null {
  const a =
    headers.get('x-signature') ??
    headers.get('X-Signature') ??
    headers.get('signature') ??
    headers.get('Signature');
  const t = a?.trim();
  return t || null;
}

/**
 * Verifies Paytota webhook signature (base64 RSA PKCS#1 v1.5 over SHA-256 of exact raw body bytes).
 */
export function verifyPaytotaWebhookSignature(rawBody: string, signatureB64: string, publicKeyPem: string): boolean {
  try {
    const pem = normalizePaytotaWebhookPublicKeyPem(publicKeyPem);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(rawBody, 'utf8');
    verifier.end();
    return verifier.verify(pem, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}
