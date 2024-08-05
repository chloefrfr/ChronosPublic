import type { ServerWebSocket } from "bun";
import { logger } from "../..";
import { Client } from "./client";
import { XmppService } from "./saved/XmppServices";
import { XmppUtilities } from "./utilities/XmppUtilities";

export interface ChronosSocket extends ServerWebSocket {
  isLoggedIn?: boolean;
  isAuthenticated?: boolean;
  accountId?: string;
  token?: string;
  displayName?: string;
  jid?: string;
  resource?: string;
  socket?: ServerWebSocket<ChronosSocket> | null;
}

export const xmppServer = Bun.serve<ChronosSocket>({
  port: 8080,
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
      socket.data.isLoggedIn = false;
      const clientIndex = XmppService.clients.findIndex((client) => client.socket === socket);
      const client = XmppService.clients[clientIndex];
      if (clientIndex === -1) return;

      await XmppUtilities.UpdatePresenceForFriend(socket, "{}", true, false);
      XmppService.clients.splice(clientIndex, 1);

      for (let muc of XmppService.joinedMUCs) {
        const MUCRoom = XmppService.xmppMucs[muc];

        if (MUCRoom) {
          const MUCIndex = MUCRoom.members.findIndex(
            (member) => member.accountId === client.accountId,
          );

          if (MUCIndex !== -1) MUCRoom.members.splice(MUCIndex, 1);
        }
      }

      logger.info(`Closed Socket Connection for client with the username ${client.displayName}`);
      socket.close();
    },
  },
});

logger.startup(`Xmpp server running on port ${xmppServer.port}.`);
