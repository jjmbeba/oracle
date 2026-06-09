export type RegionKind = "country" | "country-group" | "continent";

export type CountryId = `country:${Lowercase<string>}`;
export type CountryGroupId = `group:${string}`;
export type ContinentId = `continent:${string}`;
export type RegionId = CountryId | CountryGroupId | ContinentId;

export type Country = {
  readonly id: CountryId;
  readonly kind: "country";
  readonly alpha2: Uppercase<string>;
  readonly displayName: string;
};

export type CountryGroup = {
  readonly id: CountryGroupId;
  readonly kind: "country-group";
  readonly displayName: string;
  readonly memberCountryIds: readonly CountryId[];
};

export type Continent = {
  readonly id: ContinentId;
  readonly kind: "continent";
  readonly displayName: string;
  readonly memberCountryIds: readonly CountryId[];
};

export type Region = Country | CountryGroup | Continent;
