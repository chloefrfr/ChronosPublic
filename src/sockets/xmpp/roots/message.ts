import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import { XmppService } from "../saved/XmppServices";
import { logger } from "../../..";
import xmlbuilder from "xmlbuilder";
import { XmppUtilities } from "../utilities/XmppUtilities";

export default async function (socket: ServerWebSocket<ChronosSocket>, clientData: xmlparser.Node) {
  const findBodyContent = clientData.children.find((value) => value.name === "body");

  if (!findBodyContent || !findBodyContent.content) {
    logger.error("Body is not valid!");
    return;
  }

  const body = findBodyContent.content;
  const { type } = clientData.attributes;

  switch (type) {
    case "chat":
      if (body.length >= 300) return;

      const client = XmppService.clients.find(
        (client) => client.accountId === clientData.attributes.to.split("@")[0],
      );

      const sender = XmppService.clients.find(
        (client) => client.accountId === clientData.attributes.to.split("@")[0],
      );

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
      const room = clientData.attributes.to.split("@")[0];

      if (!XmppService.xmppMucs[room]) return;
      if (
        !XmppService.xmppMucs[room].members.find(
          (member) => member.accountId === socket.data.accountId,
        )
      )
        return;

      XmppService.xmppMucs[room].members.forEach((member) => {
        const client = XmppService.clients.find((client) => client.accountId == member.accountId);

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
    await XmppUtilities.SendMessageToClient(socket.data.jid as string, body, clientData);
  }
}