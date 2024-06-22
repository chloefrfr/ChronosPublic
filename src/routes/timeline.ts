import { app, db } from "..";
import errors from "../utilities/errors";
import TimelineHelper from "../utilities/timelinehelper";
import uaparser from "../utilities/uaparser";

export default function () {
  app.get("/fortnite/api/calendar/v1/timeline", async (c) => {
    const date = new Date();
    const useragent = c.req.header("User-Agent");

    if (!useragent)
      return c.json(
        errors.createError(400, c.req.url, "header 'User-Agent' is missing.", date.toISOString()),
        400,
      );

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 1);

    const expiration = date.toISOString();
    const uahelper = uaparser(useragent);

    if (!uahelper)
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", date.toISOString()),
        400,
      );

    const activeEvents = await TimelineHelper.createTimeline(useragent);

    return c.json({
      channels: {
        "client-matchmaking": {
          states: [
            {
              validForm: new Date().toISOString(),
              activeEvents: [],
              state: {
                region: {
                  BR: {
                    eventFlagsForcedOff: ["Playlist_DefaultDuo", "Playlist_DefaultSolo"],
                  },
                  NAW: {
                    eventFlagsForcedOff: ["Playlist_DefaultDuo", "Playlist_DefaultSolo"],
                  },
                  OCE: {
                    eventFlagsForcedOff: ["Playlist_DefaultDuo", "Playlist_DefaultSolo"],
                  },
                  ME: {
                    eventFlagsForcedOff: ["Playlist_DefaultDuo", "Playlist_DefaultSolo"],
                  },
                  ASIA: {
                    eventFlagsForcedOff: ["Playlist_DefaultDuo", "Playlist_DefaultSolo"],
                  },
                },
              },
            },
          ],
          cacheExpire: expiration,
        },
        "featured-islands": {
          states: [
            {
              validFrom: new Date().toISOString(),
              activeEvents: [],
              state: {
                islandCodes: [],
                playlistCuratedContent: {},
                playlistCuratedHub: {},
                islandTemplates: [],
              },
            },
          ],
          cacheExpire: expiration,
        },
        "community-votes": {},
        "client-events": {
          states: [
            {
              validFrom: "0001-01-01T00:00:00.000Z",
              activeEvents,
              state: {
                activeStorefronts: [],
                eventNamedWeights: {},
                seasonNumber: uahelper?.season,
                seasonTemplateId: `AthenaSeason:athenaseason${uahelper?.season}`,
                matchXpBonusPoints: 0,
                seasonBegin: "9999-01-01T00:00:00Z",
                seasonEnd: "9999-01-01T00:00:00Z",
                seasonDisplayedEnd: "9999-01-01T00:00:00Z",
                weeklyStoreEnd: expiration,
                stwEventStoreEnd: "9999-01-01T00:00:00.000Z",
                stwWeeklyStoreEnd: "9999-01-01T00:00:00.000Z",
                dailyStoreEnd: expiration,
                sectionStoreEnds: {
                  Featured: expiration,
                },
              },
            },
          ],
          cacheExpire: expiration,
        },
      },
      eventsTimeOffsetHrs: 0,
      cacheIntervalMins: 10,
      currentTime: new Date().toISOString(),
    });
  });
}
