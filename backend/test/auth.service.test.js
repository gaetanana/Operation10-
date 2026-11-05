const test = require('node:test');
const assert = require('node:assert/strict');
const { UnauthorizedException } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { AuthGuard } = require('../dist/auth/auth.guard');
const { AuthService } = require('../dist/auth/auth.service');

function createAuthService() {
  const rows = new Map();
  const repository = {
    create: (value) => value,
    save: async (value) => {
      rows.set(value.id, value);
      return value;
    },
    findOneBy: async ({ id }) => rows.get(id) ?? null,
    delete: async ({ id }) => {
      if (id) rows.delete(id);
    },
  };
  const values = { NODE_ENV: 'production' };
  const config = { get: (name) => values[name] };
  return { auth: new AuthService(repository, config), values };
}

test('owner login creates a HttpOnly session that can be revoked', async () => {
  const { auth, values } = createAuthService();
  values.APP_PASSWORD_HASH = await auth.hashPassword('a long test password');

  const session = await auth.login('a long test password');
  const cookie = `${session.id}.${session.token}`;

  assert.equal(await auth.isAuthenticated(cookie), true);
  assert.deepEqual(auth.cookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 604_800_000,
  });
  const request = { cookies: { [auth.cookieName()]: cookie } };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class ProtectedRoute {},
    switchToHttp: () => ({ getRequest: () => request }),
  };
  assert.equal(await new AuthGuard(new Reflector(), auth).canActivate(context), true);

  await auth.logout(cookie);
  assert.equal(await auth.isAuthenticated(cookie), false);
});

test('invalid passwords and malformed session cookies are rejected', async () => {
  const { auth, values } = createAuthService();
  values.APP_PASSWORD_HASH = await auth.hashPassword('a long test password');

  await assert.rejects(() => auth.login('incorrect'), UnauthorizedException);
  assert.equal(await auth.isAuthenticated('not-a-session'), false);
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class ProtectedRoute {},
    switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }),
  };
  await assert.rejects(
    () => new AuthGuard(new Reflector(), auth).canActivate(context),
    UnauthorizedException,
  );
});
