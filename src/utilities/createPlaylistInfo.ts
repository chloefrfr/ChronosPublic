export default function (playlists: { [key: number]: object }, season: number) {
  return {
    frontend_matchmaking_header_style: "None",
    _title: "playlistinformation",
    frontend_matchmaking_header_text: "",
    playlist_info: {
      _type: "Playlist Information",
      playlists: playlists[season],
    },
    _noIndex: false,
    _activeDate: "2018-04-25T15:05:39.956Z",
    lastModified: "2019-10-29T14:05:17.030Z",
    _locale: "en-US",
  };
}
