import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getMyParkPreferences, type ParkPreference } from "./api";
import {
  getCachedParkPreferences,
  resetParkPreferencesCache,
} from "./park-preferences-store";
vi.mock("./api", () => ({ getMyParkPreferences: vi.fn() }));
let token: string | null;
beforeEach(() => {
  token = "A";
  resetParkPreferencesCache();
  vi.mocked(getMyParkPreferences).mockReset();
  vi.stubGlobal("window", {
    localStorage: { getItem: () => token },
    addEventListener: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());
const preference = (id: number): ParkPreference => ({
  parkId: id,
  parkSlug: "yosemite",
  parkName: "Yosemite",
  parkState: "California",
  isFavorite: true,
  wantsToGo: false,
});
describe("saved park cache races", () => {
  it("discards old account responses without erasing newer requests", async () => {
    let a!: (items: ParkPreference[]) => void;
    let b!: (items: ParkPreference[]) => void;
    vi.mocked(getMyParkPreferences)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          a = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          b = resolve;
        }),
      );
    const old = getCachedParkPreferences();
    token = "B";
    const next = getCachedParkPreferences();
    a([preference(1)]);
    expect(await old).toEqual([]);
    const shared = getCachedParkPreferences();
    expect(getMyParkPreferences).toHaveBeenCalledTimes(2);
    b([preference(2)]);
    expect(await next).toEqual([preference(2)]);
    expect(await shared).toEqual([preference(2)]);
    expect(await getCachedParkPreferences()).toEqual([preference(2)]);
  });
  it("does not repopulate a cache invalidated by a preference update", async () => {
    let finish!: (items: ParkPreference[]) => void;
    vi.mocked(getMyParkPreferences).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = getCachedParkPreferences();
    resetParkPreferencesCache();
    finish([preference(1)]);
    expect(await pending).toEqual([]);
  });
});
