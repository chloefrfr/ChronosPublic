export interface JSONResponse {
  id: string;
  name: string;
  description: string;
  type: CosmeticType;
  rarity: CosmeticRarity;
  series: CosmeticSeries;
  set: CosmeticSet;
  backpack: JSONResponse;
  introduction: CosmeticIntroduction;
  images: CosmeticImages;
  itemPreviewHeroPath: string;
  displayAssetPath: string | null;
  NewDisplayAssetPath: string;
  definitionPath: string | null;
  path: string;
  added: string;
  shopHistory: string[] | null;
}

interface BackpackDef extends JSONResponse {}

export interface CosmeticType {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface CosmeticRarity {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface CosmeticSeries {
  value: string;
  image: string | null;
  colors: string[];
  backendValue: string;
}

export interface CosmeticSet {
  value: string;
  text: string;
  backendValue: string;
}

export interface CosmeticIntroduction {
  chapter: string;
  season: string;
  text: string;
  backendValue: number;
}

export interface CosmeticImages {
  smallIcon: string;
  icon: string;
  featured: string | null;
  lego: string | null;
  other: string | null;
}
