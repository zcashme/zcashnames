import "server-only";

/**
 * Waitlist captcha API — thin aliases over the shared SVG captcha module
 * so existing waitlist imports keep working.
 */
export {
  createSvgCaptchaChallenge as createWaitlistCaptcha,
  verifySvgCaptcha as verifyWaitlistCaptcha,
  type SvgCaptchaChallenge as WaitlistCaptchaChallenge,
} from "@/lib/captcha/svg-captcha";
