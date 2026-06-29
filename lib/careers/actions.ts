"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendCareerApplicationNotice } from "@/lib/email/career-application";
import { getOpenCareerJobBySlug } from "@/lib/careers";

export type CareerApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_PHONE = 50;
const MAX_URL = 400;
const MAX_COVER_NOTE = 4000;

function buildApplicationId(slug: string): string {
  const cleanSlug = slug.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return `job_app_${cleanSlug || "role"}_${randomBytes(4).toString("hex")}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const secret = process.env.BETA_GATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

async function readClientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ip: ip || null, userAgent: userAgent || null };
}

export async function submitCareerApplication(
  jobSlug: string,
  formData: FormData,
): Promise<CareerApplicationResult> {
  const job = await getOpenCareerJobBySlug(jobSlug);
  if (!job) return { ok: false, error: "This job is no longer accepting applications." };
  if (job.applicationMode !== "native") {
    return { ok: false, error: "This role uses an external application flow." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();
  const portfolioUrl = String(formData.get("portfolio_url") ?? "").trim();
  const resumeUrl = String(formData.get("resume_url") ?? "").trim();
  const coverNote = String(formData.get("cover_note") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > MAX_NAME) return { ok: false, error: "Name is too long." };
  if (!email) return { ok: false, error: "Email is required." };
  if (email.length > MAX_EMAIL || !isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (phone.length > MAX_PHONE) return { ok: false, error: "Phone number is too long." };

  for (const [label, value] of [
    ["LinkedIn URL", linkedinUrl],
    ["Portfolio URL", portfolioUrl],
    ["Resume URL", resumeUrl],
  ] as const) {
    if (value.length > MAX_URL) return { ok: false, error: `${label} is too long.` };
    if (!isValidOptionalUrl(value)) return { ok: false, error: `${label} must be a valid http(s) URL.` };
  }

  if (!coverNote) return { ok: false, error: "Tell us why you are a fit for this role." };
  if (coverNote.length > MAX_COVER_NOTE) return { ok: false, error: "Cover note is too long." };

  const screeningAnswers = [];
  for (const question of job.screeningQuestions) {
    const answer = String(formData.get(`screening_${question.id}`) ?? "").trim();
    if (question.required && !answer) {
      return { ok: false, error: `Please answer: ${question.prompt}` };
    }
    if (question.maxLength && answer.length > question.maxLength) {
      return { ok: false, error: `Your answer for "${question.prompt}" is too long.` };
    }
    screeningAnswers.push({
      id: question.id,
      prompt: question.prompt,
      answer,
    });
  }

  const submittedAt = new Date().toISOString();
  const applicationId = buildApplicationId(job.slug);
  const { ip, userAgent } = await readClientMeta();

  try {
    const { error } = await db.from("job_applications").insert({
      id: applicationId,
      job_slug: job.slug,
      job_title: job.title,
      status: "new",
      submitted_at: submittedAt,
      name,
      email,
      phone: phone || null,
      linkedin_url: linkedinUrl || null,
      portfolio_url: portfolioUrl || null,
      resume_url: resumeUrl || null,
      cover_note: coverNote,
      screening_answers: screeningAnswers,
      ip_hash: hashIp(ip),
      user_agent: userAgent,
    });

    if (error) {
      console.error("[careers] application insert failed:", error);
      return { ok: false, error: "Couldn't save your application. Try again." };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Couldn't save your application. Try again." };
  }

  try {
    await sendCareerApplicationNotice({
      applicationId,
      submittedAt,
      job,
      applicant: {
        name,
        email,
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
        resumeUrl: resumeUrl || null,
        coverNote,
        screeningAnswers,
      },
    });
  } catch (error) {
    console.error("[careers] application notice failed:", error);
  }

  return { ok: true };
}
