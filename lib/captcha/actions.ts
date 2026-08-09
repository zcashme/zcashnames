"use server";

import {
  createSvgCaptchaChallenge,
  type SvgCaptchaChallenge,
} from "@/lib/captcha/svg-captcha";

/** Issue a short-lived SVG captcha challenge for client forms. */
export async function getSvgCaptchaChallenge(): Promise<SvgCaptchaChallenge> {
  return createSvgCaptchaChallenge();
}
