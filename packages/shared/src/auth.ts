/**
 * Auth contract shared by the API and both clients.
 *
 * The web and mobile apps import these schemas to validate forms before a
 * request leaves the device, so a field rule exists in exactly one place.
 * Field-level messages are Ukrainian: they are rendered directly under form
 * inputs. Top-level errors travel as codes and are localised by the client.
 */
import { z } from 'zod';

export const USER_ROLES = ['STUDENT', 'AUTHOR', 'ADMIN'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Вкажіть email')
  .max(255, 'Email не може бути довшим за 255 символів')
  .email('Некоректний формат email');

/**
 * Length plus one letter and one digit. Deliberately no symbol requirement:
 * composition rules past this point push users toward predictable patterns
 * without adding real entropy.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів`)
  .max(PASSWORD_MAX_LENGTH, `Пароль не може бути довшим за ${PASSWORD_MAX_LENGTH} символів`)
  .regex(/[A-Za-zА-Яа-яЇїІіЄєҐґ]/, 'Пароль має містити щонайменше одну літеру')
  .regex(/\d/, 'Пароль має містити щонайменше одну цифру');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // varchar(160) in the users table — keep the client rule identical.
  fullName: z
    .string()
    .trim()
    .min(2, "Ім'я має містити щонайменше 2 символи")
    .max(160, "Ім'я не може бути довшим за 160 символів"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введіть пароль'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Public projection of a user. Never carries passwordHash. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRoleName[];
  emailVerified: boolean;
  locale: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds — lets the client refresh proactively. */
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

/**
 * Refresh and logout both carry the refresh token in the body rather than a
 * cookie: the mobile client has no cookie jar, and one transport for both
 * clients keeps the flow single-branched.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Відсутній refresh-токен'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;