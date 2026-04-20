import "server-only";
import { db } from "@/lib/db";

export type IndexerRow = {
  id: string;
  url: string;
  network: "mainnet" | "testnet";
  submitted_by: string;
  submitted_at: string;
};

export async function getIndexers(
  network?: "mainnet" | "testnet",
): Promise<IndexerRow[]> {
  let query = db
    .from("indexer_registry")
    .select("id, url, network, submitted_by, submitted_at")
    .order("submitted_at", { ascending: false });

  if (network) query = query.eq("network", network);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as IndexerRow[];
}
