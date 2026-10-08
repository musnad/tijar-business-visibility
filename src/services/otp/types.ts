export type OtpSendResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string; reason: "provider_not_configured" | "invalid_phone" | "unknown" };

export interface OtpProvider {
  readonly name: string;
  sendPhoneOtp(phone: string): Promise<OtpSendResult>;
  verifyPhoneOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }>;
}
