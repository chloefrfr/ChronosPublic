export type CommonType =
  | "CommonUI Simple Message"
  | "CommonUI Simple Message Base"
  | "DynamicBackground"
  | "DynamicBackgroundList"
  | "Battle Royale News"
  | "Battle Royale News v2"
  | "ShopSection"
  | "Tournament Display Info"
  | "Tournaments Info"
  | "Playlist Information"
  | "FortPlaylistInfo";

interface CreativeMessage {
  _type: "CommonUI Simple Message Base";
  title: string;
  body: string;
  image: string;
  messagetype: string;
  spotlight: boolean;
}

interface Creative {
  _type: "CommonUI Simple Message";
  message: CreativeMessage;
}

type PageKeys = "lobby" | "vault";

interface DynamicBackground {
  _type: "DynamicBackground";
  stage: string;
  backgroundimage?: string;
  key: PageKeys;
}

interface DynamicBackgroundList {
  _type: "DynamicBackgroundList";
  backgrounds: DynamicBackground[];
}

interface BattleRoyaleNewsMessage {
  _type: "CommonUI Simple Message Base";
  title: string;
  body: string;
  image: string;
  messagetype: string;
  spotlight: boolean;
}

interface BattleRoyaleNews {
  _type: "Battle Royale News";
  messages: BattleRoyaleNewsMessage[];
  motds: {
    body: string;
    entryType: string;
    hidden: boolean;
    id: string;
    image: string;
    playlistId: string;
    sortingPriority: number;
    spotlight: boolean;
    tileImage: string;
    title: string;
  }[];
  platform_messages: any[];
}

interface BattleRoyaleNewsV2 {
  _type: "Battle Royale News v2";
  motds: {
    body: string;
    entryType: string;
    hidden: boolean;
    id: string;
    image: string;
    playlistId: string;
    sortingPriority: number;
    spotlight: boolean;
    tileImage: string;
    title: string;
  }[];
}

interface ShopSection {
  _type: "ShopSection";
  background: DynamicBackground;
  bSortOffersByOwnership: boolean;
  bShowIneligibleOffersIfGiftable: boolean;
  bEnableToastNotification: boolean;
  bHidden: boolean;
  bShowTimer: boolean;
  landingPriority: number;
  sectionId: string;
  sectionDisplayName: string;
  bShowIneligibleOffers: boolean;
}

interface Tournament {
  _type: "Tournament Display Info";
  loading_screen_image: string;
  title_color: string;
  background_right_color: string;
  background_text_color: string;
  tournament_display_id: string;
  highlight_color: string;
  primary_color: string;
  title_line_1: string;
  shadow_color: string;
  background_left_color: string;
  poster_fade_color: string;
  secondary_color: string;
  playlist_tile_image: string;
  base_color: string;
}

interface TournamentsInfo {
  _type: "Tournaments Info";
  tournaments: Tournament[];
}

interface FortPlaylistInfo {
  _type: "FortPlaylistInfo";
  playlist_name: string;
  hidden: boolean;
  image?: string;
  special_border: string;
  display_name?: string;
}

interface PlaylistInformation {
  _type: "Playlist Information";
  playlists: FortPlaylistInfo[];
}

export interface ContentPages {
  "jcr:isCheckedOut": boolean;
  _title: string;
  "jcr:baseVersion": string;
  _activeDate: string;
  lastModified: string;
  _locale: string;
  creative: Creative;
  dynamicbackgrounds: {
    "jcr:isCheckedOut": boolean;
    backgrounds: DynamicBackgroundList;
    _title: string;
    _noIndex: boolean;
    "jcr:baseVersion": string;
    _activeDate: string;
    lastModified: string;
    _locale: string;
  };
  battleroyalenews: {
    news: BattleRoyaleNews;
    _title: string;
    header: string;
    style: string;
    _noIndex: boolean;
    alwaysShow: boolean;
    _activeDate: string;
    lastModified: string;
    _locale: string;
    _templateName: string;
  };
  battleroyalenewsv2: {
    news: BattleRoyaleNewsV2;
    _title: string;
    _noIndex: boolean;
    alwaysShow: boolean;
    _activeDate: string;
    lastModified: string;
    _locale: string;
    _templateName: string;
  };
  shopSections: {
    sectionList: {
      sections: ShopSection[];
    };
    lastModified: string;
  };
  tournamentinformation: {
    tournament_info: TournamentsInfo;
    _title: string;
    _noIndex: boolean;
    _activeDate: string;
    lastModified: string;
    _locale: string;
  };
  playlistinformation: {
    frontend_matchmaking_header_style: string;
    _title: string;
    frontend_matchmaking_header_text: string;
    playlist_info: PlaylistInformation;
    _noIndex: boolean;
    _activeDate: string;
    lastModified: string;
    _locale: string;
  };
}
