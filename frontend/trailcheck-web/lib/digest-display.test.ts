import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RiskBadge from "@/components/risk-badge";
import SafetyDigest from "@/components/safety-digest";
import type { ParkDigest } from "@/lib/api";
import {
  getDigestRiskLevel,
  getGenerationSourceLabel,
} from "@/lib/digest-display";
import { passwordMeetsPolicy } from "@/lib/password-policy";

function digest(overrides: Partial<ParkDigest> = {}): ParkDigest {
  return {
    parkSlug: "yosemite",
    shortSummary: "Heat is the main concern on exposed trails.",
    notification: "Dangerous heat this afternoon.",
    generationSource: "fallback",
    generationError: null,
    hazards: [
      {
        id: "heat-1",
        title: "Dangerous heat",
        severity: "moderate",
        source: "nws",
        summary: "Exposed trails are hot.",
        evidence: [],
        tags: [],
      },
    ],
    alerts: [],
    weather: null,
    ...overrides,
  };
}

describe("digest display", () => {
  it("does not present a seasonal assessment as live low risk when both feeds failed", () => {
    const sample = digest({
      hazardAssessment: { riskLevel: "low" },
      dataAvailability: { alerts: false, weather: false },
    });
    expect(getDigestRiskLevel(sample)).toBe("UNKNOWN");
    const html = renderToStaticMarkup(
      createElement(SafetyDigest, { digest: sample }),
    );
    expect(html).toContain("Seasonal planning context");
    expect(html).toContain("Live conditions are unavailable");
    expect(html).not.toContain("Risk low");
  });
  it("shows unknown risk when condition data is absent", () => {
    expect(getDigestRiskLevel(null)).toBe("UNKNOWN");
    expect(getDigestRiskLevel(digest({ hazards: [] }))).toBe("UNKNOWN");
  });
  it("uses the highest hazard severity when no assessment is present", () => {
    const sample = digest();
    sample.hazards.push({
      ...sample.hazards[0],
      id: "danger",
      severity: "high",
    });
    expect(getDigestRiskLevel(sample)).toBe("high");
  });
  it("prefers the rules-engine risk over the first hazard severity", () => {
    expect(
      getDigestRiskLevel(
        digest({
          hazardAssessment: { riskLevel: "high" },
        }),
      ),
    ).toBe("high");
  });

  it("prefers structured model output when that path produced the digest", () => {
    expect(
      getDigestRiskLevel(
        digest({
          generationSource: "local",
          hazardAssessment: { riskLevel: "high" },
          structuredOutput: {
            riskLevel: "EXTREME",
            hazards: [],
            alerts: [],
            notification: "Extreme heat.",
            recommendedAction: "Postpone the hike.",
          },
        }),
      ),
    ).toBe("EXTREME");
  });

  it("names each generation path", () => {
    expect(getGenerationSourceLabel("local")).toBe("Local model");
    expect(getGenerationSourceLabel("deepseek")).toBe("DeepSeek");
    expect(getGenerationSourceLabel("fallback")).toBe("Rules");
    expect(getGenerationSourceLabel(undefined)).toBe("Unavailable");
  });
});

describe("SafetyDigest", () => {
  it("shows the rules risk and source when no model output is present", () => {
    const html = renderToStaticMarkup(
      createElement(SafetyDigest, {
        parkName: "Yosemite",
        digest: digest({ hazardAssessment: { riskLevel: "high" } }),
      }),
    );

    expect(html).toContain("Risk high");
    expect(html).toContain("Rules");
    expect(html).toContain("Dangerous heat this afternoon.");
  });

  it("says the digest is unavailable instead of inventing a fallback source", () => {
    const html = renderToStaticMarkup(
      createElement(SafetyDigest, { digest: null, parkName: "Yosemite" }),
    );

    expect(html).toContain("Unavailable");
    expect(html).toContain("Risk unknown");
    expect(html).not.toContain("Risk low");
    expect(html).not.toContain("No active NPS alerts");
    expect(html).not.toContain(">Fallback<");
  });
});

describe("RiskBadge", () => {
  it("renders a normalized risk label", () => {
    const html = renderToStaticMarkup(
      createElement(RiskBadge, { level: "moderate" }),
    );
    expect(html).toContain("Risk moderate");
  });
});

describe("password policy", () => {
  it("requires the same complexity the signup form enforces", () => {
    expect(passwordMeetsPolicy("short")).toBe(false);
    expect(passwordMeetsPolicy("alllowercase12!")).toBe(false);
    expect(passwordMeetsPolicy("TrailCheck-2026")).toBe(true);
  });
});
