import { NextResponse } from "next/server";
import { Resend, type WebhookEventPayload } from "resend";
import { db } from "@/lib/db";
import {
  normalizeSuppressionEmail,
  suppressCampaignEmail,
  type CampaignSuppressionReason,
} from "@/lib/campaigns/suppression";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

type OutboundEmailWebhookEvent = Extract<
  WebhookEventPayload,
  { type: `email.${string}`; data: { to: string[]; email_id: string } }
>;

function webhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not set");
  }
  return secret;
}

function readWebhookHeaders(request: Request): {
  id: string;
  timestamp: string;
  signature: string;
} {
  const id = request.headers.get("svix-id")?.trim() ?? "";
  const timestamp = request.headers.get("svix-timestamp")?.trim() ?? "";
  const signature = request.headers.get("svix-signature")?.trim() ?? "";
  if (!id || !timestamp || !signature) {
    throw new Error("Missing webhook signature headers.");
  }
  return { id, timestamp, signature };
}

function isOutboundEmailWebhookEvent(
  event: WebhookEventPayload,
): event is OutboundEmailWebhookEvent {
  return event.type.startsWith("email.") && event.type !== "email.received";
}

function extractPrimaryEmail(event: WebhookEventPayload): string | null {
  if (!isOutboundEmailWebhookEvent(event) || event.data.to.length === 0) {
    return null;
  }
  const value = event.data.to[0]?.trim();
  return value ? normalizeSuppressionEmail(value) : null;
}

function suppressionDetails(event: WebhookEventPayload): {
  reason: CampaignSuppressionReason;
  notes: string | null;
} | null {
  if (event.type === "email.bounced") {
    return {
      reason: "hard_bounce",
      notes: event.data.bounce?.message?.trim() || "Resend reported a permanent bounce.",
    };
  }
  if (event.type === "email.complained") {
    return {
      reason: "complaint",
      notes: "Resend reported that the recipient marked the message as spam.",
    };
  }
  if (event.type === "email.suppressed") {
    return {
      reason: "provider_suppressed",
      notes: event.data.suppressed?.message?.trim() || "Resend suppressed delivery to this recipient.",
    };
  }
  return null;
}

function attemptErrorMessage(event: WebhookEventPayload): string | null {
  if (event.type === "email.bounced") {
    return event.data.bounce?.message?.trim() || "Email bounced after send.";
  }
  if (event.type === "email.complained") {
    return "Recipient marked the email as spam.";
  }
  if (event.type === "email.suppressed") {
    return event.data.suppressed?.message?.trim() || "Email was suppressed by Resend.";
  }
  return null;
}

async function insertWebhookEvent(args: {
  svixId: string;
  event: WebhookEventPayload;
  normalizedEmail: string | null;
}): Promise<boolean> {
  const existing = await db
    .from("campaign_webhook_events")
    .select("svix_id")
    .eq("svix_id", args.svixId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.svix_id) return false;

  const providerMessageId = isOutboundEmailWebhookEvent(args.event)
    ? args.event.data.email_id
    : null;

  const { error } = await db.from("campaign_webhook_events").insert({
    svix_id: args.svixId,
    event_type: args.event.type,
    provider_message_id: providerMessageId,
    email: args.normalizedEmail,
    normalized_email: args.normalizedEmail,
    payload: args.event,
    created_at: args.event.created_at,
  });
  if (error) throw new Error(error.message);
  return true;
}

async function markWebhookEventProcessed(
  svixId: string,
  processingError?: string | null,
): Promise<void> {
  const { error } = await db
    .from("campaign_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError?.trim() || null,
    })
    .eq("svix_id", svixId);
  if (error) throw new Error(error.message);
}

async function annotateAttemptByProviderMessageId(args: {
  providerMessageId: string | null;
  errorMessage: string | null;
}): Promise<void> {
  if (!args.providerMessageId || !args.errorMessage) return;

  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, recipient_snapshot_id")
    .eq("provider_message_id", args.providerMessageId);
  if (error) throw new Error(error.message);

  const attempts = (data ?? []) as Array<{
    id?: string | null;
    recipient_snapshot_id?: string | null;
  }>;
  const attemptIds = attempts
    .map((attempt) => (attempt.id ? String(attempt.id) : null))
    .filter((value): value is string => Boolean(value));
  const snapshotIds = attempts
    .map((attempt) =>
      attempt.recipient_snapshot_id ? String(attempt.recipient_snapshot_id) : null,
    )
    .filter((value): value is string => Boolean(value));

  if (attemptIds.length > 0) {
    const { error: updateAttemptsError } = await db
      .from("campaign_send_attempts")
      .update({ error: args.errorMessage })
      .in("id", attemptIds);
    if (updateAttemptsError) throw new Error(updateAttemptsError.message);
  }

  if (snapshotIds.length > 0) {
    const { error: updateSnapshotsError } = await db
      .from("campaign_recipient_snapshots")
      .update({ last_error: args.errorMessage })
      .in("id", snapshotIds);
    if (updateSnapshotsError) throw new Error(updateSnapshotsError.message);
  }
}

export async function POST(request: Request) {
  let svixId = "";

  try {
    const payload = await request.text();
    const headers = readWebhookHeaders(request);
    svixId = headers.id;
    const event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: webhookSecret(),
    });

    const normalizedEmail = extractPrimaryEmail(event);
    const inserted = await insertWebhookEvent({
      svixId,
      event,
      normalizedEmail,
    });
    if (!inserted) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const suppression = suppressionDetails(event);
    if (suppression && normalizedEmail) {
      await suppressCampaignEmail({
        email: normalizedEmail,
        reason: suppression.reason,
        source: "resend_webhook",
        notes: suppression.notes,
      });
    }

    const providerMessageId = isOutboundEmailWebhookEvent(event)
      ? event.data.email_id
      : null;
    await annotateAttemptByProviderMessageId({
      providerMessageId,
      errorMessage: attemptErrorMessage(event),
    });

    await markWebhookEventProcessed(svixId, null);
    return NextResponse.json({ ok: true, eventType: event.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (svixId) {
      await markWebhookEventProcessed(svixId, message).catch(() => undefined);
    }
    const status =
      message.includes("signature") || message.includes("Missing webhook signature")
        ? 400
        : message.includes("RESEND_WEBHOOK_SECRET")
          ? 503
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
