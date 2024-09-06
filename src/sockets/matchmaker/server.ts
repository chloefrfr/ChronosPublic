import { config, logger, userService } from "../..";
import { Encryption } from "../../utilities/encryption";
import { MatchmakerStates } from "./mmstates";
import { v4 as uuid } from "uuid";
import { isPartyMemberExists } from "./utilities/isPartyMemberExists";
import { removeClientFromQueue } from "./utilities/removeClientFromQueue";
import { ServerStatus, type HostServer } from "../gamesessions/types";
import { RegionIps } from "../../../hosting/hostOptions";

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
  bucketId: string;
  attributes: MatchmakerAttributes;
  expiresAt: string;
  nonce: string;
  sessionId: string;
  matchId: string;
  region: string;
  userAgent: string;
  playlist: string;
}

export type Socket = {
  payload: MatchmakerSocket;
  identifier: string[];
  ticketId: string;
};

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const servers: HostServer[] = [];

function findOrCreateServer(payload: MatchmakerSocket): HostServer {
  let existingServer = servers.find(
    (server) => server.identifier === payload.bucketId && server.options.region === payload.region,
  );

  if (!existingServer) {
    const config = RegionIps[payload.region];
    if (!config) {
      logger.error(`No hoster found for the region: ${payload.region}`);
    }

    existingServer = {
      sessionId: uuid(),
      status: ServerStatus.OFFLINE,
      version: payload.attributes["player.season"],
      identifier: payload.bucketId,
      address: config.address,
      port: config.port,
      queue: [],
      options: {
        region: payload.region,
        matchId: payload.matchId,
        playlist: payload.playlist,
        userAgent: payload.userAgent,
      },
    };
    servers.push(existingServer);
  }

  return existingServer;
}

export const matchmakerServer = Bun.serve<Socket>({
  port: 443,
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
          ticketId: uuid(),
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
        const { accountId, region } = payload;

        const foundParty = isPartyMemberExists(accountId);
        if (!foundParty) {
          return socket.close(1011, "Party not found!");
        }

        const existingServer = findOrCreateServer(payload);

        if (!existingServer.queue.includes(accountId)) {
          existingServer.queue.push(accountId);
        }

        logger.debug(`Server updated with new user for session ${existingServer.sessionId}`);

        MatchmakerStates.connecting(socket);
        MatchmakerStates.waiting(socket, foundParty);
        MatchmakerStates.queued(socket, socket.data.ticketId, foundParty, existingServer.queue);

        while (existingServer.status !== ServerStatus.ONLINE && existingServer.queue.length > 0) {
          await wait(2000);
          const refreshedServer = servers.find(
            (server) => server.identifier === existingServer.identifier,
          );
          if (!refreshedServer) {
            return socket.close(1011, "Server not found");
          }
          existingServer.status = refreshedServer.status;
        }

        if (existingServer.status === ServerStatus.ONLINE) {
          removeClientFromQueue(foundParty, existingServer.queue);
          MatchmakerStates.sessionAssignment(socket, existingServer.options.matchId);
          MatchmakerStates.join(socket, existingServer.sessionId, existingServer.options.matchId);
        } else {
          socket.close(1011, "Server took too long to start");
        }

        // servers.forEach((server, index) => {
        //   if (server.queue.length === 0) {
        //     servers.splice(index, 1);
        //     logger.debug(`Removed empty server: ${server.sessionId}`);
        //   }
        // });
      } catch (error) {
        logger.error(`Error handling WebSocket open event: ${error}`);
        socket.close(1011, "Internal Server Error");
      }
    },
    message(socket, message) {
      try {
        logger.debug("Received message");

        const payload = socket.data.payload;
        const { bucketId, region, playlist, userAgent, accountId } = payload;

        const existingServer = servers.find(
          (server) => server.identifier === bucketId && server.options.region === region,
        );

        if (!existingServer) {
          logger.warn(`No server found for socket: ${accountId}`);
          return;
        }

        const clientInQueue = existingServer.queue.includes(accountId);

        if (!clientInQueue) {
          logger.warn(`Client not found in queue for socket: ${accountId}`);
          return;
        }

        const foundParty = isPartyMemberExists(accountId);

        if (!foundParty) {
          return socket.close(1001, "Party not found!");
        }

        MatchmakerStates.queued(socket, socket.data.ticketId, foundParty, existingServer.queue);
      } catch (error) {
        logger.error(`Error handling WebSocket message event: ${error}`);
      }
    },
    close(socket) {
      try {
        logger.debug("Closed!");

        const payload = socket.data.payload;
        const { bucketId, region, accountId } = payload;

        const existingServer = servers.find(
          (server) => server.identifier === bucketId && server.options.region === region,
        );

        if (!existingServer) {
          logger.warn(`No server found for socket: ${accountId}`);
          return;
        }

        const clientIndex = existingServer.queue.indexOf(accountId);
        if (clientIndex === -1) {
          logger.warn(`Client not found in queue for socket: ${accountId}`);
          return;
        }

        existingServer.queue.splice(clientIndex, 1);

        if (existingServer.queue.length === 0) {
          const serverIndex = servers.findIndex(
            (server) => server.identifier === existingServer.identifier,
          );
          if (serverIndex !== -1) {
            servers.splice(serverIndex, 1);
            logger.debug(`Removed empty server: ${existingServer.sessionId}`);
          }
        }
      } catch (error) {
        logger.error(`Error handling WebSocket close event: ${error}`);
      }
    },
  },
});
