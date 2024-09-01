import { logger } from "..";
import { activeUntil, SEASON_EVENTS, type Event } from "../memory/constants/events";
import uaparser from "./uaparser";

export interface SeasonEvent {
  seasonNumber: number;
  events: Event[];
}

export default class TimelineHelper {
  public static async createTimeline(userAgent: string | undefined) {
    const parsedUserAgent = uaparser(userAgent);
    const currentISODate = new Date().toISOString();

    const events: Event[] = [
      {
        eventType: `EventFlag.LobbySeason${parsedUserAgent?.season}`,
        activeUntil,
        activeSince: currentISODate,
      },
    ];
    this.addSeasonEvents(parsedUserAgent?.season, events);

    return events;
  }

  private static addSeasonEvents(seasonNumber: number | undefined, events: Event[]) {
    if (seasonNumber) {
      for (const { seasonNumber: s, events: seasonEvents } of SEASON_EVENTS) {
        if (seasonNumber >= s) {
          events.push(
            ...seasonEvents.map(({ eventType, activeUntil, activeSince }) => ({
              eventType,
              activeUntil,
              activeSince,
            })),
          );
        }
      }
    }
  }
}
