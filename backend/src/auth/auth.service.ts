import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  ScryptOptions,
  timingSafeEqual,
} from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { AuthSession } from './auth-session.entity';

const SESSION_COOKIE = 'operation10_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function deriveKey(password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly sessions: Repository<AuthSession>,
    private readonly config: ConfigService,
  ) {}

  async login(password: string): Promise<{ id: string; token: string; expiresAt: Date }> {
    const storedHash = this.config.get<string>('APP_PASSWORD_HASH');
    if (!storedHash || !(await this.verifyPassword(password, storedHash))) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.save(this.sessions.create({
      id,
      tokenHash: this.hashToken(token),
      expiresAt,
    }));

    return { id, token, expiresAt };
  }

  async isAuthenticated(cookieValue?: string): Promise<boolean> {
    const parsed = this.parseCookie(cookieValue);
    if (!parsed) return false;

    const session = await this.sessions.findOneBy({ id: parsed.id });
    if (!session) return false;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.delete({ id: session.id });
      return false;
    }

    const expected = Buffer.from(session.tokenHash, 'hex');
    const actual = Buffer.from(this.hashToken(parsed.token), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async logout(cookieValue?: string): Promise<void> {
    const parsed = this.parseCookie(cookieValue);
    if (parsed) await this.sessions.delete({ id: parsed.id });
  }

  cookieName(): string {
    return SESSION_COOKIE;
  }

  cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: SESSION_TTL_MS,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return `scrypt$32768$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
  }

  private async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [algorithm, n, r, p, saltValue, keyValue, extra] = encoded.split('$');
    if (algorithm !== 'scrypt' || n !== '32768' || r !== '8' || p !== '1' || !saltValue || !keyValue || extra) {
      throw new InternalServerErrorException('APP_PASSWORD_HASH invalide');
    }

    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(keyValue, 'base64url');
    if (salt.length !== 16 || expected.length !== 64) {
      throw new InternalServerErrorException('APP_PASSWORD_HASH invalide');
    }

    const actual = await deriveKey(password, salt, expected.length, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(expected, actual);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseCookie(value?: string): { id: string; token: string } | null {
    if (!value) return null;
    const separator = value.indexOf('.');
    if (separator <= 0) return null;
    const id = value.slice(0, separator);
    const token = value.slice(separator + 1);
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return { id, token };
  }
}
