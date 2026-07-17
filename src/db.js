// IndexedDB wrapper for chat message storage
// Database: "impro-chat-search", store: "messages"

const DB_NAME = "impro-chat-search";
const DB_VERSION = 1;

let dbPromise = null;

/**
 * @typedef {Object} StoredMessage
 * @property {string} id          - "{convoId}:{messageId}"
 * @property {string} convoId
 * @property {string} text
 * @property {string} senderDid
 * @property {string} [senderHandle]
 * @property {string} [senderDisplayName]
 * @property {string} sentAt      - ISO 8601 timestamp
 */

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = /** @type {IDBDatabase} */ (e.target.result);
      if (!db.objectStoreNames.contains("messages")) {
        const store = db.createObjectStore("messages", { keyPath: "id" });
        store.createIndex("convoId", "convoId", { unique: false });
        store.createIndex("sentAt", "sentAt", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(/** @type {IDBDatabase} */ (e.target.result));
    req.onerror = (e) => reject(/** @type {Error} */ (e.target.error));
  });
  return dbPromise;
}

/**
 * Helper to wrap an IDBRequest in a Promise.
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => resolve(/** @type {T} */ (e.target.result));
    request.onerror = (e) => reject(/** @type {Error} */ (e.target.error));
  });
}

/**
 * Bulk-insert messages. Uses put() so re-fetches overwrite existing rows.
 * @param {string} convoId
 * @param {StoredMessage[]} messages
 */
export async function storeMessages(convoId, messages) {
  const db = await openDB();
  const tx = db.transaction("messages", "readwrite");
  const store = tx.objectStore("messages");
  for (const msg of messages) {
    store.put(msg);
  }
  await promisify(tx);
}

/**
 * Get all messages for a given conversation.
 * @param {string} convoId
 * @returns {Promise<StoredMessage[]>}
 */
export async function getMessages(convoId) {
  const db = await openDB();
  const tx = db.transaction("messages", "readonly");
  const index = tx.objectStore("messages").index("convoId");
  return promisify(index.getAll(convoId));
}

/**
 * Get every stored message across all conversations.
 * @returns {Promise<StoredMessage[]>}
 */
export async function getAllMessages() {
  const db = await openDB();
  const tx = db.transaction("messages", "readonly");
  return promisify(tx.objectStore("messages").getAll());
}

/**
 * Return the most recent sentAt timestamp for a convo, or null.
 * @param {string} convoId
 * @returns {Promise<string|null>}
 */
export async function getLatestTimestamp(convoId) {
  const msgs = await getMessages(convoId);
  if (msgs.length === 0) return null;
  return msgs.reduce((a, b) => (a.sentAt > b.sentAt ? a : b)).sentAt;
}

/**
 * Delete all messages for a conversation.
 * @param {string} convoId
 */
export async function clearConvo(convoId) {
  const db = await openDB();
  const tx = db.transaction("messages", "readwrite");
  const index = tx.objectStore("messages").index("convoId");
  const keys = await promisify(index.getAllKeys(convoId));
  const store = tx.objectStore("messages");
  for (const key of keys) {
    store.delete(key);
  }
  await promisify(tx);
}

/**
 * Count messages for a conversation.
 * @param {string} convoId
 * @returns {Promise<number>}
 */
export async function getMessageCount(convoId) {
  const db = await openDB();
  const tx = db.transaction("messages", "readonly");
  const index = tx.objectStore("messages").index("convoId");
  return promisify(index.count(convoId));
}

/**
 * Delete all messages from the database.
 */
export async function clearAll() {
  const db = await openDB();
  const tx = db.transaction("messages", "readwrite");
  tx.objectStore("messages").clear();
  await promisify(tx);
}
