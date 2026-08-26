import "server-only";

import NoirReservationRebateEmail from "@/components/emails/NoirReservationRebateEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

export const NOIR_REBATE_EMAIL = "support@zknoir.com";

export type NoirReservationRebateNotice = {
  unifiedAddress: string;
  reservedName: string;
  txid: string;
  waitlistRowId: string;
  ccEmail?: string | null;
};

export async function sendNoirReservationRebateEmail(
  notice: NoirReservationRebateNotice,
): Promise<void> {
  const reservedName = notice.reservedName.trim() || "Unknown name";
  const unifiedAddress = notice.unifiedAddress.trim();
  const txid = notice.txid.trim();
  const waitlistRowId = notice.waitlistRowId.trim();
  const ccEmail = notice.ccEmail?.trim() || null;

  const result = await sendEmail({
    from: FROM_EMAIL,
    to: NOIR_REBATE_EMAIL,
    ...(ccEmail ? { cc: [ccEmail] } : {}),
    subject: `Noir reservation rebate: ${reservedName}`,
    react: NoirReservationRebateEmail({
      reservedName,
      unifiedAddress,
      txid,
      waitlistRowId,
    }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
