import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PARK_CATALOG } from "./park-catalog";
import { getParkVisual, getParkVisualMap } from "./park-content";
describe("park photographs", () => {
  it("provides an existing, case-exact local image for all 63 parks", async () => {
    const visuals = await getParkVisualMap(PARK_CATALOG);
    expect(Object.keys(visuals)).toHaveLength(63);
    for (const visual of Object.values(visuals)) {
      const file = path.join(process.cwd(), "public", visual.imageUrl);
      expect(existsSync(file), file).toBe(true);
      expect(readdirSync(path.dirname(file))).toContain(path.basename(file));
    }
  });
  it("honestly labels the scenic fallback for unknown parks", async () => {
    expect((await getParkVisual("unknown", "Unknown")).imageAlt).toContain(
      "photograph of this park is unavailable",
    );
  });
});
