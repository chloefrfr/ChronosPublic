[![Maintained with Bun](https://img.shields.io/badge/maintained%20with-bun-ac98ff.svg?style=for-the-badge&logo=bun)](https://bun.sh/)![Size](https://img.shields.io/github/repo-size/chloefrfr/ChronosPrivate?label=Size&style=for-the-badge)

![Banner](https://cdn2.unrealengine.com/13br-galaxycup-newsheader-1900x600-1900x600-482668392.jpg)

**Universal Fortnite Backend written in TypeScript using Postgres powered by TypeORM**

## Supported MCP Operations

`QueryProfile` `BulkEquipBattleRoyaleCustomization` `ClaimMfaEnabled` `PurchaseCatalogEntry` `MarkItemSeen` `RefundMtxPurchase` `RemoveGiftBox` `SetBattleRoyaleBanner` `SetCosmeticLockerSlot` `SetMtxPlatform` `EquipBattleRoyaleCustomization` `SetItemFavoriteStatusBatch` `GiftCatalogEntry` `ClientQuestLogin` `MarkNewQuestNotificationSent`

## Requirements

- [Bun](https://bun.sh)
- [Git](https://git-scm.com/downloads)
- [Postgres](https://www.postgresql.org/download/)

## Installation

1. **Clone the repository:**

```bash
git clone https://github.com/chloefrfr/ChronosPublic
```

2. **Install packages**

```bash
bun install
```

3. **Configure environment variables:**

Rename `.example.env` to `.env` and provide the necessary information.

4. **Configure hosting:**

To set up your game server and choose regional IP addresses for matchmaking, go to `hosting/hostOptions.ts`.

5. **Run**

```bash
bun run src/index.ts
```

## What's Next?

- Save the World (Will never be finished)
- TCP XMPP

# Available Quests

- **Season 7:** Daily & Week 1 Quests
- **Season 8:** Daily & Week 1 Quests
- **Season 9:** Daily & Week 1 Quests
- **Season 13:** Daily & Week 1 Quests

## Planned Features

- [x] Vbucks on kill/win
- [x] Easy setup
- [x] Auto shop
- [x] Battle Pass
- [x] XP & Leveling
- [x] Challenges
- [x] Friends
- [x] XMPP
- [x] Matchmaker
- [x] Party V1
- [x] Party V2
- [x] Daily rewards
- [x] Gifting
- [x] Purchasing from item shop
- [x] HWID Bans
- [x] Refunding
- [ ] Save the World
- [x] Arena
- [x] ClientSettings
- [x] GameSessions
- [x] Authentication using Permissions (eg... `fortnite:profile:abcd1234:commands`)
- [x] Leaderboards (Stats)

## Maybe Features?

- [ ] IP Bans
- [ ] Seasonal Rewards
- [ ] Tournaments

## Planned Bot Commands

- [x] Vbucks command
- [x] Stats command
- [ ] Arena leaderboard command
- [ ] Tournament leaderboard command
- [x] Player count command
- [x] User lookup command
