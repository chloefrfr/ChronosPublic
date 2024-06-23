import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../xmpp/server";
import { XmppService } from "../xmpp/service";
import xmlbuilder from "xmlbuilder";

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

    /// TODO - Loop through accepted friends and send the socket message.
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
}
