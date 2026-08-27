import { createServer as createNodeServer } from 'node:http';
import { ProductiveClient } from '../productive/client.js';
import { perUserAuthEnabled } from '../productive/policy.js';
import { CredentialStore } from '../productive/store.js';
import { describeDeployment } from '../server.js';
import { createHttpApp, getHttpConfig } from './http-app.js';

/**
 * Entry point: read the environment, build the dependencies once, listen.
 *
 * All the routing lives in http-app.ts so it can be tested without binding a
 * port; this file only decides what to inject.
 */
const config = getHttpConfig();
const perUser = perUserAuthEnabled();

// Constructed at startup so a missing or weak encryption key stops the server
// now, with a clear message, rather than on somebody's first enrollment.
const store = perUser ? new CredentialStore() : undefined;

const httpServer = createNodeServer(
  createHttpApp({
    config,
    perUser,
    store,
    enrollClient: new ProductiveClient(),
    publicBaseUrl: process.env.PRODUCTIVE_PUBLIC_BASE_URL,
  }),
);

httpServer.listen(config.port, config.host, () => {
  console.error(
    `Productive MCP HTTP server listening on http://${config.host}:${config.port}/mcp — ` +
      JSON.stringify(describeDeployment()),
  );
});
