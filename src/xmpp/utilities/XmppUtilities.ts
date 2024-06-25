import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import { friendsService, logger } from "../..";
import { XmppService } from "../saved/XmppServices";
import xmlbuilder from "xmlbuilder";

export namespace XmppUtilities {
  export async function UpdatePresenceForFriend(
    socket: ServerWebSocket<ChronosSocket>,
    status: string,
    offline: boolean,
    away: boolean,
  ) {
    logger.debug(`isAway: ${away}`);
    logger.debug(`isOffline: ${offline}`);

    const sender = XmppService.clients.find((client) => client.socket === socket);

    if (!sender) return;

    sender.lastPresenceUpdate.away = away;
    sender.lastPresenceUpdate.status = status;

    const friends = await friendsService.findFriendByAccountId(sender.accountId);

    if (!friends) return;

    for (const accepted of friends.accepted) {
      console.log(accepted);

      const client = XmppService.clients.find((client) => client.accountId === accepted.accountId);

      if (!client) continue;

      console.log(client.displayName);

      let xmlMessage = xmlbuilder
        .create("presence")
        .attribute("to", client.jid)
        .attribute("xmlns", "jabber:client")
        .attribute("from", sender.jid)
        .attribute("type", offline ? "unavailable" : "available");

      if (sender.lastPresenceUpdate.away)
        xmlMessage = xmlMessage
          .element("show", "away")
          .element("status", sender.lastPresenceUpdate.status)
          .up();
      else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

      console.log(xmlMessage.toString({ pretty: true }));

      client.socket.send(xmlMessage.toString({ pretty: true }));
    }
  }

  export async function GetUserPresence(offline: boolean, senderId: string, receiverId: string) {
    const sender = XmppService.clients.find((client) => client.accountId === senderId);
    const receiver = XmppService.clients.find((client) => client.accountId === receiverId);

    if (!sender || !receiver) return;

    let xmlMessage = xmlbuilder
      .create("presence")
      .attribute("to", receiver.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("from", sender.jid)
      .attribute("type", offline ? "unavailable" : "available");
    // .end({ pretty: true });

    if (sender.lastPresenceUpdate.away)
      xmlMessage = xmlMessage
        .element("show", "away")
        .element("status", sender.lastPresenceUpdate.status)
        .up();
    else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

    console.log(xmlMessage.toString({ pretty: true }));

    receiver.socket.send(xmlMessage.toString({ pretty: true }));
  }
}
