import type { ServerWebSocket } from "bun";
import XmppClient from "./client";
import { logger } from "..";

export interface ChronosSocket extends ServerWebSocket {
  isAuthenticated?: boolean;
  accountId?: string;
  token?: string;
  displayName?: string;
  jid?: string;
  resource?: string;
  socket?: ServerWebSocket<ChronosSocket> | null;
  client?: XmppClient;
}

export const xmppServer = Bun.serve<ChronosSocket>({
  port: 8314,
  fetch(request, server) {
    server.upgrade(request, { data: { socket: null, client: XmppClient } });

    return undefined;
  },
  websocket: {
    open(socket) {
      socket.data.socket = socket;
    },
    async message(socket, message) {
      socket.data.client = new XmppClient({ socket, message });
      await socket.data.client.initialize();
    },
  },
});

logger.startup(`Xmpp server running on port 8314.`);
