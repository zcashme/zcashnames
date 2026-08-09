import { verifySvgCaptcha } from "@/lib/captcha/svg-captcha";

export const CAPTCHA_ERROR_MESSAGE = "Please complete the human check and try again.";
export const CAPTCHA_FAILED_CODE = "captcha_failed" as const;

/** Verify captcha fields from a JSON request body. */
export function verifyRequestCaptcha(
  body: {
    captcha_token?: unknown;
    captcha_answer?: unknown;
  } | null,
): boolean {
  return verifySvgCaptcha({
    token: typeof body?.captcha_token === "string" ? body.captcha_token : "",
    answer: typeof body?.captcha_answer === "string" ? body.captcha_answer : "",
  });
}
