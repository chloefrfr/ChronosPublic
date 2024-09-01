export type Abilities = "READ" | "DELETE" | "LIST" | "CREATE" | "*";
export type AbilitiesCombination =
  | "READ,UPDATE"
  | "READ,DELETE"
  | "UPDATE,DELETE"
  | "READ,UPDATE,DELETE";
export type GrantType = "client_credentials" | "authorization_code" | "refresh_token";

export interface Permission {
  resource: string;
  abilities: Abilities | AbilitiesCombination;
  action: number;
}
