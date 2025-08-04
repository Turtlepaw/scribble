import { Agent } from "@atproto/api";
import { Record } from "@atproto/api/dist/client/types/com/atproto/repo/listRecords";

/**
 * Fetches all records for a given repo & collection, handling pagination via cursors.
 */
export async function getAllRecords({
  repo,
  collection,
  limit = 100,
  agent,
}: {
  repo: string;
  collection: string;
  limit?: number;
  agent: Agent;
}) {
  let records: Record[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo,
      collection,
      limit,
      cursor,
    });

    records = records.concat(res.data.records);
    cursor = res.data.cursor;
  } while (cursor);

  return records;
}
