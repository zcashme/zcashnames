import { renderOgVariant } from "../route-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return renderOgVariant("sharekit", request);
}
