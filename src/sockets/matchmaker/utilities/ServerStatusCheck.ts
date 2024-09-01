import server from "../../../routes/server";
import { ServerStatus, type HostServer } from "../../gamesessions/types";
import { getQueueLength } from "./getQueueLength";

export function check(server: HostServer, sessionId: string, port: number) {
  let isServerOnline: boolean = false;

  if (server.status === "online" && server.sessionId === sessionId && server.port === port)
    isServerOnline = true;

  return isServerOnline;
}
