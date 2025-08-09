import { Agent, AtUri } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
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

export async function getAllPosts({
  posts,
  agent,
}: {
  posts: AtUri[];
  agent: Agent;
}) {
  let records: PostView[] = [];
  let urisLeft = posts;

  while (urisLeft.length > 0) {
    const batch = urisLeft.slice(0, 25);
    urisLeft = urisLeft.slice(25);

    const res = await agent.getPosts({
      uris: batch.map((it) => it.toString()),
    });

    // Combine returned posts into our results
    if (res.success && res.data.posts) {
      records = records.concat(res.data.posts);
    }
  }

  return records;
}
