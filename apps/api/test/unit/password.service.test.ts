import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.service.js';

describe('password.service', () => {
  it('hashes a password and verifies the correct value', async () => {
    const hash = await hashPassword('StrongPass123');

    await expect(verifyPassword('StrongPass123', hash)).resolves.toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('StrongPass123');

    await expect(verifyPassword('WrongPass123', hash)).resolves.toBe(false);
  });

  it('returns false for a null stored hash', async () => {
    await expect(verifyPassword('StrongPass123', null)).resolves.toBe(false);
  });
});
