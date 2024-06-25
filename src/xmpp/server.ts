import type { ServerWebSocket } from "bun";
import XmppClient from "./client";
import { logger } from "..";
import { XmppService } from "./service";
import { XmppUtilities } from "../utilities/xmpp";
import client from "./client";

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
    server.upgrade(request, { data: { socket: null, client: XmppClient } });

    return undefined;
  },
  websocket: {
    open(socket) {
      socket.data.socket = socket;
    },
    async message(socket, message) {
      await client(socket, message);
    },
    async close(socket, code, reason) {
      XmppService.isConnectionActive = false;
      const clientIndex = XmppService.xmppClients.findIndex((client) => client.socket === socket);
      const client = XmppService.xmppClients[clientIndex];
      if (clientIndex === -1) return;

      await XmppUtilities.UpdateClientPresence(socket, "{}", true, false);
      XmppService.xmppClients.splice(clientIndex, 1);

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

logger.startup(`Xmpp server running on port 8314.`);
