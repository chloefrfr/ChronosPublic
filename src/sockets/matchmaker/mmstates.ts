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

  public static queued(socket: ServerWebSocket<Socket>, ticketId: string, party: PartyInfo) {
    const length = getQueueLength(party);

    if (!length) return;

    return socket.send(
      JSON.stringify({
        name: "StatusUpdate",
        payload: {
          state: "Queued",
          ticketId,
          estimatedWaitSec: 10 * Math.random(),
          queuedPlayers: length,
        },
      }),
    );
  }
}
