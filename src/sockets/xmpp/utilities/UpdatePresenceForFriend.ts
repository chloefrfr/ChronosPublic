import type { ServerWebSocket } from "bun";
import xmlbuilder from "xmlbuilder";
import type { ChronosSocket } from "../client";
import { XmppService } from "../saved/XmppServices";
import { friendsService } from "../../..";

export async function updatePresenceForFriend(
  socket: ServerWebSocket<ChronosSocket>,
  status: string,
  offline: boolean,
  away: boolean,
) {
  const senderIndex = XmppService.clients.findIndex((client) => client.socket === socket);
  const sender = XmppService.clients[senderIndex];

  if (!sender) return;

  sender.lastPresenceUpdate.away = away;
  sender.lastPresenceUpdate.status = status;

  const friends = await friendsService.findFriendByAccountId(sender.accountId);

  if (!friends) return;

  for (const accepted of friends.accepted) {
    const client = XmppService.clients.find((client) => client.accountId === accepted.accountId);

    if (!client) continue;

    let xmlMessage = xmlbuilder
      .create("presence")
      .attribute("to", client.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("from", sender.jid)
      .attribute("type", offline ? "unavailable" : "available");

    if (sender.lastPresenceUpdate.away) {
      xmlMessage = xmlMessage
        .element("show", "away")
        .element("status", sender.lastPresenceUpdate.status)
        .up();
    } else {
      xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();
    }

    client.socket.send(xmlMessage.toString({ pretty: true }));
  }
}
