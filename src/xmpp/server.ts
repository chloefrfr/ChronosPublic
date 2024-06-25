import type { ServerWebSocket } from "bun";
import { logger } from "..";
import { Client } from "./client";

export interface ChronosSocket extends ServerWebSocket {
  isAuthenticated?: boolean;
  accountId?: string;
  token?: string;
  displayName?: string;
  jid?: string;
  resource?: string;
  socket?: ServerWebSocket<ChronosSocket> | null;
}

export const xmppServer = Bun.serve<ChronosSocket>({
  port: 8314,
  fetch(request, server) {
    server.upgrade(request, { data: { socket: null } });

    return undefined;
  },
  websocket: {
    open(socket) {
      socket.data.socket = socket;
    },
    async message(socket, message) {
      new Client(socket, message);
    },
    async close(socket) {
      /// TODO
    },
  },
});

logger.startup(`Xmpp server running on port 8314.`);
