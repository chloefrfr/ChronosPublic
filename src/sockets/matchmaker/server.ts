import { config, logger, userService } from "../..";
import { Encryption } from "../../utilities/encryption";
import { servers } from "../gamesessions/servers";
import { XmppService, type PartyInfo } from "../xmpp/saved/XmppServices";
import { MatchmakerStates } from "./mmstates";
import { v4 as uuid } from "uuid";
import { check } from "./utilities/ServerStatusCheck";
import { hosters } from "./hosters/regionhosters";
import { ServerSessions } from "../gamesessions/manager/ServerSessions";
import { ServerStatus, type HostServer } from "../gamesessions/types";
import { isPartyMemberExists } from "./utilities/isPartyMemberExists";

interface MatchmakerAttributes {
  "player.userAgent": string;
  "player.preferredSubregion": string;
  "player.option.spectator": string;
  "player.inputTypes": string;
  "player.revision": number;
  "player.teamFormat": string;
  "player.subregions": string;
  "player.season": number;
  "player.option.partyId": string;
  "player.platform": string;
  "player.option.linkType": string;
  "player.input": string;
  "playlist.revision": number;
  "player.option.fillTeam": boolean;
  "player.option.uiLanguage": string;
  "player.option.microphoneEnabled": boolean;
}

export interface MatchmakerSocket {
  accountId: string;
  attributes: MatchmakerAttributes;
  bucketId: string;
  expiresAt: string;
  nonce: string;
}

export type Socket = {
  payload: MatchmakerSocket;
  identifier: string[];
};

export const matchmakerServer = Bun.serve<Socket>({
  port: 8413,
  async fetch(request, server) {
    try {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader) {
        return new Response("Authorization Payload is Invalid!", { status: 400 });
      }

      const [, , encrypted, json, signature] = authHeader.split(" ");

      if (!encrypted || !signature) {
        return new Response("Unauthorized request", { status: 401 });
      }

      const response = Encryption.decrypt(signature, config.client_secret);
      if (!response) {
        return new Response("Failed to decrypt Response!", { status: 400 });
      }

      let payload: MatchmakerSocket;
      try {
        payload = JSON.parse(response);
      } catch (error) {
        return new Response("Failed to parse decrypted Response!", { status: 400 });
      }

      const user = await userService.findUserByAccountId(payload.accountId);
      if (!user || user.banned) {
        return new Response("Unauthorized request", { status: 401 });
      }

      server.upgrade(request, {
        data: {
          payload,
          identifier: [],
        },
      });

      return undefined;
    } catch (error) {
      logger.error(`Error handling request: ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  websocket: {
    async open(socket) {
      try {
        const payload = socket.data.payload;
        socket.data.identifier.push(payload.bucketId);

        const ticketId = uuid();
        const sessionId = uuid();

        let foundParty: PartyInfo | undefined;
        let existingServer: HostServer | undefined;

        for (const server of servers) {
          if (server.sessionId === payload.bucketId) {
            existingServer = server;
            foundParty = isPartyMemberExists(payload.accountId);
            break;
          }
        }

        if (!existingServer) {
          const newServer: HostServer = {
            sessionId: "",
            status: ServerStatus.OFFLINE,
            version: 0,
            identifier: "",
            address: "",
            port: 0,
            queue: [],
            options: {
              region: "",
            },
          };

          newServer.sessionId = sessionId;
          newServer.identifier = payload.bucketId;
          newServer.version = payload.attributes["player.season"];
          newServer.queue.push(payload.accountId);

          existingServer = newServer;
        } else {
          if (existingServer.queue.length === 100) return socket.close(1011, "Queue is full!");

          existingServer.queue.push(payload.accountId);
        }

        if (!existingServer) {
          return socket.close(1011, "Internal Server Error");
        }

        if (!foundParty) {
          return socket.close(1011, "Party not found!");
        }

        MatchmakerStates.connecting(socket);
        MatchmakerStates.waiting(socket, foundParty);
        MatchmakerStates.queued(socket, ticketId, foundParty);

        console.log(servers);

        for (const server of servers) {
          const existingServers = check(server, server.sessionId, server.port);

          console.log(existingServers);

          if (!existingServers && server.queue.length > 0) {
            logger.info(
              `Creating new server for session ${server.sessionId} on port ${server.port}.`,
            );

            const region = server.identifier.split(":")[2];
            logger.info(`Creating server for region ${region}`);

            const config = hosters[region];

            if (config) {
              server.address = config.address;
              server.port = config.port;
              server.options.region = region;

              const newServer = await ServerSessions.create(server);
              if (!newServer) {
                logger.error(`Failed to create server for session ${server.sessionId}.`);
                continue;
              }

              logger.info(
                `A new server with the identifier ${server.identifier} has been created.`,
              );
              return;
            } else {
              logger.error(`No active server hosts for the region '${region}'`);
              socket.close(1011, `No active server hosts for the region '${region}'`);
              return;
            }
          }
        }
      } catch (error) {
        logger.error(`Error handling WebSocket open event: ${error}`);
        socket.close(1011, "Internal Server Error");
      }
    },
    message(socket, message) {},
  },
});

logger.startup(`Matchmaker started on port ${matchmakerServer.port}`);
