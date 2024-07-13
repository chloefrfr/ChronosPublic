const quests = [
  {
    Quest_S13_Repeatable_LandNamedLoc: {
      quantity: 1,
      attributes: {
        ObjectiveState: [{ Name: "completion_Quest_S13_Repeatable_LandNamedLoc", Value: 0 }],
        sent_new_notification: false,
      },
      templateId: "Quest:Quest_S13_Repeatable_LandNamedLoc",
    },
  },
  {
    Quest_S13_Repeatable_CatchFish: {
      quantity: 1,
      attributes: {
        ObjectiveState: [{ Name: "completion_Quest_S13_Repeatable_CatchFish", Value: 0 }],
        sent_new_notification: false,
      },
      templateId: "Quest:Quest_S13_Repeatable_CatchFish",
    },
  },
  {
    Quest_S13_Repeatable_Elim_Explosive: {
      quantity: 1,
      attributes: {
        ObjectiveState: [{ Name: "completion_Quest_S13_Repeatable_Elim_Explosive", Value: 0 }],
        sent_new_notification: false,
      },
      templateId: "Quest:Quest_S13_Repeatable_Elim_Explosive",
    },
  },
  {
    Quest_S13_Repeatable_Use_BandageMedkit: {
      quantity: 1,
      attributes: {
        ObjectiveState: [{ Name: "completion_Quest_S13_Repeatable_Use_BandageMedkit", Value: 0 }],
        sent_new_notification: false,
      },
      templateId: "Quest:Quest_S13_Repeatable_Use_BandageMedkit",
    },
  },
  {
    Quest_S13_Repeatable_UpgradeWeapon: {
      quantity: 1,
      attributes: {
        ObjectiveState: [{ Name: "completion_Quest_S13_Repeatable_UpgradeWeapon", Value: 0 }],
        sent_new_notification: false,
      },
      templateId: "Quest:Quest_S13_Repeatable_UpgradeWeapon",
    },
  },
];

const questData = quests.find((quest) => {
  const questTemplateId = Object.values(quest)[0]?.templateId;
  console.log(questTemplateId);
  return questTemplateId.replace("Quest:", "") === "Quest_S13_Repeatable_UpgradeWeapon";
});

console.log(questData);
