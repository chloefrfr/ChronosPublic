export function GetDefaultEngine(): string {
  return `[OnlineSubsystemMcp.Xmpp]
bUseSSL=false
ServerAddr="ws://127.0.0.1:8314"
ServerPort=8314

[OnlineSubsystemMcp.Xmpp Prod]
bUseSSL=false

ServerAddr="ws://127.0.0.1:8314"
ServerPort=8314

[OnlineSubsystemMcp]
bUsePartySystemV2=false

[OnlineSubsystemMcp.OnlinePartySystemMcpAdapter]
bUsePartySystemV2=false

[OnlineSubsystem]
bHasVoiceEnabled=true

[Voice]
bEnabled=true

[XMPP]
bEnableWebsockets=true

[/Script/Engine.InputSettings]
+ConsoleKeys=Tilde
+ConsoleKeys=F8

[/Script/FortniteGame.FortPlayerController]
TurboBuildInterval=0.005f
TurboBuildFirstInterval=0.005f
bClientSideEditPrediction=false

[HTTP.Curl]
bAllowSeekFunction=false

[LwsWebSocket]
bDisableCertValidation=true

[ConsoleVariables]
FortMatchmakingV2.ContentBeaconFailureCancelsMatchmaking=0
Fort.ShutdownWhenContentBeaconFails=0
FortMatchmakingV2.EnableContentBeacon=0
;TODM Fix for External Game Servers (Adrenaline, FS_GS, etc)
net.AllowAsyncLoading=0

[Core.Log]
LogEngine=Verbose
LogStreaming=Verbose
LogNetDormancy=Verbose
LogNetPartialBunch=Verbose
OodleHandlerComponentLog=Verbose
LogSpectatorBeacon=Verbose
PacketHandlerLog=Verbose
LogPartyBeacon=Verbose
LogNet=Verbose
LogBeacon=Verbose
LogNetTraffic=Verbose
LogDiscordRPC=Verbose
LogEOSSDK=Verbose
LogXmpp=Verbose
LogParty=Verbose
LogParty=Verbose
LogMatchmakingServiceClient=Verbose
LogScriptCore=Verbose
LogSkinnedMeshComp=Verbose
LogFortAbility=Verbose
LogContentBeacon=Verbose
LogPhysics=Verbose
LogStreaming=Error

[/Script/Qos.QosRegionManager]
NumTestsPerRegion=1
PingTimeout=3.0
!RegionDefinitions=ClearArray
+RegionDefinitions=(DisplayName="Chronos NA", RegionId="NAE", bEnabled=true, bVisible=true, bAutoAssignable=true)
+RegionDefinitions=(DisplayName="Chronos NA Central LateGame", RegionId="NAW", bEnabled=true, bVisible=true, bAutoAssignable=true)
+RegionDefinitions=(DisplayName="Chronos NA East LateGame", RegionId="NAELG", bEnabled=true, bVisible=true, bAutoAssignable=true)
+RegionDefinitions=(DisplayName="Chronos EU", RegionId="EU", bEnabled=true, bVisible=true, bAutoAssignable=true)
+RegionDefinitions=(DisplayName="Chronos EU LateGame", RegionId="EULG", bEnabled=true, bVisible=true, bAutoAssignable=true)`;
}

export function GetDefaultGame(version: number): string {
  let def: string = `[/Script/EngineSettings.GeneralProjectSettings]
ProjectID=(A=-2011270876,B=1182903154,C=-965786730,D=-1399474123)
ProjectName=Fortnite
ProjectDisplayedTitle=NSLOCTEXT("Chronos", "FortniteMainWindowTitle", "Chronos")
ProjectVersion=1.0.0
CompanyName=Epic Games, Inc.
CompanyDistinguishedName="CN=Epic Games, O=Epic Games, L=Cary, S=North Carolina, C=US"
CopyrightNotice=Copyright Epic Games, Inc. All Rights Reserved.
bUseBorderlessWindow=True

[VoiceChatManager]
bEnabled=true
bEnableOnLoadingScreen=true
bObtainJoinTokenFromPartyService=true
bAllowStateTransitionOnLoadingScreen=false
MaxRetries=5
RetryTimeJitter=1.0
RetryTimeBase=3.0
RetryTimeMultiplier=1.0
MaxRetryDelay=240.0
RequestJoinTokenTimeout=10.0
JoinChannelTimeout=120.0
VoiceChatImplementation=Vivox
NetworkTypePollingDelay=0.0
PlayJoinSoundRecentLeaverDelaySeconds=30.0
DefaultInputVolume=1.0
DefaultOutputVolume=1.0
JoinTimeoutRecoveryMethod=Reinitialize
JoinErrorWorkaroundMethod=ResetConnection
NetworkChangeRecoveryMethod=ResetConnection
bEnableBluetoothMicrophone=false
VideoPreferredFramerate=0
bEnableEOSReservedAudioStreams=true

[VoiceChat.EOS]
bEnabled=true

ReplayStreamerOverride=FortniteDSSReplayStreamer

[/Script/FortniteGame.FortPlayspaceGameState]
bUsePlayspaceSystem=true

[/Script/FortniteGame.FortGameStateAthena]
; BR: Whether to allow the player to build through objects that would normally block placement
bAllowBuildingThroughBlockingObjects=true


[/Script/FortniteGame.FortTextHotfixConfig]
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="LoadingScreen", Key="Connecting", NativeString="CONNECTING", LocalizedStrings=(("en","CONNECTING TO Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="FortLoginStatus", Key="LoggingIn", NativeString="Logging In...", LocalizedStrings=(("ar","Logging In to Chronos..."),("en","Logging In to Chronos..."),("de","Logging In to Chronos..."),("es","Logging In to Chronos..."),("es-419","Logging In to Chronos..."),("fr","Logging In to Chronos..."),("it","Logging In to Chronos..."),("ja","Logging In to Chronos..."),("ko","Logging In to Chronos..."),("pl","Logging In to Chronos..."),("pt-BR","Logging In to Chronos..."),("ru","Logging In to Chronos..."),("tr","Logging In to Chronos..."),("zh-CN","Logging In to Chronos..."),("zh-Hant","Logging In to Chronos...")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="OnlineAccount", Key="DoQosPingTests", NativeString="Checking connection to datacenters...", LocalizedStrings=(("ar","Checking connection to Chronos..."),("en","Checking connection to Chronos..."),("de","Checking connection to Chronos..."),("es","Checking connection to Chronos..."),("es-419","Checking connection to Chronos..."),("fr","Checking connection to Chronos..."),("it","Checking connection to Chronos..."),("ja","Checking connection to Chronos..."),("ko","Checking connection to Chronos..."),("pl","Checking connection to Chronos..."),("pt-BR","Checking connection to Chronos..."),("ru","Checking connection to Chronos..."),("tr","Checking connection to Chronos..."),("zh-CN","Checking connection to Chronos..."),("zh-Hant","Checking connection to Chronos...")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="37020CCD402F073607D9D4A9561EF035", NativeString="PLAY", LocalizedStrings=(("ar","Chronos"),("en","Chronos"),("de","Chronos"),("es","Chronos"),("es-419","Chronos"),("fr","Chronos"),("it","Chronos"),("ja","Chronos"),("ko","Chronos"),("pl","Chronos"),("pt-BR","PLAY"),("ru","Chronos"),("tr","Chronos"),("zh-CN","Chronos"),("zh-Hant","Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="C8C6606D4ED4B816D4A358A42DFBDD59", NativeString="PLAY", LocalizedStrings=(("ar","Chronos"),("en","Chronos"),("de","Chronos"),("es","Chronos"),("es-419","Chronos"),("fr","Chronos"),("it","Chronos"),("ja","Chronos"),("ko","Chronos"),("pl","Chronos"),("pt-BR","PLAY"),("ru","Chronos"),("tr","Chronos"),("zh-CN","Chronos"),("zh-Hant","Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="03875FFD49212D2F37B01788C09086B5", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="1D20854C403FDD474AE7C8B929815DA2", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="1FB7052F40BE8B647B5CA5A362BE8F21", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="2E42C9FB4F551A859C05BF99F7E36FB1", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="370415344EEEA09D8C01A48F4B8148D7", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="538BD1FD46BCEFA4813E2FAFAA07E1A2", NativeString="Quit", LocalizedStrings=(("ar","Quit Chronos"),("en","Quit Chronos"),("de","Quit Chronos"),("es","Quit Chronos"),("es-419","Quit Chronos"),("fr","Quit Chronos"),("it","Quit Chronos"),("ja","Quit Chronos"),("ko","Quit Chronos"),("pl","Quit Chronos"),("pt-BR","Quit Chronos"),("ru","Quit Chronos"),("tr","Quit Chronos"),("zh-CN","Quit Chronos"),("zh-Hant","Quit Chronos")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="FortTeamMemberPedestalNameplate", Key="NotReady", NativeString="Not Ready", LocalizedStrings=(("ar","Chronos - Not Ready"),("en","Chronos - Not Ready"),("de","Chronos - Not Ready"),("es","Chronos - Not Ready"),("es-419","Chronos - Not Ready"),("fr","Chronos - Not Ready"),("it","Chronos - Not Ready"),("ja","Chronos - Not Ready"),("ko","Chronos - Not Ready"),("pl","Chronos - Not Ready"),("pt-BR","Chronos - Not Ready"),("ru","Chronos - Not Ready"),("tr","Chronos - Not Ready"),("zh-CN","Chronos - Not Ready"),("zh-Hant","Chronos - Not Ready")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="FortTeamMemberPedestalNameplate", Key="Ready", NativeString="Ready", LocalizedStrings=(("ar","Chronos - Ready"),("en","Chronos - Ready"),("de","Chronos - Ready"),("es","Chronos - Ready"),("es-419","Chronos - Ready"),("fr","Chronos - Ready"),("it","Chronos - Ready"),("ja","Chronos - Ready"),("ko","Chronos - Ready"),("pl","Chronos - Ready"),("pt-BR","Chronos - Ready"),("ru","Chronos - Ready"),("tr","Chronos - Ready"),("zh-CN","Chronos - Ready"),("zh-Hant","Chronos - Ready")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="CFE470574F97A3A74F4FEAABF1E1F20A", NativeString="No Offers Available", LocalizedStrings=(("ar", "To donate please visit donate.Chronosfn.xyz!"),("en", "To donate please visit donate.Chronosfn.xyz!"),("de", "To donate please visit donate.Chronosfn.xyz!"),("es", "To donate please visit donate.Chronosfn.xyz!"),("es-419", "To donate please visit donate.Chronosfn.xyz!"),("fr", "To donate please visit donate.Chronosfn.xyz!"),("it", "To donate please visit donate.Chronosfn.xyz!"),("ja", "To donate please visit donate.Chronosfn.xyz!"),("ko", "To donate please visit donate.Chronosfn.xyz!"),("pl", "To donate please visit donate.Chronosfn.xyz!"),("pt-BR", "To donate please visit donate.Chronosfn.xyz!"),("ru", "To donate please visit donate.Chronosfn.xyz!"),("tr", "To donate please visit donate.Chronosfn.xyz!"),("zh-CN", "To donate please visit donate.Chronosfn.xyz!"),("zh-Hant", "To donate please visit donate.Chronosfn.xyz!")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="OnlineAccount", Key="TokenExpired", NativeString="Login Expired or Logged In Elsewhere", LocalizedStrings=(("ar","Our backend has been restarted, please re-launch Fortnite."),("en","Our backend has been restarted, please re-launch Fortnite."),("de","Our backend has been restarted, please re-launch Fortnite."),("es","Our backend has been restarted, please re-launch Fortnite."),("es-419","Our backend has been restarted, please re-launch Fortnite."),("fr","Our backend has been restarted, please re-launch Fortnite."),("it","Our backend has been restarted, please re-launch Fortnite."),("ja","Our backend has been restarted, please re-launch Fortnite."),("ko","Our backend has been restarted, please re-launch Fortnite."),("pl","Our backend has been restarted, please re-launch Fortnite."),("pt-BR","Our backend has been restarted, please re-launch Fortnite."),("ru","Our backend has been restarted, please re-launch Fortnite."),("tr","Our backend has been restarted, please re-launch Fortnite."),("zh-CN","Our backend has been restarted, please re-launch Fortnite."),("zh-Hant","Our backend has been restarted, please re-launch Fortnite.")))

#+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="Fortnite.FortAthenaMatchmakingWidget", Key="Message.CanMatchmakeSolo", NativeString="PLAY", LocalizedStrings=(("ar","Play Chronos"),("en","Play Chronos"),("de","Play Chronos"),("es","Play Chronos"),("es-419","Play Chronos"),("fr","Play Chronos"),("it","Play Chronos"),("ja","Play Chronos"),("ko","Play Chronos"),("pl","Play Chronos"),("pt-BR","Play Chronos"),("ru","Play Chronos"),("tr","Play Chronos"),("zh-CN","Play Chronos"),("zh-Hant","Play Chronos")))

+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="FortOnlineAccount", Key="CreatingParty", NativeString="Creating party...", LocalizedStrings=(("en","Hello player! Welcome to Chronos")))

+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="2A1C56D243E8C4418146029BA30A18F4", NativeString="Battle Pass", LocalizedStrings=(("en","Battle Pass")))
;+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="Athena", Key="ThankedBusDriver", NativeString="<{VictimStyle}>{PlayerName}</> has thanked the bus driver", LocalizedStrings=(("en","<{VictimStyle}>{PlayerName}</> is a femboy")))

+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="AC4FAA6C4C5C334E02E1A2A2946A9ADF", NativeString="<{KillerStyle}>{Killer}</> shotgunned <{VictimStyle}>{PlayerName}</>{DistanceText}", LocalizedStrings=(("en","<{KillerStyle}>{Killer}</> dunked on <{VictimStyle}>{PlayerName}</>{DistanceText}")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="730531AF4E52BD15E2DD1CA9067E76A0", NativeString="<{KillerStyle}>{Killer}</> sniped <{VictimStyle}>{PlayerName}</>{DistanceText}", LocalizedStrings=(("en","<{KillerStyle}>{Killer}</> hit a tricky on <{VictimStyle}>{PlayerName}</>{DistanceText}")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="18ACE67C42087F5F7CCD7F82D17785F2", NativeString="A loyal companion.", LocalizedStrings=(("en","mClixy's Dog")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="36844F9344FE49CCAF0F36BA2D33524F", NativeString="Bonesy", LocalizedStrings=(("en","Cooper")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="A42476004D2157CD63B5458DD17B6642", NativeString="Assault Rifle  ", LocalizedStrings=(("en","OP Rifle")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="9F9CE7D946FCD7F813EDAEB954710716", NativeString="Season 6", LocalizedStrings=(("en","Chronos Season 1")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="PartyContext", Key="PlayingSolo", NativeString="Playing Solo", LocalizedStrings=(("en","Playing Lategame")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="NetworkErrors", Key="ReturnToMainMenuTimeout", NativeString="Ack! We lost our connection to the match. Sorry about that. Make sure your internet connection is still good and try again. If it keeps up, visit {CheckStatusURL}.", LocalizedStrings=(("en","discord.gg/Chronosmp")))

+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="PartyContext", Key="BattleRoyaleInLobby", NativeString="Battle Royale - In Lobby", LocalizedStrings=(("ar","Chronos - Lobby"),("en","Chronos - Lobby"),("de","Chronos - Lobby"),("es","Chronos - Lobby"),("es-419","Chronos - Lobby"),("fr","Chronos - Lobby"),("it","Chronos - Lobby"),("ja","Chronos - Lobby"),("ko","Chronos - Lobby"),("pl","Chronos - Lobby"),("pt-BR","Chronos - Lobby"),("ru","Chronos - Lobby"),("tr","Chronos - Lobby"),("zh-CN","Chronos - Lobby"),("zh-Hant","Chronos - Lobby")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="PartyContext", Key="BattleRoyaleInGame", NativeString="Battle Royale - {0} Remaining", LocalizedStrings=(("ar","Chronos - {0} Remaining"),("en","Chronos - {0} Remaining"),("de","Chronos - {0} Remaining"),("es","Chronos - {0} Remaining"),("es-419","Chronos - {0} Remaining"),("fr","Chronos - {0} Remaining"),("it","Chronos - {0} Remaining"),("ja","Chronos - {0} Remaining"),("ko","Chronos - {0} Remaining"),("pl","Chronos - {0} Remaining"),("pt-BR","Chronos - {0} Remaining"),("ru","Chronos - {0} Remaining"),("tr","Chronos - {0} Remaining"),("zh-CN","Chronos - {0} Remaining"),("zh-Hant","Chronos - {0} Remaining")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="NetworkConnectionLost", NativeString="Network Connection Lost", LocalizedStrings=(("en","The server most likely crashed :(")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="30C8C9204EAF7FF602BF51BA2914EF27", NativeString="EPIC PASSWORD", LocalizedStrings=(("en","PASSWORD")))
;+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="01D48B6841B636C086E7BBA829B0F432", NativeString="Solo", LocalizedStrings=(("en","LateGame Solo")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="0C08C0CB4F22661348F7F08031BEFB01", NativeString="Go it alone in a battle to be the last one standing.", LocalizedStrings=(("en","The most fast paced match in Chronos! Go in alone and be the last one standing!")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="CA2EC1714F23111FDBE6439EBC961404", NativeString="EMAIL", LocalizedStrings=(("en","EMAIL")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, Namespace="", Key="C865741A4692B9EE424EF6928A50CD08", NativeString="Declare your support for a Creator! Your in-game purchases will help support this Creator.", LocalizedStrings=(("en","Support a Chronos Creator to send 10% of the amount of your purchase to the creator!")))
+TextReplacements=(Category=Game, bIsMinimalPatch=True, bHidden=true,Namespace="", Key="B43430364CDEBF9E59C6BBAFDA2FB883", NativeString="CAREER",  LocalizedStrings=(("en","STATS")))


[/Script/FortniteGame.FortGameInstance]
KairosMinSupportedAppVersion=20
bBattleRoyaleMatchmakingEnabled=true
!FrontEndPlaylistData=ClearArray
FrontEndPlaylistData=(PlaylistName=Playlist_DefaultSolo, PlaylistAccess=(bEnabled=True, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=false, CategoryIndex=0, bDisplayAsLimitedTime=false, DisplayPriority=3))
+FrontEndPlaylistData=(PlaylistName=Playlist_DefaultDuo, PlaylistAccess=(bEnabled=True, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=false, CategoryIndex=0, bDisplayAsLimitedTime=false, DisplayPriority=4))
+FrontEndPlaylistData=(PlaylistName=Playlist_DefaultSquad, PlaylistAccess=(bEnabled=True, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=false, CategoryIndex=0, bDisplayAsLimitedTime=false, DisplayPriority=6))
+FrontEndPlaylistData=(PlaylistName=Playlist_BattleLab, PlaylistAccess=(bEnabled=False, bIsDefaultPlaylist=false, bVisibleWhenDisabled=true, bDisplayAsNew=false, CategoryIndex=1, bDisplayAsLimitedTime=false, DisplayPriority=16))

; Arena
+FrontEndPlaylistData=(PlaylistName=Playlist_ShowdownAlt_Solo, PlaylistAccess=(bEnabled=True, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=true, CategoryIndex=1, bDisplayAsLimitedTime=false, DisplayPriority=17))
+FrontEndPlaylistData=(PlaylistName=Playlist_ShowdownAlt_Duos, PlaylistAccess=(bEnabled=False, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=true, CategoryIndex=1, bDisplayAsLimitedTime=false, DisplayPriority=19))
+ExperimentalBucketPercentList=(ExperimentNum=23,Name="BattlePassPurchaseScreen",BucketPercents=(0, 50, 50))

[/Script/FortniteGame.FortPlayerPawn]
NavLocationValidityDistance=500
MoveSoundStimulusBroadcastInterval=0.5
bCharacterPartsCastIndirectShadows=true

[/Script/FortniteGame.FortOnlineAccount]
bShouldAthenaQueryRecentPlayers=false
bDisablePurchasingOnRedemptionFailure=false

[/Script/FortniteGame.FortPlayerControllerAthena]
bNoInGameMatchmaking=true

[/Script/GameFeatures.GameFeaturesSubsystemSettings]
+DisabledPlugins=DiscoveryBrowser

[VoiceChat.Vivox]
bEnabled=true
ServerUrl="https://mtu1xp-mad.vivox.com"
ServiceUrl="https://mtu1xp-mad.vivox.com"
Domain="https://unity.vivox.com/appconfig/46738-lunar-79863-udash"
Issuer="46738-lunar-79863-udash"
Key="ikvUeQAPzWGPKuAYfsiKMbLCgHIdzG2K"
SecretKey="ikvUeQAPzWGPKuAYfsiKMbLCgHIdzG2K"

[VoiceChat.EOS]
bEnabled=true

[EOSSDK]
ProductName=VoicePlugin
ProductVersion=0.1
ProductId="d3df2e4cdf384ae0a2d87faa746d9f95"
SandboxId="d4ede3c68024456a85135250c48595a1"
DeploymentId="8bf4df3e0d154871b5c71b94d2f8994d"
ClientId="xyza7891WBgblbBRIWSsYVvQLjyUSvIo"
ClientSecret="CsDH07ei7JX5nlChe3XrthvsSsn1g4huyXAPLf3hmN8"

[/Script/FortniteGame.FortChatManager]
bShouldRequestGeneralChatRooms=true
bShouldJoinGlobalChat=true
bShouldJoinFounderChat=false
bIsAthenaGlobalChatEnabled=true
RecommendChatFailureDelay=30
RecommendChatBackoffMultiplier=2.0
RecommendChatRandomWindow=120.0
RecommendChatFailureCountCap=7

[OnlinePartyEmbeddedCommunication]
bRetainPartyStateFields=false
bPerformAutoPromotion=true
InviteNotificationDelaySeconds=1.0

[/Script/Party.SocialSettings]
bMustSendPrimaryInvites=true
bLeavePartyOnDisconnect=false
bSetDesiredPrivacyOnLocalPlayerBecomesLeader=false
DefaultMaxPartySize=16`;

  if (version === 4) {
    def.replace(
      `+FrontEndPlaylistData=(PlaylistName=Playlist_BattleLab, PlaylistAccess=(bEnabled=False, bIsDefaultPlaylist=false, bVisibleWhenDisabled=true, bDisplayAsNew=false, CategoryIndex=1, bDisplayAsLimitedTime=false, DisplayPriority=16))`,
      `+FrontEndPlaylistData=(PlaylistName=Playlist_Playground, PlaylistAccess=(bEnabled=True, bIsDefaultPlaylist=true, bVisibleWhenDisabled=false, bDisplayAsNew=true, CategoryIndex=1, bDisplayAsLimitedTime=false, DisplayPriority=16))`
    );
  }

  return def;
}

export function GetDefaultRuntimeOptions(): string {
  return `[/Script/FortniteGame.FortRuntimeOptions]
bEnableGlobalChat=true
bDisableGifting=false
bDisableGiftingPC=false
bDisableGiftingPS4=false
bDisableGiftingXB=false
!ExperimentalCohortPercent=ClearArray
+ExperimentalCohortPercent=(CohortPercent=100,ExperimentNum=20)

[Vivox]
bEnabled=true
ServerUrl="https://unity.vivox.com/appconfig/46738-lunar-79863-udash"
Domain="mtu1xp.vivox.com"
MaxConnectRetries=3
MaxLoginRetries=3
MaxJoinRetries=3
MaxMuteRetries=3
; Retry delay = Rand(-RetryTimeJitter, RetryTimeJitter) + RetryTimeMultiplier * Pow(RetryTimeBase, Retry)
RetryTimeJitter=0.5
RetryTimeBase=2.0
RetryTimeMultiplier=0.5
MaxRetryDelay=30.0`;
}
