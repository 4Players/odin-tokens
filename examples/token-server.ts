import { TokenGenerator } from "@4players/odin-tokens";

// replace the accessKey with your own, if you want to generate tokens for testing purposes.
const accessKey = "AcIbjUrHA8EV62TAGYcwDtHhQ8wN3lXmcKtFtN/SvdMA";
const generator = new TokenGenerator(accessKey);
const hostname = "0.0.0.0";
const port = 8080;

function onListen({ hostname, port }: Deno.NetAddr) {
  console.log(`🚀 on http://${hostname}:${port}/my_room?user_id=john`);
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const roomId = url.pathname.slice(1) || "default";
  const userId = url.searchParams.get("user_id") ?? "unknown";
  const token = await generator.createToken(roomId, userId);
  console.log(`💡 new token for '${userId}' in '${roomId}'`);

  return new Response(`{ "token": "${token}" } `, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

Deno.serve({ hostname, port, onListen }, handler);
