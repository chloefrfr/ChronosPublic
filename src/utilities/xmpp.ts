import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../xmpp/server";
import { XmppService } from "../xmpp/service";
import xmlbuilder from "xmlbuilder";
import { friendsService } from "..";
import xmlparser from "xml-parser";

/* 
{
  Status: "Battle Royale Lobby - 1 / 16",
  bIsPlaying: false,
  bIsJoinable: false,
  bHasVoiceSupport: false,
  SessionId: "",
  Properties: {
    KairosProfile_s: "{\r\n}",
    FortBasicInfo_j: {
      homeBaseRating: 0,
    },
    FortLFG_I: "0",
    FortPartySize_i: 1,
    FortSubGame_i: 1,
    InUnjoinableMatch_b: false,
    FortGameplayStats_j: {
      state: "",
      playlist: "None",
      numKills: 0,
      bFellToDeath: false,
    },
  },
}
*/

export namespace XmppUtilities {
  export function SendMessageToId(body: string, receiverId: string) {
    const receiver = XmppService.xmppClients.get(receiverId);

    if (!receiver) return;

    receiver.socket.send(
      xmlbuilder
        .create("message")
        .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
        .attribute("to", receiver.jid)
        .attribute("xmlns", "jabber:client")
        .element("body", `${body}`)
        .up()
        .toString({ pretty: true }),
    );
  }

  export function refresh(accountId: string) {
    const client = XmppService.xmppClients.get(accountId);

    if (!client) return;

    SendMessageToId(
      JSON.stringify({
        type: "com.epicgames.gift.received",
        payload: {},
        timestamp: new Date().toISOString(),
      }),
      client.accountId,
    );
  }

  export async function UpdateClientPresence(
    socket: ServerWebSocket<ChronosSocket>,
    status: string,
    offline: boolean,
    away: boolean,
  ) {
    const sender = XmppService.xmppClients.get(socket.data.accountId as string);

    if (!sender) return;

    sender.lastPresenceUpdate.status = status;
    sender.lastPresenceUpdate.away = away;

    const friends = await friendsService.findFriendByAccountId(sender.accountId);

    if (!friends) return;

    friends.accepted.forEach((friend) => {
      const client = XmppService.xmppClients.get(friend.accountId);
      if (!client) return;

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

      client.socket.send(xmlMessage.toString({ pretty: true }));
    });
  }

  export async function GetUserPresence(offline: boolean, senderId: string, receiverId: string) {
    const sender = XmppService.xmppClients.get(senderId);
    const receiver = XmppService.xmppClients.get(receiverId);

    if (!sender || !receiver) return;

    let xmlMessage = xmlbuilder
      .create("presence")
      .attribute("to", receiver.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("from", sender.jid)
      .attribute("type", "available");

    if (sender.lastPresenceUpdate.away)
      xmlMessage = xmlMessage
        .element("show", "away")
        .element("status", sender.lastPresenceUpdate.status)
        .up();
    else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

    receiver.socket.send(xmlMessage.toString({ pretty: true }));
  }

  export async function SendMessageToClient(jid: string, body: string, root: xmlparser.Node) {
    const receiver = XmppService.xmppClients.get(root.attributes.to.split("@")[0]);

    if (!receiver) return;
    if (receiver.jid.split("/")[0] !== jid) return;

    receiver.socket.send(
      xmlbuilder
        .create("message")
        .attribute("from", jid)
        .attribute("xmlns", "jabber:client")
        .attribute("to", receiver.jid)
        .attribute("id", root.attributes.id)
        .element("body", body)
        .up()
        .toString({ pretty: true }),
    );
  }
}
