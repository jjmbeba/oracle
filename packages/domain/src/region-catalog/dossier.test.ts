import { describe, expect, it } from "vitest";
import { getRegionDossier } from "./dossier";

describe("getRegionDossier", () => {
  describe("countries", () => {
    it("returns expected facts for Kenya", () => {
      const dossier = getRegionDossier("country:ke");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country") return;

      expect(dossier.region.displayName).toBe("Kenya");
      expect(dossier.region.alpha2).toBe("KE");
      expect(dossier.overviewFacts).not.toBeNull();
      expect(dossier.overviewFacts?.capital).toBe("Nairobi");
      expect(dossier.overviewFacts?.population).toBe(54_000_000);
      expect(dossier.overviewFacts?.languages).toContain("Swahili");
      expect(dossier.overviewFacts?.languages).toContain("English");
      expect(dossier.overviewFacts?.currencies).toContain("KES");
      expect(dossier.overviewFacts?.flagEmoji).toBe("🇰🇪");
      expect(dossier.overviewFacts?.gdpPerCapita).toBe(2_200);
      expect(dossier.factSources.length).toBeGreaterThanOrEqual(1);
    });

    it("returns expected facts for Japan", () => {
      const dossier = getRegionDossier("country:jp");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country") return;

      expect(dossier.region.displayName).toBe("Japan");
      expect(dossier.overviewFacts?.capital).toBe("Tokyo");
      expect(dossier.overviewFacts?.population).toBe(124_000_000);
      expect(dossier.overviewFacts?.languages).toContain("Japanese");
      expect(dossier.overviewFacts?.flagEmoji).toBe("🇯🇵");
    });

    it("returns expected facts for Bouvet Island (sparse data)", () => {
      const dossier = getRegionDossier("country:bv");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country") return;

      expect(dossier.region.displayName).toBe("Bouvet Island");
      expect(dossier.overviewFacts?.capital).toBeNull();
      expect(dossier.overviewFacts?.population).toBeNull();
      expect(dossier.overviewFacts?.languages).toBeNull();
      expect(dossier.overviewFacts?.currencies).toBeNull();
      expect(dossier.overviewFacts?.flagEmoji).toBe("🇧🇻");
    });

    it("returns overviewFacts with sparse data for Antarctica", () => {
      const dossier = getRegionDossier("country:aq");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country") return;

      expect(dossier.overviewFacts).not.toBeNull();
    });

    it("returns null for unknown region ID", () => {
      const dossier = getRegionDossier("country:xx");
      expect(dossier).toBeNull();
    });
  });

  describe("country groups", () => {
    it("aggregates Eastern Africa facts from member countries", () => {
      const dossier = getRegionDossier("group:eastern-africa");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country-group") return;

      expect(dossier.region.displayName).toBe("Eastern Africa");
      expect(dossier.region.memberCount).toBeGreaterThan(10);
      expect(dossier.overviewFacts).not.toBeNull();
      expect(dossier.overviewFacts?.population).toBeGreaterThan(100_000_000);
      expect(dossier.overviewFacts?.languages.length).toBeGreaterThanOrEqual(5);
      expect(dossier.overviewFacts?.currencies.length).toBeGreaterThanOrEqual(3);
    });

    it("aggregates Northern Africa facts correctly", () => {
      const dossier = getRegionDossier("group:northern-africa");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country-group") return;

      expect(dossier.region.memberCount).toBe(7);
      expect(dossier.overviewFacts?.languages).toContain("Arabic");
    });

    it("includes computed centroid for Eastern Africa", () => {
      const dossier = getRegionDossier("group:eastern-africa");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "country-group") return;
      if (!dossier.overviewFacts) return;

      const { latitude, longitude } = dossier.overviewFacts;
      expect(latitude).not.toBeNull();
      expect(longitude).not.toBeNull();
      expect(latitude!).toBeGreaterThan(-15);
      expect(latitude!).toBeLessThan(15);
      expect(longitude!).toBeGreaterThan(25);
      expect(longitude!).toBeLessThan(55);
    });
  });

  describe("continents", () => {
    it("aggregates Africa continent facts", () => {
      const dossier = getRegionDossier("continent:africa");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "continent") return;

      expect(dossier.region.memberCount).toBeGreaterThan(40);
      expect(dossier.overviewFacts).not.toBeNull();
      expect(dossier.overviewFacts?.population).toBeGreaterThan(1_000_000_000);
    });

    it("aggregates Europe continent facts", () => {
      const dossier = getRegionDossier("continent:europe");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "continent") return;

      expect(dossier.region.memberCount).toBeGreaterThan(30);
      expect(dossier.overviewFacts?.currencies).toContain("EUR");
    });

    it("includes computed centroid for Africa", () => {
      const dossier = getRegionDossier("continent:africa");
      expect(dossier).not.toBeNull();
      if (!dossier || dossier.region.kind !== "continent") return;
      if (!dossier.overviewFacts) return;

      const { latitude, longitude } = dossier.overviewFacts;
      expect(latitude).not.toBeNull();
      expect(longitude).not.toBeNull();
      expect(latitude!).toBeGreaterThan(-40);
      expect(latitude!).toBeLessThan(40);
      expect(longitude!).toBeGreaterThan(-25);
      expect(longitude!).toBeLessThan(55);
    });
  });
});
