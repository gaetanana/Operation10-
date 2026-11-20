const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');
const { spawnSync } = require('node:child_process');

const deriveKey = promisify(scrypt);

async function main() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Lancez cette commande depuis un terminal interactif.');
  }

  const password = await readSecret('Choisissez un mot de passe (14 caractères minimum) : ');
  if (password.length < 14 || password.length > 256) {
    throw new Error('Le mot de passe doit contenir entre 14 et 256 caractères.');
  }

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const hash = `scrypt$32768$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
  if (process.argv.includes('--vercel')) {
    const result = spawnSync(
      'npx --yes vercel@latest env add APP_PASSWORD_HASH --environment production --sensitive --yes',
      { input: hash, shell: true, stdio: ['pipe', 'inherit', 'inherit'] },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Configuration du mot de passe Vercel échouée.');
    return;
  }
  console.log(`APP_PASSWORD_HASH=${hash}`);
}

function readSecret(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = '';
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();

    const finish = (error) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      if (chunk === '\u0003') return finish(new Error('Annulé.'));
      if (chunk === '\r' || chunk === '\n') return finish();
      if (chunk === '\u007f' || chunk === '\b') {
        value = value.slice(0, -1);
        return;
      }
      if (chunk >= ' ' && value.length < 256) value += chunk;
    };

    input.on('data', onData);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
