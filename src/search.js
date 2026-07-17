// Fuzzy search over chat messages using MiniSearch

import MiniSearch from "minisearch";

/**
 * @typedef {import('./db.js').StoredMessage} StoredMessage
 */

/**
 * @typedef {Object} SearchResult
 * @property {StoredMessage} msg
 * @property {number} score
 * @property {string[]} [matchTerms]
 */

/**
 * Create a MiniSearch index from an array of messages.
 * @param {StoredMessage[]} messages
 * @returns {MiniSearch}
 */
export function createIndex(messages) {
  const mini = new MiniSearch({
    fields: ["text", "senderHandle", "senderDisplayName"],
    storeFields: ["id"],
    searchOptions: {
      boost: { text: 2, senderHandle: 1, senderDisplayName: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  mini.addAll(
    messages.map((m) => ({
      id: m.id,
      text: m.text,
      senderHandle: m.senderHandle ?? "",
      senderDisplayName: m.senderDisplayName ?? "",
    }))
  );

  return mini;
}

/**
 * Run a fuzzy search, returning scored results.
 * @param {MiniSearch} mini
 * @param {string} query
 * @param {Object} [opts]
 * @param {number} [opts.fuzzy] - fuzzy level (default 0.2)
 * @param {number} [opts.limit] - max results (default 50)
 * @param {Map<string, StoredMessage>} msgCache - id → message lookup
 * @returns {SearchResult[]}
 */
export function search(mini, query, msgCache, opts = {}) {
  const { fuzzy = 0.2, limit = 50 } = opts;
  const raw = mini.search(query.trim(), { fuzzy, prefix: true });
  return raw.slice(0, limit).map((r) => ({
    msg: msgCache.get(r.id),
    score: r.score,
    matchTerms: Object.keys(r.match).filter((k) => r.match[k].length > 0),
  }));
}

/**
 * Post-filter results by sender DID.
 * @param {SearchResult[]} results
 * @param {string} senderDid
 * @returns {SearchResult[]}
 */
export function filterBySender(results, senderDid) {
  return results.filter((r) => r.msg && r.msg.senderDid === senderDid);
}

/**
 * Post-filter results by time range.
 * @param {SearchResult[]} results
 * @param {string} [start] - ISO 8601 start (inclusive)
 * @param {string} [end]   - ISO 8601 end (inclusive)
 * @returns {SearchResult[]}
 */
export function filterByTime(results, start, end) {
  return results.filter((r) => {
    if (!r.msg) return false;
    const t = new Date(r.msg.sentAt).getTime();
    if (start && t < new Date(start).getTime()) return false;
    if (end && t > new Date(end).getTime()) return false;
    return true;
  });
}

/**
 * Extract unique senders from search results.
 * @param {SearchResult[]} results
 * @returns {{ did: string, handle: string }[]}
 */
export function uniqueSenders(results) {
  const seen = new Set();
  const senders = [];
  for (const r of results) {
    if (!r.msg) continue;
    const did = r.msg.senderDid;
    if (seen.has(did)) continue;
    seen.add(did);
    senders.push({
      did,
      handle: r.msg.senderHandle || r.msg.senderDisplayName || did,
    });
  }
  return senders;
}
