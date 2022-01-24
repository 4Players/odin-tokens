import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { TokenGenerator } from '@4players/odin-tokens';

// replace the accessKey with your own, if you want to generate tokens for testing purposes.
const accessKey = 'AcIbjUrHA8EV62TAGYcwDtHhQ8wN3lXmcKtFtN/SvdMA';
const generator = new TokenGenerator(accessKey);

const hostname = '0.0.0.0';
const port = 8080;

function onRequest (req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? hostname}`);
  const roomId = url.pathname.substr(1) || 'default';
  const userId = url.searchParams.get('user_id') ?? 'unknown';
  const token = generator.createToken(roomId, userId);
  console.log(`💡 new token for '${userId}' in '${roomId}'`);
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.write(`{ "token": "${token}" }`);
  res.end();
}

createServer(onRequest).listen(port, hostname);

console.log(`🚀 on http://${hostname}:${port}/my_room?user_id=john`);
