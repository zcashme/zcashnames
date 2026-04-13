"use server";

import { redirect } from "next/navigation";
import { setCabalAccessCookie, verifyCabalPassword } from "@/lib/cabal/access";
import { sendCabalAccessNotice } from "@/lib/email/cabal-access";

export type CabalAccessState = {
  error: string;
};

export async function unlockCabal(
  _state: CabalAccessState,
  formData: FormData,
): Promise<CabalAccessState> {
  const password = String(formData.get("password") ?? "").trim();
  if (!password) return { error: "Enter your invite password." };

  const invite = await verifyCabalPassword(password);
  if (!invite) return { error: "That password was not recognized." };

  await setCabalAccessCookie(invite.id);

  try {
    await sendCabalAccessNotice({
      name: invite.displayName,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cabal-access] notice failed:", error);
  }

  redirect("/cabal");
}
