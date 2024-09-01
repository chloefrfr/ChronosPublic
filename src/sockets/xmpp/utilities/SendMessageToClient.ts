import xmlbuilder from "xmlbuilder";
import xmlparser from "xml-parser";
import { XmppService } from "../saved/XmppServices";

export async function sendMessageToClient(jid: string, body: string, clientData: xmlparser.Node) {
  const receiverIndex = XmppService.clients.findIndex(
    (client) =>
      client.jid.split("/")[0] === clientData.attributes.to ||
      client.accountId === clientData.attributes.to,
  );

  if (receiverIndex === -1) return;

  const receiver = XmppService.clients[receiverIndex];

  receiver.socket.send(
    xmlbuilder
      .create("message")
      .attribute("from", jid)
      .attribute("xmlns", "jabber:client")
      .attribute("to", receiver.jid)
      .attribute("id", clientData.attributes.id)
      .element("body", body)
      .up()
      .toString({ pretty: true }),
  );
}
