import xmlbuilder from "xmlbuilder";
import { XmppService } from "../saved/XmppServices";

export async function getUserPresence(offline: boolean, senderId: string, receiverId: string) {
  const sender = XmppService.clients.find((client) => client.accountId === senderId);
  const receiver = XmppService.clients.find((client) => client.accountId === receiverId);

  if (!sender || !receiver) return;

  let xmlMessage = xmlbuilder
    .create("presence")
    .attribute("to", receiver.jid)
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

  receiver.socket.send(xmlMessage.toString({ pretty: true }));
}
