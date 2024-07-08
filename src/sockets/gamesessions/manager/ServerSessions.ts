import { logger } from "../../..";
import { supportedPlaylists } from "../../../constants/playlists";
import { HostAPI } from "../host";
import { ServerStatus, type HostServer } from "../types";

/* 
const session = await ServerSessions.create({ 
  sessionId: "yap-yap-yap",
  status: ServerStatus.ONLINE,
  version: 13,
  identifier: "playlist_defaultsolo",
  address: "127.0.0.1",
  port: 7777,
  options: {
    bucketId: "31045", // random ass bucketid
    region: "NAE"
  }
})
*/

export namespace ServerSessions {
  export async function create(hostedServer: Partial<HostServer>) {
    try {
      const activeServers = await HostAPI.getAllServers();

      const maxActiveServers = Math.min(2, Math.floor(activeServers.length / 2));

      if (activeServers.length >= maxActiveServers) return null;
      if (!hostedServer || !hostedServer.identifier) return null;

      const playlistParts = hostedServer.identifier.split(":");
      const playlist = playlistParts.pop()!;
      const mappedPlaylistIdentifier = supportedPlaylists.get(playlist) || playlist;

      playlistParts.push(mappedPlaylistIdentifier);
      const playlistIdentity = playlistParts.join(":");

      const matchingServer = activeServers.find((server) => {
        return server.identifier === playlistIdentity && server.status === ServerStatus.OFFLINE;
      });

      if (matchingServer) {
        // TODO - Delete the server
      }

      const newServer = await HostAPI.createServer(hostedServer);

      logger.debug(
        `Created new server for '${newServer.options.region}': ${newServer.address}:${newServer.port}`,
      );

      // TODO - Store Teams in the server table (can be used for queues)
      /* 
        ServerManager.storeTeams(["asfbsgfgfsagyfgauf", "sdhajdshadghasbdha", "shasjdbhasdhbajbdhs"])
        console.log(newServer) -> { options: { teams: ["asfbsgfgfsagyfgauf", "sdhajdshadghasbdha", "shasjdbhasdhbajbdhs"] } }
      */

      return newServer;
    } catch (error) {
      logger.error(`Error creating server session: ${error}`);
      throw error;
    }
  }
}