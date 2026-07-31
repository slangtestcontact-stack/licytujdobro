import { describe, expect, it } from "vitest";
import { generateOneTimeHandoverCode, hashOneTimeHandoverCode, verifyOneTimeHandoverCode } from "@/lib/handover-code";

const secret = "test-secret-with-at-least-thirty-two-characters";

describe("jednorazowy kod przekazania", () => {
  it("generuje sześć cyfr", () => {
    expect(generateOneTimeHandoverCode()).toMatch(/^\d{6}$/);
  });

  it("nie zapisuje jawnego kodu i weryfikuje poprawną wartość", () => {
    const hash = hashOneTimeHandoverCode("transaction-1", "123456", secret);
    expect(hash).not.toContain("123456");
    expect(verifyOneTimeHandoverCode(hash, "transaction-1", "123456", secret)).toBe(true);
    expect(verifyOneTimeHandoverCode(hash, "transaction-1", "654321", secret)).toBe(false);
  });
});
