import { describe, expect, it } from "vitest";

import { subscribeSchema } from "./subscribe-schema";

describe("subscribeSchema", () => {
  it("normalizes email to trimmed lowercase", () => {
    const result = subscribeSchema.safeParse({
      email: "  Zach@WM.EDU ",
      phone: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("zach@wm.edu");
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("treats missing and blank phone as absent", () => {
    expect(subscribeSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(
      subscribeSchema.safeParse({ email: "a@b.co", phone: "   " }).success,
    ).toBe(true);
  });

  it("accepts common campus phone formats", () => {
    for (const phone of ["(757) 221-1234", "757.221.1234", "+17572211234"]) {
      const result = subscribeSchema.safeParse({ email: "a@b.co", phone });
      expect(result.success).toBe(true);
    }
  });

  it("rejects bad email and junk phone with field-level paths", () => {
    const badEmail = subscribeSchema.safeParse({ email: "not-an-email" });
    expect(badEmail.success).toBe(false);
    if (!badEmail.success) {
      expect(badEmail.error.issues[0]?.path[0]).toBe("email");
    }

    const badPhone = subscribeSchema.safeParse({
      email: "a@b.co",
      phone: "call me maybe",
    });
    expect(badPhone.success).toBe(false);
    if (!badPhone.success) {
      expect(badPhone.error.issues[0]?.path[0]).toBe("phone");
    }
  });
});
