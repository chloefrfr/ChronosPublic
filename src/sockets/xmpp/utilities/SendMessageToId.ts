import xmlbuilder from "xmlbuilder";
import { XmppService } from "../saved/XmppServices";

export function SendMessageToId(body: string, receiverId: string) {
  const receiver = XmppService.clients.find((client) => client.accountId === receiverId);

  if (!receiver) return;

  const xml = xmlbuilder
    .create("message")
    .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
    .attribute("to", receiver.jid)
    .attribute("xmlns", "jabber:client")
    .element("body", body)
    .up()
    .toString({ pretty: true });

  receiver.socket?.send(xml);
}
