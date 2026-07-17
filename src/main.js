// Chat Search Plugin — main entry point
//
// Registers a sidebar item and full-page view for searching
// group chat messages with fuzzy text matching.

import { Plugin } from "@impro.social/impro-plugin";
import { openDB, storeMessages, getAllMessages } from "./db.js";
import { ChatSearchPage } from "./page.js";
import { registerSidebar } from "./sidebar.js";

export default class ChatSearchPlugin extends Plugin {
  async onload() {
    // Open IndexedDB
    this.db = await openDB();

    // Register sidebar navigation
    registerSidebar(this);

    // Register full-page view
    this.#registerPage();

    // Expose host-call wrappers on the plugin instance
    // (used by ChatSearchPage)
    this.fetchConvoList = () => this.callHost("getConvoList");
    this.fetchConvoMessages = (convoId, cursor) =>
      this.callHost("getConvoMessages", { convoId, cursor });

    // Pull-all wrapper: paginates through host calls, stores in IndexedDB
    this.pullAllMessages = async (convoId, onProgress) => {
      let cursor = null;
      let total = 0;
      do {
        const result = await this.fetchConvoMessages(convoId, cursor);
        if (!result?.messages?.length) break;
        await storeMessages(this.db, convoId, result.messages);
        total += result.messages.length;
        cursor = result.cursor;
        onProgress?.(total, cursor);
      } while (cursor);
      return total;
    };

    console.log("[chat-search] Plugin loaded");
  }

  // ── page registration ────────────────────────────────

  #registerPage() {
    // Attempt standard Impro slot registration for full-page views.
    // The exact API depends on Impro's plugin system — try multiple patterns.
    try {
      if (this.addRegistrationTarget) {
        this.addRegistrationTarget("page", "/plugin/chat-search", {
          title: "Chat Search",
          render: (container) => {
            const page = new ChatSearchPage(this);
            page.mount(container);
          },
        });
      } else if (this.app?.addPage) {
        this.app.addPage("/plugin/chat-search", {
          title: "Chat Search",
          render: (container) => {
            const page = new ChatSearchPage(this);
            page.mount(container);
          },
        });
      } else {
        console.warn(
          "[chat-search] Could not determine page registration API. " +
          "The sidebar item will still work, but you may need to manually wire the full-page route."
        );
      }
    } catch (err) {
      console.warn("[chat-search] Page registration failed:", err);
    }
  }

  async onunload() {
    console.log("[chat-search] Plugin unloaded");
  }
}
