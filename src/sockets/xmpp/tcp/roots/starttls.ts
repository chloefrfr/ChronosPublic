import net from "node:net";
import stream from "./stream";
import { logger } from "../../../..";
import xmlbuilder from "xmlbuilder";
import xmlparser from "xml-parser";
import path from "node:path";
import { TLSSocket } from "tls";

export default async function (
  socket: net.Socket,
  isAuthenticated: boolean,
  message: string | Buffer,
) {
  logger.debug(`(starttls) Message: ${message}`);

  socket.write(
    xmlbuilder.create("proceed").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls").toString(),
  );

  const basePath = path.join(__dirname, "..", "..", "..", "..", "memory", "certs");

  const tlsSocket = new TLSSocket(socket, {
    key: Buffer.from(await Bun.file(path.join(basePath, "private.key")).arrayBuffer()),
    cert: Buffer.from(await Bun.file(path.join(basePath, "server.crt")).arrayBuffer()),
    ca: Buffer.from(await Bun.file(path.join(basePath, "ca.crt")).arrayBuffer()),
    requestCert: true,
    isServer: true,
  });

  tlsSocket.on("close", async () => {
    logger.info("(TLS) Connection Closed!");
  });

  tlsSocket.on("data", async (message: string | Buffer) => {
    if (Buffer.isBuffer(message)) message = message.toString();

    const msg = xmlparser(message);
    const root = msg.root ? msg.root.name : "";

    switch (root) {
      case "stream:stream":
        stream(tlsSocket, message);

        if (isAuthenticated) {
          tlsSocket.write(
            xmlbuilder
              .create("stream:features")
              .attribute("xmlns:stream", "http://etherx.jabber.org/streams")
              .element("ver")
              .attribute("xmlns", "urn:xmpp:features:rosterver")
              .up()
              .element("bind")
              .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind")
              .up()
              .element("compression")
              .attribute("xmlns", "http://jabber.org/features/compress")
              .element("method", "zlib")
              .up()
              .up()
              .element("session")
              .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-session")
              .up()
              .toString(),
          );
        } else {
          stream(tlsSocket, message);
        }
        break;
      case "auth":
        logger.debug("Auth");
        isAuthenticated = true;
        break;
      case "":
        socket.write(message);
        break;
      default:
        logger.warn(`Missing root: ${root}`);
        break;
    }
  });
}
