import type { ServerWebSocket } from "bun";
import type { Socket } from "./server";
import type { PartyInfo } from "../xmpp/saved/XmppServices";
import { getQueueLength } from "./utilities/getQueueLength";
import type { XmppClient } from "../xmpp/client";

type PartyOrClientInfo = PartyInfo | XmppClient | undefined;

export class MatchmakerStates {
  public static connecting(socket: ServerWebSocket<Socket>) {
    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Connecting",
        },
      }),
    );
  }

  public static waiting(socket: ServerWebSocket<Socket>, partyOrClient: PartyOrClientInfo) {
    if (!partyOrClient) return;

    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Waiting",
          totalPlayers: "members" in partyOrClient ? partyOrClient.members.length : 1,
          connectedPlayers: "members" in partyOrClient ? partyOrClient.members.length : 1,
        },
      }),
    );
  }

  public static queueFull(socket: ServerWebSocket<Socket>) {
    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "QueueFull",
        },
      }),
    );
  }

  public static queued(
    socket: ServerWebSocket<Socket>,
    ticketId: string,
    partyOrClient: PartyOrClientInfo,
    queue: string[],
  ) {
    const length = partyOrClient && "members" in partyOrClient ? getQueueLength(partyOrClient) : 1;

    if (!length) return;

    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Queued",
          ticketId,
          estimatedWaitSec: 10 * Math.random(),
          queuedPlayers: 0,
        },
      }),
    );
  }

  public static sessionAssignment(socket: ServerWebSocket<Socket>, matchId: string) {
    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "SessionAssignment",
          matchId,
        },
      }),
    );
  }

  public static join(socket: ServerWebSocket<Socket>, sessionId: string, matchId: string) {
    return socket.send(
      JSON.stringify({
        name: "Play",
        payload: {
          matchId,
          sessionId,
          joinDelaySec: 1,
        },
      }),
    );
  }
}
