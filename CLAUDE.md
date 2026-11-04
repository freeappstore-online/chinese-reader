# Chinese Reader

Free Chinese text reader at https://chinese-reader.freeappstore.online.

- Dev: `pnpm install && pnpm dev`.
- Validate: `pnpm typecheck`, `pnpm test`, `pnpm test:browser`, `fas check`.
- Work on main; push main to deploy through existing GitHub Actions.
- Platform SKILLS.md: https://freeappstore.online/skills.md.
- Compatibility pointer: https://raw.githubusercontent.com/freeappstore-online/freeappstore/main/SKILLS.md
- Keep the SDK Shell, its navigation and PageHeader. Preserve the pnpm SDK `headerActions` and `offlineMessage` patch: the user wants an avatar opening local Profile, with all settings there and no sign-in entry.
- Reading preferences and independent font/size choices live in `useReadingSettings.ts`; tone guides reuse Hanzi Practice contours.
- Reader source is `web/src`; runner companion is `runner/`.
- Dictionary and stroke data licenses are separate from MIT; preserve notices.
- Model processing must preserve source text, token ordering and offsets. Never turn guessed timings into claimed word alignment or substitute cloud AI silently.
- Model output supplies meanings and translation; dictionary pinyin stays authoritative.
- `runner/server.ts` is loopback-only, with exact Host/Origin checks and a single active request. Do not expose it on the Internet or make a permissive proxy.
- No personal lesson files in git. Do not change another PAGS agent or configure a remote grant as part of ordinary app work.
- Distinguish same-computer companion, manual remote CLI transfer and future automatic PAGS dispatch. The latter is not shipped.
