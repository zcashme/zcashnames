import "server-only";

import type { CareerJob } from "@/lib/careers";
import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

interface CareerApplicationNotice {
  applicationId: string;
  submittedAt: string;
  job: CareerJob;
  applicant: {
    name: string;
    email: string;
    phone: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    resumeUrl: string | null;
    coverNote: string;
    screeningAnswers: Array<{
      id: string;
      prompt: string;
      answer: string;
    }>;
  };
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

export async function sendCareerApplicationNotice(
  notice: CareerApplicationNotice,
): Promise<void> {
  const answers = notice.applicant.screeningAnswers.length > 0
    ? notice.applicant.screeningAnswers
      .map((answer) => `${answer.prompt}\n${answer.answer || "(no answer provided)"}`)
      .join("\n\n")
    : "(none)";

  const body = [
    `New job application: ${notice.job.title}`,
    "",
    `Application id: ${notice.applicationId}`,
    `Submitted:      ${notice.submittedAt}`,
    `Job title:      ${notice.job.title}`,
    `Team:           ${notice.job.team}`,
    `Job URL:        ${notice.job.jobUrl}`,
    `Apply URL:      ${notice.job.applicationUrl}`,
    "",
    `Applicant:      ${notice.applicant.name}`,
    `Email:          ${notice.applicant.email}`,
    row("Phone", notice.applicant.phone).trimEnd(),
    row("LinkedIn", notice.applicant.linkedinUrl).trimEnd(),
    row("Portfolio", notice.applicant.portfolioUrl).trimEnd(),
    row("Resume", notice.applicant.resumeUrl).trimEnd(),
    "",
    "Cover note:",
    notice.applicant.coverNote,
    "",
    "Screening answers:",
    answers,
    "",
    "-",
    "Open the job_applications table in Supabase to review this candidate.",
  ].join("\n");

  await sendEmail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `New application: ${notice.job.title} - ${notice.applicant.name}`,
    text: body,
  });
}
