# Impro Chat Search Plugin

Pull group chat messages, store them locally in IndexedDB, and search them with fuzzy text matching.

## Features

- **Pull messages** from any conversation via Impro's plugin host API
- **Store locally** in IndexedDB — no external servers
- **Fuzzy search** with adjustable fuzziness (typo-tolerant)
- **Filter by sender** — dropdown populated from search results
- **Filter by time** — quick-select 7d / 30d / 90d / All
- **Sidebar icon** — easy access from Impro's main navigation

## Prerequisites

This plugin requires the following host methods to be available from Impro:

| Method | Returns |
|--------|---------|
| `getConvoList` | Array of `{ id, name }` conversation objects |
| `getConvoMessages` | `{ messages: [...], cursor: string \| null }` |

If these aren't available, see [Phase 1 of the implementation plan](./docs/impro-plugin-plan.md)
for the upstream PR needed.

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch mode
npm run dev
```

Output goes to `dist/main.js`.

### Local testing

Symlink the plugin directory into Impro's `plugins-local/`:

```bash
ln -s $(pwd) /path/to/impro/plugins-local/chat-search
```

Then enable it in Impro's plugin settings.

## Structure

```
impro-plugin-chat-search/
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies & build scripts
├── build.js             # esbuild bundle config
├── src/
│   ├── main.js          # Plugin entry point
│   ├── db.js            # IndexedDB wrapper
│   ├── search.js        # MiniSearch fuzzy search
│   ├── page.js          # Full-page lit-html view
│   └── sidebar.js       # Sidebar icon registration
└── README.md
```

## License

MIT
