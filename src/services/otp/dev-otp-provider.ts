import type { OtpProvider } from "./types";

/** Development-only OTP stub — not a real SMS integration. */
export class DevOtpProvider implements OtpProvider {
  readonly name = "dev-mock";

  async sendPhoneOtp(_phone: string) {
    return {
      ok: false as const,
      error: "SMS OTP is not configured. Use email and password sign-in for now.",
      reason: "provider_not_configured" as const,
    };
  }

  async verifyPhoneOtp(_phone: string, _code: string) {
    return { ok: false, error: "SMS OTP is not configured." };
  }
}

export const otpProvider = new DevOtpProvider();
