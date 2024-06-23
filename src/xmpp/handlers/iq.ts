import xmlbuilder from "xmlbuilder";
import xmlparser from "xml-parser";
import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import { isUserConnected } from "./auth";

export default async function (socket: ServerWebSocket<ChronosSocket>, root: xmlparser.Node) {
  const attributeId = root.attributes.id;

  switch (attributeId) {
    case "_xmpp_bind1":
      const binder = root.children.find((val) => val.name === "bind");

      if (socket.data.resource || !socket.data.accountId) return;
      if (!binder) return;

      if (isUserConnected(socket.data.accountId)) {
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
