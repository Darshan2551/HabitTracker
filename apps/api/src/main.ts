import { env } from './config/env.js';
import { buildApp } from './app.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    app.log.info(`API running on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
