import { createServer as createNodeServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createMcpServer, describeDeployment } from '../server.js';
import { forwardedUser } from '../productive/identity.js';
import {
  assertAllowedOrigin,
  assertAuthorized,
  corsHeaders,
  getHttpConfig,
  HttpRequestError,
  readJsonBody,
  sendJson,
} from './http-helpers.js';

const config = getHttpConfig();

const httpServer = createNodeServer(async (req, res) => {
  try {
    // A liveness probe that does not need the bearer token, so a container
    // healthcheck does not have to be given one.
    if (req.url === '/healthz') {
      sendJson(res, 200, { ok: true }, req);
      return;
    }

    if (req.url !== '/mcp') {
      sendJson(res, 404, { error: 'Not found' }, req);
      return;
    }

    assertAllowedOrigin(req);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' }, req, { Allow: 'POST' });
      return;
    }

    assertAuthorized(req, config);
    const body = await readJsonBody(req, config.maxBodyBytes);

    // Who the gateway says is asking. Read only when
    // PRODUCTIVE_TRUST_FORWARDED_USER is on — forwardedUser() enforces that —
    // because any MCP client can set a header, and this value decides whose
    // name goes on a time entry.
    const onBehalfOf = forwardedUser(headerValue(req.headers['x-mcp-user']));

    const mcpServer = createMcpServer({ onBehalfOf });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);

    res.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });
  } catch (error) {
    console.error(error);
    if (res.headersSent) return;
    if (error instanceof HttpRequestError) {
      sendJson(res, error.status, { error: error.message }, req);
      return;
    }
    sendJson(
      res,
      500,
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
      req,
    );
  }
});

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

httpServer.listen(config.port, config.host, () => {
  console.error(
    `Productive MCP HTTP server listening on http://${config.host}:${config.port}/mcp — ` +
      JSON.stringify(describeDeployment()),
  );
});
