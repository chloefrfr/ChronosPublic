import type { ServerWebSocket } from "bun";
import { logger } from "../..";
import { Client } from "./client";
import { XmppService, type StatusInfo } from "./saved/XmppServices";
import { updatePresenceForFriend } from "./utilities/UpdatePresenceForFriend";
import xmlbuilder from "xmlbuilder";
import { v4 as uuid } from "uuid";

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

      await updatePresenceForFriend(socket, "{}", true, false);
      XmppService.clients.splice(clientIndex, 1);

      for (const muc of XmppService.joinedMUCs) {
        const MUCRoom = XmppService.xmppMucs[muc];

        if (MUCRoom) {
          const MUCIndex = MUCRoom.members.findIndex(
            (member) => member.accountId === client.accountId,
          );

          if (MUCIndex !== -1) MUCRoom.members.splice(MUCIndex, 1);
        }
      }

      const clientStatus = client.lastPresenceUpdate.status;
      let partyId: string | undefined = "";

      if (clientStatus) {
        const parsedStatus: StatusInfo = JSON.parse(clientStatus);

        for (const [key, property] of Object.entries(parsedStatus.Properties)) {
          if (key.toLowerCase().startsWith("party.joininfo")) {
            if (!property.partyId) {
              return logger.error("Property 'partyId' is not valid.");
            }
            partyId = property.partyId;
          }
        }
      }

      if (partyId) {
        XmppService.clients.forEach(({ accountId, jid, socket }) => {
          if (client.accountId !== accountId) {
            socket.send(
              xmlbuilder
                .create("message")
                .attribute("id", uuid())
                .attribute("from", client.jid)
                .attribute("xmlns", "jabber:client")
                .attribute("to", jid)
                .element(
                  "body",
                  JSON.stringify({
                    type: "com.epicgames.party.memberexited",
                    payload: {
                      partyId,
                      memberId: client.accountId,
                      wasKicked: false,
                    },
                    timestamp: new Date().toISOString(),
                  }),
                )
                .up()
                .toString(),
            );
          }
        });
      }

      logger.info(`Closed Socket Connection for client with the username ${client.displayName}`);
      socket.close();
    },
  },
});

logger.startup(`Xmpp server running on port ${xmppServer.port}.`);
