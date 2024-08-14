import xmlbuilder from "xmlbuilder";
import { TLSSocket } from "tls";
import { v4 as uuid } from "uuid";
import xmlparser from "xml-parser";
import net from "node:net";
import { logger } from "../../../..";

export default function (socket: net.Socket, message: string | Buffer) {
  logger.debug(`(stream:stream) Message: ${message}`);

  socket.write(
    '<?xml version="1.0"?>' +
      xmlbuilder
        .create("stream:stream")
        .attribute("xmlns", "jabber:client")
        .attribute("from", "prod.ol.epicgames.com")
        .attribute("id", uuid().replace(/-/gi, ""))
        .attribute("version", "1.0")
        .attribute("xml:lang", "en")
        .attribute("xmlns:stream", "http://etherx.jabber.org/streams")
        .toString()
        .replace(/\/[>]$/g, ">"),
  );

  socket.write(
    xmlbuilder
      .create("stream:features")
      .attribute("xmlns:stream", "http://etherx.jabber.org/streams")
      .element("mechanisms")
      .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
      .element("mechanism", "PLAIN")
      .up()
      .up()
      .element("ver")
      .attribute("xmlns", "urn:xmpp:features:rosterver")
      .up()
      .element("starttls")
      .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls")
      .up()
      .element("compression")
      .attribute("xmlns", "http://jabber.org/features/compress")
      .element("method", "zlib")
      .up()
      .up()
      .element("auth")
      .attribute("xmlns", "http://jabber.org/features/iq-auth")
      .up()
      .toString(),
  );
}
