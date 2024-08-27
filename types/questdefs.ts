import type { Objectives } from "../src/utilities/managers/QuestManager";

export interface QuestItem {
  templateId: string;
  attributes: {
    [key: string]: any;
    ObjectiveState: Objectives[];
  };
}
