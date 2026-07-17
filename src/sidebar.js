// Sidebar navigation entry point for the Chat Search plugin

/**
 * Register the sidebar icon that opens the chat search page.
 * Called from the plugin's onload().
 *
 * @param {Object} plugin - The Plugin instance
 * @param {Object} plugin.app - Impro's app router
 */
export function registerSidebar(plugin) {
  try {
    // Use Impro's sidebar icon registration API
    // Icons use Remix Icon names (per Impro's icon system)
    plugin.addSidebarItem?.("search-line", "Chat Search", () => {
      plugin.app?.navigate?.("/plugin/chat-search");
    });
  } catch (err) {
    console.warn("[chat-search] Could not register sidebar item:", err);
  }
}
