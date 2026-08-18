/**
 * Express Request augmentation.
 *
 * Without this, `req.auth` would require a cast at every call site — exactly
 * the `as` usage the project rules forbid. Declaring the field once makes it
 * type-safe everywhere downstream.
 */
import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. Undefined on public routes. */
      auth?: {
        userId: string;
        roles: UserRole[];
      };
    }
  }
}

export {};