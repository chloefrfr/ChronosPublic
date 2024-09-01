const fs = require("fs").promises;
const path = require("path");

let SoIDontLoseMyMind = "QuestBundle_S6_Cumulative";

const QuestBundle = require(`./bundles/${SoIDontLoseMyMind}.json`);
const SingleQuest = require("./singlequest.json");

(async () => {
  const fullQuests = [];
  const rewards = [];
  const response = [];

  let isBattlepassRequired = true;
  let hasExtra = false;

  SingleQuest.forEach((single) => {
    const { Properties } = single;
    const { Objectives, Rewards, HiddenRewards } = Properties;

    if (Rewards) {
      Rewards.forEach((reward) => {
        rewards.push({
          TemplateId: `${reward.ItemPrimaryAssetId.PrimaryAssetType.Name}:${reward.ItemPrimaryAssetId.PrimaryAssetName}`,
          Quantity: reward.Quantity,
        });
      });
    }

    if (HiddenRewards) {
      HiddenRewards.forEach((rewards) => {
        if (rewards.TemplateId.includes("Quest")) {
          fullQuests.push({
            TemplateId: rewards.TemplateId,
            Quantity: rewards.Quantity,
          });
        }

        rewards.push({
          TemplateId: rewards.TemplateId,
          Quantity: rewards.Quantity,
        });
      });
    }

    const objectives = Objectives.map((obj) => ({
      BackendName: obj.BackendName,
      Count: obj.Count,
      Stage: obj.Stage,
    }));

    const options = {
      bRequiresVIP: isBattlepassRequired,
      hasExtra,
    };

    const AllRewards = {
      Quests: fullQuests,
      Rewards: rewards,
    };

    response.push({
      TemplateId: `Quest:${single.Name}`,
      Options: options,
      Rewards: rewards,
      Objectives: objectives,
    });
  });

  QuestBundle.Objects = QuestBundle.Objects.concat(response);

  try {
    await fs.writeFile(
      path.join(__dirname, "bundles", `${SoIDontLoseMyMind}.json`),
      JSON.stringify(QuestBundle, null, 2),
    );
  } catch (err) {
    console.error(err);
  }
})();
