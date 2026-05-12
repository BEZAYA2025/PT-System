import { sql, type QueryResult } from "@vercel/postgres";

export type WaitlistRow = {
  id: number;
  email: string;
  name: string;
  experience: string | null;
  markets: string[] | null;
  challenge: string | null;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
  // Neon returns TIMESTAMPTZ as a JS Date, not a string. Reflect that here.
  created_at: Date;
};

export type WaitlistInsert = {
  email: string;
  name: string;
  experience: string | null;
  markets: string[];
  challenge: string | null;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type InsertResult =
  | { kind: "inserted"; row: WaitlistRow }
  | { kind: "duplicate" };

export async function insertWaitlistEntry(
  entry: WaitlistInsert,
): Promise<InsertResult> {
  // The neon driver sends JS arrays as Postgres array literals.
  // Cast through unknown so the tagged-template's Primitive type accepts it.
  const markets = entry.markets as unknown as string;
  const result: QueryResult<WaitlistRow> = await sql<WaitlistRow>`
    INSERT INTO waitlist
      (email, name, experience, markets, challenge, source, ip_address, user_agent)
    VALUES
      (${entry.email}, ${entry.name}, ${entry.experience}, ${markets},
       ${entry.challenge}, ${entry.source}, ${entry.ip_address}, ${entry.user_agent})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name, experience, markets, challenge, source,
              ip_address::text AS ip_address, user_agent, created_at
  `;

  if (result.rows.length === 0) return { kind: "duplicate" };
  return { kind: "inserted", row: result.rows[0] };
}

export async function countRecentSubmissionsByIp(
  ip: string,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const result = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count
    FROM waitlist
    WHERE ip_address = ${ip}::inet
      AND created_at >= ${since}::timestamptz
  `;
  return Number(result.rows[0]?.count ?? "0");
}
