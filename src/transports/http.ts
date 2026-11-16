import { ConfigError } from '../config-env.js';
import { ProductiveClient } from '../productive/client.js';
import { perUserAuthEnabled } from '../productive/policy.js';
import { CredentialStore } from '../productive/store.js';
import { describeDeployment } from '../server.js';
import { createHttpApp } from './http-app.js';
import { configWarnings, getHttpConfig, type HttpConfig } from './http-helpers.js';
import { startHttpServer } from './http-server.js';

/**
 * Entry point: read the environment, build the dependencies once, listen.
 *
 * All the routing lives in http-app.ts so it can be tested without binding a
 * port; this file only decides what to inject.
 */
async function main(): Promise<void> {
  let config: HttpConfig;
  try {
    // Also refuses a trusted forwarded user header without MCP_HTTP_TOKEN.
    config = getHttpConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Productive MCP HTTP server not started: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const perUser = perUserAuthEnabled();
  let store: CredentialStore | undefined;
  let enrollClient: ProductiveClient;
  try {
    // Constructed at startup so a missing or weak encryption key, or an
    // invalid client setting, stops the server now with a clear message
    // rather than on somebody's first request.
    store = perUser ? new CredentialStore() : undefined;
    enrollClient = new ProductiveClient();
  } catch (error) {
    console.error(`Productive MCP HTTP server not started: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  for (const warning of configWarnings(config)) {
    console.error(warning);
  }

  const running = await startHttpServer(
    config,
    createHttpApp({
      config,
      perUser,
      store,
      enrollClient,
      publicBaseUrl: process.env.PRODUCTIVE_PUBLIC_BASE_URL,
    }),
  );
  console.error(
    `Productive MCP HTTP server listening on http://${config.host}:${running.port}/mcp — ` +
      JSON.stringify(describeDeployment()),
  );

  const shutdown = (signal: string) => {
    console.error(`Received ${signal}, shutting down`);
    void running.close().then(() => process.exit(0));
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
