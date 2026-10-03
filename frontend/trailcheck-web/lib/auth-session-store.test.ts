import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./api";
import {
  resolveAuthSession,
  resetAuthSessionCache,
} from "./auth-session-store";
vi.mock("./api", () => ({ getCurrentUser: vi.fn() }));
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  resetAuthSessionCache();
  vi.mocked(getCurrentUser).mockReset();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    dispatchEvent: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("account session races", () => {
  it("does not restore the token after logout", async () => {
    values.set("trailcheck.auth.token", "A");
    let finish!: (user: { id: number; email: string }) => void;
    vi.mocked(getCurrentUser).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const request = resolveAuthSession();
    values.clear();
    await resolveAuthSession();
    finish({ id: 1, email: "a@example.com" });
    const result = await request;
    expect(result.token).toBeNull();
    expect(values.has("trailcheck.auth.token")).toBe(false);
  });
  it("does not apply an old user after an account switch", async () => {
    values.set("trailcheck.auth.token", "A");
    let finish!: (user: { id: number; email: string }) => void;
    vi.mocked(getCurrentUser)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce({ id: 2, email: "b@example.com" });
    const a = resolveAuthSession();
    values.set("trailcheck.auth.token", "B");
    await resolveAuthSession();
    finish({ id: 1, email: "a@example.com" });
    await a;
    expect(values.get("trailcheck.auth.token")).toBe("B");
    expect(JSON.parse(values.get("trailcheck.auth.user")!).id).toBe(2);
  });
  it("preserves the account during a temporary network failure", async () => {
    values.set("trailcheck.auth.token", "A");
    values.set(
      "trailcheck.auth.user",
      JSON.stringify({ id: 1, email: "a@example.com" }),
    );
    vi.mocked(getCurrentUser).mockRejectedValue(
      new TypeError("Network unavailable"),
    );
    expect((await resolveAuthSession()).user?.id).toBe(1);
    expect(values.get("trailcheck.auth.token")).toBe("A");
  });
});
