import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { logger, tokensService, userService } from "../../..";
import { XmppService } from "../saved/XmppServices";

export default async function (socket: ServerWebSocket<ChronosSocket>, clientData: xmlparser.Node) {
  if (!clientData || !clientData.content) return socket.close(1008, "Invalid XML");

  const decodedBytes = Buffer.from(clientData.content, "base64");
  const decodedContent = decodedBytes.toString("utf-8");
  const authFields = decodedContent.split("\u0000");
  const accountId = authFields[1];

  const accessToken = await tokensService.getTokenByTypeAndAccountId("accesstoken", accountId);

  if (XmppService.clients.some((client) => client.accountId === accountId)) return socket.close();

  const user = await userService.findUserByAccountId(accountId);

  if (!user || user.banned) {
    socket.data.isAuthenticated = false;
    return socket.close();
  }

  socket.data.accountId = user.accountId;
  if (accessToken) socket.data.token = accessToken.token;
  socket.data.displayName = user.username;

  if (
    decodedContent &&
    socket.data.accountId &&
    socket.data.displayName &&
    authFields.length === 3
  ) {
    socket.data.isAuthenticated = true;

    logger.info(`New XMPP Client logged in as ${user.username}`);

    socket.send(
      xmlbuilder
        .create("success")
        .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
        .toString(),
    );
  } else {
    socket.send(
      xmlbuilder
        .create("failure")
        .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
        .ele("not-authorized")
        .ele("text")
        .attribute("xml:lang", "eng")
        .text("Password not verified")
        .end()
        .toString(),
    );
  }
}
