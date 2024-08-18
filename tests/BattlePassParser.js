const datafile = require("./BattlePass.json");
const fs = require("fs");
const path = require("path");

const Data = [];

const templateMappings = {
  season16_: "ChallengeBundleSchedule",
  eid: "AthenaDance",
  emoji: "AthenaDance",
  spid: "AthenaDance",
  toy: "AthenaDance",
  vtid: "CosmeticVariantToken",
  mtxgiveaway: "Currency",
  athenaseasonalxp: "AccountResource",
  glider: "AthenaGlider",
  cid: "AthenaCharacter",
  athenaseason: "Token",
  athenanextseason: "Token",
  wrap: "AthenaItemWrap",
  pickaxe: "AthenaPickaxe",
  lsid: "AthenaLoadingScreen",
  trails: "AthenaSkyDiveContrail",
  musicpack: "AthenaMusicPack",
  bid: "AthenaBackpack",
  petcarrier: "AthenaBackpack",
  brs16: "HomebaseBannerIcon",
  quest_: "Quest",
  iatid: "ItemAccessToken",
  athena_s16: "Token",
  season9_: "ChallengeBundleSchedule",
};

datafile.forEach((levelData, index) => {
  const rewards = levelData.Rewards.map((reward) => {
    let TemplateId = "";

    if (reward.TemplateId !== "") {
      TemplateId = reward.TemplateId;
    } else if (reward.ItemDefinition && reward.ItemDefinition.AssetPathName) {
      const test = reward.ItemDefinition.AssetPathName.split(".")[1].toLowerCase();
      for (const key in templateMappings) {
        if (test.includes(key)) {
          TemplateId = `${templateMappings[key]}:${test}`;
          break;
        }
      }
      if (TemplateId === "") {
        console.log(`Missing template mapping for ${test}`);
      }
    }

    return {
      templateId: TemplateId,
      quantity: reward.Quantity,
    };
  });

  rewards.forEach((reward) => {
    Data.push({
      TemplateId: reward.templateId,
      Quantity: reward.quantity,
      Level: index,
    });
  });
});

fs.writeFileSync(path.join(__dirname, "SeasonPaidRewards.json"), JSON.stringify(Data, null, 2));
