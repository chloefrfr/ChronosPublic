import { logger } from "..";
import { Timeline, type Event } from "../tables/timeline";
import uaparser from "./uaparser";

export interface SeasonEvent {
  seasonNumber: number;
  events: Event[];
}

export default class TimelineHelper {
  private static readonly activeUntil = "9999-01-01T00:00:00.000Z";

  public static async createTimeline(userAgent: string | undefined) {
    const currentDate = new Date().toISOString();
    const uahelper = uaparser(userAgent);
    const eventType = `EventFlag.LobbySeason${uahelper?.season}`;

    const existingTimelines = await Timeline.find({ where: { season: uahelper?.season } });

    const existingTimeline = existingTimelines.find(
      (timeline) => timeline.eventName === eventType && timeline.season === uahelper?.season,
    );

    if (existingTimeline) {
      const allEvents = existingTimelines.map((timeline) => ({
        eventName: timeline.eventName,
        activeUntil: timeline.activeUntil,
        activeSince: timeline.activeSince,
      }));

      return allEvents;
    } else {
      const newTimeline = new Timeline();

      newTimeline.eventName = eventType;
      newTimeline.activeUntil = this.activeUntil;
      newTimeline.activeSince = currentDate;
      newTimeline.season = uahelper?.season as number;

      await newTimeline.save();

      const allEvents = [...existingTimelines, newTimeline].map((timeline) => ({
        eventName: timeline.eventName,
        activeUntil: timeline.activeUntil,
        activeSince: timeline.activeSince,
      }));

      return allEvents;
    }
  }

  public static async addNewEvent(
    eventType: string,
    activeSince: string,
    activeUntil: string,
    season: number,
  ) {
    try {
      const existingTimeline = await Timeline.findOne({ where: { eventName: eventType, season } });

      if (existingTimeline) return { success: false, message: "This event already exists." };

      const newTimeline = new Timeline();

      newTimeline.eventName = eventType;
      newTimeline.activeUntil = activeUntil;
      newTimeline.activeSince = activeSince;
      newTimeline.season = season;

      await newTimeline.save();

      return { success: true, event: newTimeline };
    } catch (error) {
      logger.error(`Error adding new event: ${error}`);

      return { success: false, message: "Failed to add new event." };
    }
  }
}
