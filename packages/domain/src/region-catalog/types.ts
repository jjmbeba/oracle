export type RegionKind = "country" | "country-group" | "continent";

export type CountryId = `country:${Lowercase<string>}`;
export type CountryGroupId = `group:${string}`;
export type ContinentId = `continent:${string}`;
export type RegionId = CountryId | CountryGroupId | ContinentId;

export type CountryBounds = {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
};

export type Country = {
  readonly id: CountryId;
  readonly kind: "country";
  readonly alpha2: Uppercase<string>;
  readonly displayName: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly bounds: CountryBounds | null;
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

export type FactSource = {
  readonly label: string;
  readonly url?: string;
};

export type CountryOverviewFacts = {
  readonly capital: string | null;
  readonly population: number | null;
  readonly languages: readonly string[] | null;
  readonly currencies: readonly string[] | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly flagEmoji: string | null;
  readonly gdpPerCapita: number | null;
  readonly populationDensity: number | null;
};

export type GroupOverviewFacts = {
  readonly population: number | null;
  readonly languages: readonly string[];
  readonly currencies: readonly string[];
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly gdpPerCapita: number | null;
  readonly populationDensity: number | null;
};
export type ContinentOverviewFacts = GroupOverviewFacts;

export type BaseDossier = {
  readonly factSources: readonly FactSource[];
};

export type CountryDossier = BaseDossier & {
  readonly region: {
    readonly kind: "country";
    readonly id: CountryId;
    readonly displayName: string;
    readonly alpha2: string;
  };
  readonly overviewFacts: CountryOverviewFacts | null;
};

export type GroupDossier = BaseDossier & {
  readonly region: {
    readonly kind: "country-group";
    readonly id: CountryGroupId;
    readonly displayName: string;
    readonly memberCount: number;
  };
  readonly overviewFacts: GroupOverviewFacts | null;
};

export type ContinentDossier = BaseDossier & {
  readonly region: {
    readonly kind: "continent";
    readonly id: ContinentId;
    readonly displayName: string;
    readonly memberCount: number;
  };
  readonly overviewFacts: ContinentOverviewFacts | null;
};

export type RegionDossier = CountryDossier | GroupDossier | ContinentDossier;
