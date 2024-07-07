import type { ServerWebSocket } from "bun";
import type { Socket } from "./server";
import type { PartyInfo } from "../xmpp/saved/XmppServices";
import { getQueueLength } from "./utilities/getQueueLength";

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

  public static waiting(socket: ServerWebSocket<Socket>, party: PartyInfo | undefined) {
    if (!party) return;

    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Waiting",
          totalPlayers: party.members.length,
          connectedPlayers: party.members.length,
        },
      }),
    );
  }

  public static queueFull(socket: ServerWebSocket<Socket>) {
    return socket.send(JSON.stringify({ payload: { state: "QueueFull" }, name: "StatusUpdate" }));
  }

  public static queued(
    socket: ServerWebSocket<Socket>,
    ticketId: string,
    party: PartyInfo,
    queue: string[],
  ) {
    const length = getQueueLength(party);

    if (!length) return;

    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Queued",
          ticketId,
          estimatedWaitSec: 10 * Math.random(),
          queuedPlayers: queue.length,
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
          joinDelaySec: 0,
        },
      }),
    );
  }
}
