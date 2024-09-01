import xmlbuilder from "xmlbuilder";
import { XmppService } from "../saved/XmppServices";

export async function SendMessageToSender(
  payload: string,
  senderId: string,
  accountId: string,
  id: string,
): Promise<void> {
  const client = XmppService.clients.find((client) => client.accountId === accountId);
  const sender = XmppService.clients.find((client) => client.accountId === senderId);
  if (!client || !client.socket) return;
  if (!sender || !sender.socket) return;

  client.socket.send(
    xmlbuilder
      .create("message")
      .attribute("from", sender.jid)
      .attribute("id", id)
      .attribute("to", client.jid)
      .attribute("xmlns", "jabber:client")
      .element("body", `${payload}`)
      .up()
      .toString({ pretty: true }),
  );
}
