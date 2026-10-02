import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  getParks,
  getPark,
  getTrail,
  signin,
  getMyParkPreferences,
  getParkPreference,
  updateParkPreference,
  createReport,
} from "./api";
function browser() {
  const values = new Map([["trailcheck.auth.token", "current-token"]]);
  const removeItem = vi.fn((key: string) => values.delete(key));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem,
    },
    dispatchEvent: vi.fn(),
  });
  return { values, removeItem };
}
afterEach(() => vi.unstubAllGlobals());
describe("API regressions", () => {
  it.each([
    ["saved parks", () => getMyParkPreferences()],
    ["park preference", () => getParkPreference("yosemite")],
    [
      "preference update",
      () =>
        updateParkPreference("yosemite", {
          isFavorite: true,
          wantsToGo: false,
        }),
    ],
    [
      "report submission",
      () =>
        createReport({
          trailId: 1,
          conditionRating: 3,
          surfaceCondition: "DRY",
        }),
    ],
  ])(
    "does not clear a new account when an old %s request returns 401",
    async (_name, request) => {
      const { values, removeItem } = browser();
      let respond!: (response: Response) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          () =>
            new Promise<Response>((resolve) => {
              respond = resolve;
            }),
        ),
      );
      const pending = (request as () => Promise<unknown>)();
      values.set("trailcheck.auth.token", "new-token");
      respond(new Response("{}", { status: 401 }));
      await expect(pending).rejects.toThrow("session has expired");
      expect(removeItem).not.toHaveBeenCalled();
    },
  );
  it("normalizes states from older seeded databases for both directory and details", async () => {
    const park = {
      name: "Yellowstone",
      slug: "yellowstone",
      state: "ID, MT, WY",
      trails: [],
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify([park])))
        .mockResolvedValueOnce(new Response(JSON.stringify(park))),
    );
    expect((await getParks())[0].state).toBe("Idaho, Montana, Wyoming");
    expect((await getPark("yellowstone"))?.state).toBe(
      "Idaho, Montana, Wyoming",
    );
  });
  it("preserves a public sign-in error without expiring an existing session", async () => {
    const { removeItem } = browser();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), {
          status: 401,
        }),
      ),
    );
    await expect(
      signin({ email: "wrong@example.com", password: "incorrect" }),
    ).rejects.toThrow("Invalid credentials");
    expect(removeItem).not.toHaveBeenCalled();
  });
  it("expires the current account on a protected 401", async () => {
    const { values } = browser();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(getCurrentUser("current-token")).rejects.toThrow(
      "session has expired",
    );
    expect(values.has("trailcheck.auth.token")).toBe(false);
  });
  it("does not expire a new account when an old account request rejects", async () => {
    const { removeItem } = browser();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(getCurrentUser("old-token")).rejects.toThrow(
      "session has expired",
    );
    expect(removeItem).not.toHaveBeenCalled();
  });
  it("does not cache report-bearing trail data", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: "Trail" })),
      );
    vi.stubGlobal("fetch", fetch);
    await getTrail("1");
    expect(fetch.mock.calls[0][1]).toEqual({ cache: "no-store" });
  });
});
