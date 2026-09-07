import { checkReservationRefund } from "@/lib/waitlist/reservation-refunds";
import { refundRoute } from "@/lib/waitlist/refund-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return refundRoute(request, "check", async (payload, progress) => (await checkReservationRefund(payload, progress)).result);
}
