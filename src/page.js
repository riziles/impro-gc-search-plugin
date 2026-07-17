// Full-page chat search view using lit-html

import { html, render } from "/js/lib/lit-html.js";
import { createIndex, search, filterBySender, filterByTime } from "./search.js";
import { getAllMessages } from "./db.js";

/**
 * @typedef {import('./db.js').StoredMessage} StoredMessage
 */

/**
 * Chat search page component.
 *
 * Usage:
 *   const page = new ChatSearchPage(plugin);
 *   page.mount(containerElement);
 */
export class ChatSearchPage {
  /** @param {{ callHost: Function, db: IDBDatabase, fetchConvoList: Function, fetchConvoMessages: Function, pullAllMessages: Function }} plugin */
  constructor(plugin) {
    this.plugin = plugin;
    this.db = plugin.db;

    /** @type {{ id: string, name?: string }[]} */
    this.convos = [];
    this.selectedConvoId = "";
    this.pulling = false;
    this.pullProgress = { fetched: 0, total: null };
    this.pullError = "";

    this.query = "";
    this.results = /** @type {import('./search.js').SearchResult[]} */ ([]);
    this.searching = false;
    this.searched = false;
    this.senderFilter = "";
    this.timeFilter = "all"; // "7d" | "30d" | "90d" | "all"
    this.fuzzyLevel = 0.2;

    this.miniSearch = null;
    /** @type {Map<string, StoredMessage>} */
    this.msgCache = new Map();

    /** @type {HTMLElement|null} */
    this.container = null;
  }

  async init() {
    this.convos = (await this.plugin.fetchConvoList()) ?? [];
    this.#rebuildSearchIndex();
    if (this.container) this.#render();
  }

  // ── actions ──────────────────────────────────────────

  async pullConvo() {
    if (!this.selectedConvoId || this.pulling) return;
    this.pulling = true;
    this.pullError = "";
    this.pullProgress = { fetched: 0, total: null };
    this.#render();
    try {
      const total = await this.plugin.pullAllMessages(
        this.selectedConvoId,
        (n) => {
          this.pullProgress = { fetched: n, total: null };
          this.#render();
        }
      );
      this.pullProgress = { fetched: total, total };
      await this.#rebuildSearchIndex();
    } catch (err) {
      this.pullError = err.message || String(err);
    } finally {
      this.pulling = false;
      this.#render();
    }
  }

  handleSearch() {
    const q = this.query.trim();
    if (!q || !this.miniSearch) return;
    this.searching = true;
    this.searched = true;
    this.#render();

    // Use setTimeout to let the UI update before running search
    setTimeout(() => {
      let results = search(this.miniSearch, q, this.msgCache, {
        fuzzy: this.fuzzyLevel,
      });

      if (this.senderFilter) {
        results = filterBySender(results, this.senderFilter);
      }

      if (this.timeFilter !== "all") {
        const now = new Date();
        const days = parseInt(this.timeFilter);
        const start = new Date(now.getTime() - days * 86_400_000).toISOString();
        results = filterByTime(results, start);
      }

      this.results = results;
      this.searching = false;
      this.#render();
    }, 50);
  }

  // ── internal ─────────────────────────────────────────

  async #rebuildSearchIndex() {
    const msgs = await getAllMessages();
    this.msgCache = new Map();
    for (const m of msgs) this.msgCache.set(m.id, m);
    if (msgs.length > 0) {
      this.miniSearch = createIndex(msgs);
    }
  }

  mount(container) {
    this.container = container;
    this.#addStyles();
    this.init();
  }

  #addStyles() {
    if (document.getElementById("chat-search-styles")) return;
    const style = document.createElement("style");
    style.id = "chat-search-styles";
    style.textContent = `
      .cs-page {
        padding: 16px;
        font-family: var(--font-family, system-ui, sans-serif);
        color: var(--text, #111);
        max-width: 800px;
        margin: 0 auto;
      }
      .cs-back {
        background: none;
        border: none;
        color: var(--link, #2563eb);
        cursor: pointer;
        font-size: 14px;
        margin-bottom: 16px;
        padding: 4px 0;
      }
      .cs-back:hover { text-decoration: underline; }
      .cs-pull-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .cs-select {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--border, #ccc);
        background: var(--bg-input, #fff);
        color: var(--text, #111);
        font-size: 14px;
        min-width: 200px;
      }
      .cs-btn {
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid var(--border, #ccc);
        background: var(--bg-btn, #f3f4f6);
        color: var(--text, #111);
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
      }
      .cs-btn:disabled { opacity: 0.5; cursor: default; }
      .cs-btn-primary {
        background: var(--primary, #2563eb);
        color: #fff;
        border-color: var(--primary, #2563eb);
      }
      .cs-progress {
        font-size: 13px;
        color: var(--text-muted, #6b7280);
      }
      .cs-error {
        color: var(--danger, #dc2626);
        font-size: 13px;
        margin-top: 4px;
      }
      .cs-search-section {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--border, #e5e7eb);
      }
      .cs-search-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }
      .cs-search-input {
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--border, #ccc);
        background: var(--bg-input, #fff);
        color: var(--text, #111);
        font-size: 14px;
      }
      .cs-filters {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .cs-time-btn {
        padding: 3px 10px;
        border-radius: 12px;
        border: 1px solid var(--border, #ccc);
        background: var(--bg-btn, #f3f4f6);
        color: var(--text, #111);
        font-size: 12px;
        cursor: pointer;
      }
      .cs-time-btn.active {
        background: var(--primary, #2563eb);
        color: #fff;
        border-color: var(--primary, #2563eb);
      }
      .cs-results-count {
        font-size: 13px;
        color: var(--text-muted, #6b7280);
        margin-bottom: 8px;
      }
      .cs-empty {
        font-size: 14px;
        color: var(--text-muted, #6b7280);
        font-style: italic;
      }
      .cs-result {
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid var(--border, #e5e7eb);
        margin-bottom: 8px;
        cursor: default;
      }
      .cs-result:hover {
        background: var(--bg-hover, #f9fafb);
      }
      .cs-result-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted, #6b7280);
        margin-bottom: 4px;
      }
      .cs-result-sender { font-weight: 600; }
      .cs-result-match {
        color: var(--primary, #2563eb);
        font-size: 11px;
      }
      .cs-result-text {
        font-size: 14px;
        line-height: 1.4;
        word-break: break-word;
      }
      .cs-result-time {
        font-size: 11px;
        color: var(--text-muted, #6b7280);
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  #render() {
    if (!this.container) return;
    const convoOptions = this.convos.map(
      (c) => html`<option value=${c.id} ?selected=${c.id === this.selectedConvoId}>${c.name || c.id}</option>`
    );
    const senders = getUniqueSenders(this.results);

    const template = html`
      <div class="cs-page">
        <button class="cs-back" @click=${() => this.plugin.app?.navigate?.("/chat")}>← Back to Chats</button>

        <div class="cs-pull-bar">
          <select class="cs-select" .value=${this.selectedConvoId} @change=${(e) => { this.selectedConvoId = e.target.value; this.#render(); }}>
            <option value="">— Select conversation —</option>
            ${convoOptions}
          </select>
          <button
            class="cs-btn cs-btn-primary"
            ?disabled=${this.pulling || !this.selectedConvoId}
            @click=${() => this.pullConvo()}
          >
            ${this.pulling ? "Pulling…" : "Pull messages"}
          </button>
          ${this.pulling
            ? html`<span class="cs-progress">Fetched: ${this.pullProgress.fetched}${this.pullProgress.total != null ? " / " + this.pullProgress.total : "…"}</span>`
            : null}
        </div>
        ${this.pullError ? html`<div class="cs-error">${this.pullError}</div>` : null}

        <div class="cs-search-section">
          <div class="cs-search-bar">
            <input
              class="cs-search-input"
              type="text"
              placeholder="Search messages…"
              .value=${this.query}
              @input=${(e) => { this.query = e.target.value; this.#render(); }}
              @keydown=${(e) => { if (e.key === "Enter") this.handleSearch(); }}
            />
            <button class="cs-btn cs-btn-primary" ?disabled=${this.searching} @click=${() => this.handleSearch()}>
              ${this.searching ? "…" : "Search"}
            </button>
          </div>

          <div class="cs-filters">
            <select class="cs-select" style="min-width:140px" .value=${this.senderFilter} @change=${(e) => { this.senderFilter = e.target.value; this.handleSearch(); }}>
              <option value="">All senders</option>
              ${senders.map((s) => html`<option value=${s.did}>${s.handle}</option>`)}
            </select>
            ${["7d", "30d", "90d", "all"].map(
              (t) => html`
                <button
                  class="cs-time-btn ${this.timeFilter === t ? "active" : ""}"
                  @click=${() => { this.timeFilter = t; this.handleSearch(); }}
                >${t === "all" ? "All time" : t}</button>`
            )}
            <label style="font-size:12px;margin-left:8px">
              Fuzziness: ${this.fuzzyLevel.toFixed(2)}
              <input type="range" min="0" max="0.4" step="0.05" .value=${this.fuzzyLevel}
                @input=${(e) => { this.fuzzyLevel = Number(e.target.value); }} />
            </label>
          </div>

          ${this.searched && this.results.length === 0 && !this.searching
            ? html`<p class="cs-empty">No matching messages found.</p>`
            : null}

          ${this.results.length > 0
            ? html`
                <p class="cs-results-count">${this.results.length} result${this.results.length !== 1 ? "s" : ""}</p>
                ${this.results.map((r) => {
                  if (!r.msg) return null;
                  return html`
                    <div class="cs-result">
                      <div class="cs-result-header">
                        <span class="cs-result-sender">${r.msg.senderHandle || r.msg.senderDisplayName || r.msg.senderDid}</span>
                        <span class="cs-result-match">
                          score ${r.score.toFixed(1)}
                          ${r.matchTerms?.length ? " — " + r.matchTerms.slice(0, 3).join(", ") : ""}
                        </span>
                      </div>
                      <div class="cs-result-text">${safeText(r.msg.text)}</div>
                      <div class="cs-result-time">${new Date(r.msg.sentAt).toLocaleString()}</div>
                    </div>`;
                })}
              `
            : null}
        </div>
      </div>
    `;
    render(template, this.container);
  }
}

// ── helpers ────────────────────────────────────────────

/** Strip emoji and high-codepoint chars to avoid rendering issues. */
function safeText(s) {
  return (s || "").replace(/[\u{10000}-\u{10FFFF}]/gu, "").trim();
}

function getUniqueSenders(results) {
  const seen = new Set();
  const senders = [];
  for (const r of results) {
    if (!r.msg) continue;
    const did = r.msg.senderDid;
    if (seen.has(did)) continue;
    seen.add(did);
    senders.push({ did, handle: r.msg.senderHandle || r.msg.senderDisplayName || did });
  }
  return senders;
}
