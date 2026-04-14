"use server";

import { redirect } from "next/navigation";
import { readCurrentCabalInvite, setCabalAccessCookie, verifyCabalPassword } from "@/lib/cabal/access";
import { sendCabalAccessNotice } from "@/lib/email/cabal-access";
import { sendCabalChatNotice } from "@/lib/email/cabal-chat";

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

export type CabalChatState = {
  status: "idle" | "sent" | "error";
  error?: string;
};

export async function submitCabalChat(
  name: string,
  message: string,
  slideNumber: string,
  slideTitle: string,
  deckTitle: string,
): Promise<CabalChatState> {
  const currentInvite = await readCurrentCabalInvite();
  if (!currentInvite) return { status: "error", error: "Cabal access required." };

  if (!message.trim()) return { status: "error", error: "Message is required." };
  if (!slideNumber || !slideTitle) return { status: "error", error: "Slide context is required." };

  try {
    await sendCabalChatNotice({
      name,
      accessName: currentInvite.displayName,
      message,
      slideNumber,
      slideTitle,
      deckTitle,
      submittedAt: new Date().toISOString(),
    });
    return { status: "sent" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send message.";
    console.error("[cabal-chat] failed:", error);
    return { status: "error", error: msg };
  }
}
