export interface Event {
  eventType: string;
  activeUntil: string;
  activeSince: string;
}

interface SeasonEvent {
  seasonNumber: number;
  events: Event[];
}

export const activeUntil = "9999-01-01T00:00:00.000Z";

export const SEASON_EVENTS: SeasonEvent[] = [
  {
    seasonNumber: 3,
    events: [
      {
        eventType: "Spring2018Phase1",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    seasonNumber: 4,
    events: [
      {
        eventType: "Blockbuster2018",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "Blockbuster2018Phase1",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    seasonNumber: 8,
    events: [
      {
        eventType: "EventFlag.Spring2019",
        activeUntil: "9999-01-01T00:00:00.000Z",
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.Spring2019.Phase1",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTM_Ashton",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTM_Goose",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTM_HighStakes",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTE_BootyBay",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.Spring2019.Phase2",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    seasonNumber: 10,
    events: [
      {
        eventType: "EventFlag.Mayday",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.Season10.Phase2",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.Season10.Phase3",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTE_BlackMonday",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.S10_Oak",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.S10_Mystery",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    seasonNumber: 11,
    events: [
      {
        eventType: "Winterfest.Tree",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "LTE_WinterFest",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "LTE_WinterFest2019",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
  {
    seasonNumber: 12,
    events: [
      {
        eventType: "EventFlag.LTE_SpyGames",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTE_JerkyChallenges",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTE_Oro",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
      {
        eventType: "EventFlag.LTE_StormTheAgency",
        activeUntil,
        activeSince: "2020-01-01T00:00:00.000Z",
      },
    ],
  },
];
