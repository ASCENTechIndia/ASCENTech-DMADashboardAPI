const crypto = require('crypto');

const LOGIN_ENCRYPTION_KEY =
  process.env.LOGIN_ENCRYPTION_KEY;

function decryptPassword(encryptedPassword) {
  if (!LOGIN_ENCRYPTION_KEY || typeof LOGIN_ENCRYPTION_KEY !== 'string') {
    throw new Error('LOGIN_ENCRYPTION_KEY is not configured');
  }

  if (!encryptedPassword || typeof encryptedPassword !== 'string') {
    throw new Error('Encrypted password is required');
  }

  const [ivBase64, cipherBase64] = encryptedPassword.split(':');
  if (!ivBase64 || !cipherBase64) {
    throw new Error('Invalid encrypted password format');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(cipherBase64, 'base64');

  if (encrypted.length <= 16) {
    throw new Error('Invalid encrypted password payload');
  }

  // Same key derivation as frontend: SHA-256 of shared secret.
  const key = crypto
    .createHash('sha256')
    .update(LOGIN_ENCRYPTION_KEY, 'utf8')
    .digest();

  // For AES-GCM, auth tag is appended to ciphertext (last 16 bytes).
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  decryptPassword,
};
