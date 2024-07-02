import { logger } from "../..";

export interface MatchmakerSocket {}

export const matchmakerServer = Bun.serve<MatchmakerSocket>({
  port: 8413,
  async fetch(request, server) {
    const auth = request.headers.get("Authorization");

    if (!auth) {
      return new Response("Authorization Payload is Invalid!", {
        status: 400,
      });
    }

    const [, , encrypted, json, signature] = auth.split(" ");

    if (!encrypted || !signature) return new Response("Unauthorized request", { status: 401 });

    server.upgrade(request);

    return undefined;
  },
  websocket: {
    open(socket) {},
    message(socket, message) {},
  },
});

logger.startup(`Matchmaker started on port ${matchmakerServer.port}`);
