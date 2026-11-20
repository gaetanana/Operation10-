import { IncomingMessage, ServerResponse } from 'node:http';

export const config = {
  api: { bodyParser: false },
};

type NestHttpApplication = {
  init(): Promise<void>;
  getHttpAdapter(): {
    getInstance(): (
      request: IncomingMessage,
      response: ServerResponse,
    ) => void;
  };
};

const { createApp } = require('../backend/dist/main.js') as {
  createApp: () => Promise<NestHttpApplication>;
};

let appPromise: Promise<NestHttpApplication> | undefined;

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    appPromise ??= createApp().then(async (app) => {
      await app.init();
      return app;
    });
    const app = await appPromise;
    app.getHttpAdapter().getInstance()(request, response);
  } catch (error) {
    appPromise = undefined;
    console.error('Vercel API initialization failed:', error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ message: 'API temporairement indisponible.' }));
    }
  }
}
