import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { XmppService } from "../service";
import { logger } from "../..";
import { XmppUtilities } from "../../utilities/xmpp";

export default async function (socket: ServerWebSocket<ChronosSocket>, root: xmlparser.Node) {
  const findBodyContent = root.children.find((val) => val.name === "body");

  if (!findBodyContent || !findBodyContent.content) return;

  const body = findBodyContent.content;
  const { type } = root.attributes;

  switch (type) {
    case "chat":
      if (body.length >= 300) return;

      const accountId = root.attributes.to.split("@")[0];
      const client = XmppService.xmppClients.find((client) => client.accountId === accountId);
      const sender = XmppService.xmppClients.find((client) => client.accountId === accountId);

      if (!client || !sender) return;

      client.socket.send(
        xmlbuilder
          .create("message")
          .attribute("to", client.jid)
          .attribute("from", sender.jid)
          .attribute("xmlns", "jabber:client")
          .attribute("type", "chat")
          .element("body", body)
          .up()
          .toString({ pretty: true }),
      );
      break;

    case "groupchat":
      const room = root.attributes.to.split("@")[0];

      if (!XmppService.xmppMucs[room]) return;

      const roomData = XmppService.xmppMucs[room];
      if (!roomData?.members.find((member) => member.accountId === socket.data.accountId)) return;

      roomData.members.forEach((member) => {
        const client = XmppService.xmppClients.find(
          (client) => client.accountId === member.accountId,
        );

        if (!client) return;

        client.socket.send(
          xmlbuilder
            .create("message")
            .attribute("to", client.jid)
            .attribute(
              "from",
              `${room}@muc.prod.ol.epicgames.com/${encodeURI(socket.data.displayName as string)}:${
                socket.data.accountId
              }:${socket.data.resource}`,
            )
            .attribute("xmlns", "jabber:client")
            .attribute("type", "groupchat")
            .element("body", body)
            .up()
            .toString({ pretty: true }),
        );
      });

      break;
  }

  let bodyJSON: string = "";

  try {
    bodyJSON = JSON.parse(body);
  } catch (error) {
    logger.error(`Failed to Parse Body Content: ${error}`);
    return;
  }

  if (bodyJSON !== null) {
    await XmppUtilities.SendMessageToClient(socket.data.jid as string, body, root);
  }
}
