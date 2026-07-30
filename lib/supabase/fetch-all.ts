import "server-only";

export interface SupabasePageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllSupabaseRows<T>(args: {
  pageSize?: number;
  fetchPage: (from: number, to: number) => Promise<SupabasePageResult<T>>;
}): Promise<T[]> {
  const pageSize = Math.max(1, Math.floor(args.pageSize ?? 1000));
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const result = await args.fetchPage(offset, offset + pageSize - 1);
    if (result.error) throw new Error(result.error.message);

    const page = result.data ?? [];
    if (page.length === 0) break;

    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}
