import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { ReserveinfoPlannedPost } from "@/lib/reserveinfo-post/types";

const TEMPLATE_PATH = path.resolve(process.cwd(), "templates/reserveinfo-post/template-image.png");
const REGULAR_FONT_PATH = path.resolve(process.cwd(), "public/fonts/consola.ttf");
const BOLD_FONT_PATH = path.resolve(process.cwd(), "public/fonts/consolab.ttf");
let fontPromise: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }>> | null = null;

export function getReserveinfoBackgroundPath(): string { return TEMPLATE_PATH; }

async function fonts() {
  fontPromise ??= Promise.all([readFile(REGULAR_FONT_PATH), readFile(BOLD_FONT_PATH)]).then(([regular, bold]) => [
    { name: "ReserveMono", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "ReserveMono", data: bold, weight: 700 as const, style: "normal" as const },
  ]);
  return fontPromise;
}

async function backgroundDataUrl(): Promise<string> {
  const buffer = await readFile(TEMPLATE_PATH);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function reserveinfoCaption(post: Pick<ReserveinfoPlannedPost, "shownStart" | "shownEnd" | "totalNames">): string {
  return "These names will receive an Early Access code to claim their name in the Zcash Name Space before open registration begins. Reserve yours: ZcashNames.com/Reserve";
}

export async function renderReserveinfoImage(post: ReserveinfoPlannedPost): Promise<Buffer> {
  const background = await backgroundDataUrl();
  const columns = Array.from({ length: 3 }, (_, column) => Array.from({ length: 10 }, (_, row) => post.names[column * 10 + row] ?? null));
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", fontFamily: "ReserveMono", color: "#111111" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={background} alt="" width="1080" height="1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 214, top: 62, fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>Last Week's Reservations</div>
      <div style={{ position: "absolute", left: 214, top: 86, fontSize: 43, fontWeight: 700, letterSpacing: -1 }}>Reserved Names</div>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} style={{ position: "absolute", left: 112 + columnIndex * 290, top: 248, width: 250, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {column.map((entry, rowIndex) => (
            <div key={entry ? `${entry.name}-${entry.reservedAt}` : `empty-${columnIndex}-${rowIndex}`} style={{ width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>
              {entry?.name ?? "..."}
            </div>
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", left: 112, top: 875, width: 856, display: "flex", justifyContent: "center", fontSize: 22, fontWeight: 700, textAlign: "center" }}>
        Showing {post.shownStart}-{post.shownEnd} of {post.totalNames}
      </div>
      <div style={{ position: "absolute", left: 740, top: 989, width: 238, display: "flex", justifyContent: "flex-end", fontSize: 20, fontWeight: 800, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
        {post.weekLabel}
      </div>
    </div>,
    { width: 1080, height: 1080, fonts: await fonts() },
  );
  return Buffer.from(await response.arrayBuffer());
}
