import net from "node:net";
import { v4 as uuid } from "uuid";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import path from "node:path";
import { TLSSocket } from "tls";
import { logger } from "../../..";
import stream from "./roots/stream";
import starttls from "./roots/starttls";

const tcpServer = net.createServer();

export let isAuthenticated = false;

tcpServer.on("connection", (socket) => {
  socket.on("data", async (message: Buffer | string) => {
    if (Buffer.isBuffer(message)) message = message.toString();

    logger.info(`Data: ${message.toString()}`);

    const msg = xmlparser(message);
    const root = msg.root ? msg.root.name : "";

    logger.info(`Root: ${root}`);

    switch (root) {
      case "stream:stream":
        stream(socket, message);
        break;
      case "starttls":
        starttls(socket, isAuthenticated, message);
        break;

      case "":
        socket.write(message);
        break;

      default:
        logger.warn(`Missing root: ${root}`);
        break;
    }
  });
});

tcpServer.on("listening", () => {
  logger.startup("TCP started listening on port 7777");
});

tcpServer.listen(7777);
