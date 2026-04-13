import { NextResponse } from "next/server";
import { sendCabalChatNotice } from "@/lib/email/cabal-chat";
import { readCurrentCabalInvite } from "@/lib/cabal/access";

type CabalChatRequest = {
  name?: unknown;
  message?: unknown;
  slideNumber?: unknown;
  slideTitle?: unknown;
  slideIndex?: unknown;
  deckTitle?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const currentInvite = await readCurrentCabalInvite();
  if (!currentInvite) {
    return NextResponse.json({ error: "Cabal access required." }, { status: 401 });
  }

  let payload: CabalChatRequest;

  try {
    payload = (await request.json()) as CabalChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = asString(payload.message);
  const slideNumber = asString(payload.slideNumber);
  const slideTitle = asString(payload.slideTitle);

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (!slideNumber || !slideTitle) {
    return NextResponse.json({ error: "Slide context is required." }, { status: 400 });
  }

  try {
    await sendCabalChatNotice({
      name: asString(payload.name),
      accessName: currentInvite.displayName,
      message,
      slideNumber,
      slideTitle,
      slideIndex: typeof payload.slideIndex === "number" ? payload.slideIndex : 0,
      deckTitle: asString(payload.deckTitle),
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message.";
    console.error("[cabal-chat] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
