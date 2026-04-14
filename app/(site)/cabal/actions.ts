"use server";

import { redirect } from "next/navigation";
import { readCurrentCabalInvite, setCabalAccessCookie, verifyCabalPassword } from "@/lib/cabal/access";
import { db } from "@/lib/db";
import { sendCabalAccessNotice } from "@/lib/email/cabal-access";
import { sendCabalChatNotice, sendCabalInterestNotice } from "@/lib/email/cabal-chat";

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

export async function submitCabalInterest(
  name: string,
  preferredContact: string,
  note: string,
  slideNumber: string,
  slideTitle: string,
  deckTitle: string,
): Promise<CabalChatState> {
  const currentInvite = await readCurrentCabalInvite();
  if (!currentInvite) return { status: "error", error: "Cabal access required." };

  if (!preferredContact.trim()) return { status: "error", error: "Preferred contact is required." };
  if (!slideNumber || !slideTitle) return { status: "error", error: "Slide context is required." };

  try {
    await sendCabalInterestNotice({
      name,
      accessName: currentInvite.displayName,
      preferredContact: preferredContact.trim(),
      note,
      slideNumber,
      slideTitle,
      deckTitle,
      submittedAt: new Date().toISOString(),
    });

    const { error: updateError } = await db
      .from("cabal_invites")
      .update({ join_us_submitted_at: new Date().toISOString() })
      .eq("id", currentInvite.id);

    if (updateError) {
      console.error("[cabal-interest] failed to update invite join_us_submitted_at:", updateError);
    }

    return { status: "sent" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send interest.";
    console.error("[cabal-interest] failed:", error);
    return { status: "error", error: msg };
  }
}
