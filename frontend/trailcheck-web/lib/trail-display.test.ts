import { describe, expect, it } from "vitest";
import { getTrailRisk } from "./trail-display";
import type { Hazard, TrailDetail } from "./api";
const hazard = (severity: string, isActive = true): Hazard => ({
  id: 1,
  type: "WEATHER",
  severity,
  isActive,
  title: "Hazard",
  reportedAt: "",
});
const trail: TrailDetail = { id: 1, name: "Trail" };
describe("trail risk availability", () => {
  it("does not imply low risk from missing or empty data", () => {
    expect(getTrailRisk(trail)).toBe("UNKNOWN");
    expect(
      getTrailRisk({
        ...trail,
        hazards: [hazard("LOW")],
        dataAvailability: {
          hazards: false,
          reports: false,
          alerts: false,
          weather: false,
        },
      }),
    ).toBe("UNKNOWN");
  });
  it("uses the highest active severity and ignores inactive hazards", () => {
    expect(
      getTrailRisk({
        ...trail,
        hazards: [hazard("LOW"), hazard("MEDIUM"), hazard("HIGH", false)],
      }),
    ).toBe("MODERATE");
    expect(
      getTrailRisk({ ...trail, hazards: [hazard("HIGH"), hazard("EXTREME")] }),
    ).toBe("EXTREME");
  });
});
