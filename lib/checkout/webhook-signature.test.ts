import Stripe from "stripe";
import { describe, expect, it } from "vitest";

// Signature verification is over the exact bytes Stripe sent. The route reads
// await request.text() before anything parses the body; these cases pin why --
// a JSON round-trip re-serializes and the signature stops matching, which is the
// failure PLAN.md P3 calls out. No network and no live keys: constructEventAsync
// and generateTestHeaderString are both local crypto.

const SECRET = "whsec_test_secret_for_local_verification";

// Webhook construction never calls the API, so the key only has to parse.
const stripe = new Stripe("sk_test_placeholder_never_used_for_requests");

const payload = JSON.stringify({
  id: "evt_test_signature",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", object: "checkout.session" } },
});

function sign(body: string): string {
  return stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET });
}

describe("webhook signature verification", () => {
  it("accepts the exact bytes that were signed", async () => {
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      sign(payload),
      SECRET,
    );
    expect(event.id).toBe("evt_test_signature");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a body that was parsed and re-serialized", async () => {
    // What reading the body as JSON first would hand the verifier: same data,
    // different bytes.
    const reserialized = JSON.stringify(JSON.parse(payload), null, 2);
    expect(reserialized).not.toBe(payload);

    await expect(
      stripe.webhooks.constructEventAsync(reserialized, sign(payload), SECRET),
    ).rejects.toThrow();
  });

  it("rejects a tampered payload", async () => {
    const signature = sign(payload);
    const tampered = payload.replace("cs_test_1", "cs_test_attacker");

    await expect(
      stripe.webhooks.constructEventAsync(tampered, signature, SECRET),
    ).rejects.toThrow();
  });

  it("rejects a signature made with a different secret", async () => {
    const foreign = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_some_other_endpoint",
    });

    await expect(
      stripe.webhooks.constructEventAsync(payload, foreign, SECRET),
    ).rejects.toThrow();
  });
});
