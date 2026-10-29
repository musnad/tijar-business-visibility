import { describe, expect, it } from "vitest";

import { getPaymentAdapterStatus, isLivePaymentConfigured } from "./adapter";

describe("payment adapter", () => {
  it("stays on order-request mode without provider secrets", () => {
    const status = getPaymentAdapterStatus();
    expect(status.ready).toBe(false);
    expect(status.checkoutMode).toBe("order_request");
    expect(isLivePaymentConfigured()).toBe(false);
    expect(status.missing.length).toBeGreaterThan(0);
  });
});
