import xmlbuilder from "xmlbuilder";
import xmlparser from "xml-parser";
import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import { XmppService } from "../service";
import { friendsService } from "../..";
import { XmppUtilities } from "../../utilities/xmpp";

export default async function (socket: ServerWebSocket<ChronosSocket>, root: xmlparser.Node) {
  const attributeId = root.attributes.id;

  switch (attributeId) {
    case "_xmpp_bind1":
      const binder = root.children.find((val) => val.name === "bind");

      if (socket.data.resource || !socket.data.accountId) return;
      if (!binder) return;

      if (XmppService.xmppClients.find((client) => client.accountId === socket.data.accountId)) {
        socket.send(
          xmlbuilder
            .create("close")
            .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-framing")
            .toString({ pretty: true }),
        );
        return socket.close();
      }

      const resource = root.children
        .find((value) => value.name === "bind")
        ?.children.find((value) => value.name === "resource");

      if (!resource) return;

      socket.data.resource = resource.content;
      socket.data.jid = `${socket.data.accountId}@prod.ol.epicgames.com/${socket.data.resource}`;

      socket.send(
        xmlbuilder
          .create("iq")
          .attribute("to", socket.data.jid)
          .attribute("id", "_xmpp_bind1")
          .attribute("xmlns", "jabber:client")
          .attribute("type", "result")
          .element("bind")
          .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind")
          .element("jid", socket.data.jid)
          .up()
          .up()
          .toString({ pretty: true }),
      );
      break;

    case "_xmpp_session1":
      socket.send(
        xmlbuilder
          .create("iq")
          .attribute("to", (socket as any).jid)
          .attribute("from", "prod.ol.epicgames.com")
          .attribute("id", "_xmpp_session1")
          .attribute("xmlns", "jabber:client")
          .attribute("type", "result")
          .toString({ pretty: true }),
      );

      const user = await friendsService.findFriendByAccountId(socket.data.accountId as string);

      if (!user) return socket.close();

      user.accepted.forEach(async (friend) => {
        const client = XmppService.xmppClients.find(
          (client) => client.accountId === friend.accountId,
        );

        if (!client) return;

        let xaml = xmlbuilder
          .create("message")
          .attribute("to", (socket as any).jid)
          .attribute("xmlns", "jabber:client")
          .attribute("from", client.jid)
          .attribute("type", "available");

        if (client.lastPresenceUpdate.away) {
          xaml = xaml
            .element("show", "away")
            .up()
            .element("status", client.lastPresenceUpdate.status)
            .up();
        }

        xaml = xaml.element("status", client.lastPresenceUpdate.status).up();

        socket.send(xaml.toString({ pretty: true }));
      });

      break;

    default:
      socket.send(
        xmlbuilder
          .create("iq")
          .attribute("to", socket.data.jid)
          .attribute("from", "prod.ol.epicgames.com")
          .attribute("id", attributeId)
          .attribute("type", "result")
          .toString({ pretty: true }),
      );
  }
}
