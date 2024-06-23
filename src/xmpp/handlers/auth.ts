import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { logger, tokensService, userService } from "../..";
import { XmppService } from "../service";

export default async function handleAuthentication(
  socket: ServerWebSocket<ChronosSocket>,
  root: xmlparser.Node,
) {
  try {
    if (!root || !root.content) return socket.close(1008, "Invalid XML");

    const decodedNodeContent = atob(root.content);
    if (decodedNodeContent.includes("\u0000")) return socket.close(1008, "Invalid XML");
    const authenticationFields = decodedNodeContent.split("\u0000");

    if (authenticationFields.length !== 3 || !Array.isArray(authenticationFields))
      return socket.close(1008, "Invalid Length or Not an Array.");

    const accountId = authenticationFields[1];

    if (isUserConnected(accountId)) return socket.close(1008, "User already connected.");

    const user = await userService.findUserByAccountId(accountId);
    if (!user) return socket.close(1008, "User not found.");

    if (user.banned) return socket.close(1008, "User is banned.");

    const accessToken = await tokensService.getTokenByTypeAndAccountId("accesstoken", accountId);

    socket.data.accountId = user.accountId;
    socket.data.displayName = user.username;
    if (accessToken) {
      socket.data.token = accessToken.token;
    }
    socket.data.isAuthenticated = true;

    socket.send(
      xmlbuilder
        .create("success")
        .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
        .toString(),
    );

    logger.info(`Socket Client with the username ${socket.data.displayName} has connected.`);
  } catch (error) {
    socket.send(
      xmlbuilder
        .create("failure")
        .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
        .ele("not-authorized")
        .ele("text")
        .attribute("xml:lang", "eng")
        .text("Authentication failed")
        .end()
        .toString(),
    );
  }
}

export function isUserConnected(accountId: string): boolean {
  for (const client of XmppService.xmppClients.values()) {
    if (client.accountId === accountId) {
      return true;
    }
  }
  return false;
}
