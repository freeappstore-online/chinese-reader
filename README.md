# Chinese Reader

Read your own Chinese text with pinyin, single-word English reading cues, sentence translations, audio and stroke order together. Tap any word for its full contextual or dictionary meaning.

App: https://chinese-reader.freeappstore.online

## First version

- Paste Chinese, import UTF-8 `.txt`, or import/export a processed lesson `.json` (12,000 source characters, 2 MB import limit).
- Source-preserving dictionary segmentation in a Web Worker using CC-CEDICT. Contextual pinyin from pinyin-pro, checked against dictionary readings; simplified and traditional text remain unchanged.
- Word practice with utterance-level highlighting, fluent sentence reading with actual browser word boundaries where available, speed control, a saved 0–10 second pause after each word for repeating aloud (1.5 seconds by default, word mode only), repeat sentence, tap a word to pause, and resume from that word.
- Selected-word meanings and real Hanzi Writer stroke animation / tracing. The mobile inspector opens above the reading when a word is tapped.
- Browser-only lesson library and saved position. Sign-in does not sync readings. Export before clearing browser data.
- A local Ollama companion and standalone CLI, suitable for running on the computer hosting a PAGS runner. It adds English sentence translations and contextual meanings; it does not let model output overwrite dictionary pinyin.
- Optional already-configured local TTS service with device speech and built-in offline speech fallbacks.
- An avatar opens a local Profile containing playback, voice, theme, interface size, separate Chinese/pinyin/translation fonts and sizes, visibility, follow-reading and local-model settings. Preferences persist on this device, without sign-in.
- Sentence translations default to above the Chinese; Profile can move them below. Escape dismisses the selected-word popup and returns focus to the word, and closes an expanded label editor or the SDK navigation menu.
- Chinese, blue pinyin and purple translations share the reading size by default. Optional compact tone contours sit directly above the Chinese characters, below pinyin, and fit the Chinese word’s width; these reflect the written pinyin, not measured speech pitch.

The sample and starter library include authored sentence translations. New personal texts need the local model or an imported processed lesson for full-sentence translation. Dictionary definitions alone are not presented as fluent sentence translations.

## Starter library

The library includes 34 texts across suggested beginner, intermediate and advanced levels, including 16 beginner selections: eighteen original modern practice passages, twelve public-domain poems and four classical prose selections. Search by title, author or content; combine level, collection and tag filters. Saved readings support editable tags and levels, preserved in JSON exports. Opening an included text does not overwrite saved readings; saving it creates one reusable copy with progress.

English learning translations are bundled, so no model is needed to start reading. Source and edition notes appear with each classic. The poems and selected classical passages carry explicit Mandarin pinyin for ambiguous readings. These are learning materials, not official HSK ratings or teacher-reviewed translations. See [library notice](web/public/library/NOTICE.txt).

## Development

Node 22+, pnpm 10. `pnpm install && pnpm dev`.

```sh
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm dlx @freeappstore/cli@latest check
```

Push main to deploy via the provisioned GitHub Actions pipeline. The platform SDK Shell owns navigation, theme and account UI. No analytics loader; background SDK diagnostic uploads are disabled.

## Saved words

Tap a word, then **☆ Save word**. **Saved words** in the navigation keeps its dictionary pinyin, compact cue, complete meaning and original annotated sentence. Saving a word does not require saving the whole reading. Words with the same text and pronunciation share one entry; different pronunciations stay separate. The first saved context is preserved.

Search by Chinese, accented or unaccented pinyin, meaning or reading title. **Review sentence** opens the original context in the reader with the word selected, ready for playback and stroke practice using your Profile preferences. Remove a star when you are comfortable with the word; Undo restores the last removal.

Saved words live in this browser and work offline. Export/import a saved-words JSON backup from the Saved words screen to transfer them between devices. Imports merge without replacing existing contexts. Storage errors leave the existing list intact and show a failure instead of a false success.

## Local model and PAGS

See [runner/README.md](runner/README.md) for `pnpm runner` and `pnpm process-reading`.

Automatic **remote PAGS dispatch is not yet connected**. This release supports a same-computer loopback companion with the reader run locally, or manual lesson JSON transfer to/from a PAGS runner. The hosted FAS content security policy blocks HTTP loopback calls, so the hosted reader uses the file workflow. No PAGS instance, grant, engine setting or live agent was changed. Neither a cloud model nor a paid fallback is used by the companion.

FAS was selected because the reader is free and its storage/processing are local. PAS is not required to use a separately authorized PAGS runner. Hosted multi-device libraries or shared generated audio would be a reason to reconsider PAS.

## Playback accuracy and limits

“Play sentence” speaks only the selected sentence without changing the saved reading style. If Repeat sentence is enabled, it repeats that sentence with the configured pause. Opening another reading cancels pending dictionary/model/file work and restores that reading’s own position, including reimports that reuse an existing lesson ID.

Word mode speaks individual words, with gaps; it is a pronunciation drill. Fluent browser speech uses boundary callbacks. A voice that supplies no word positions produces sentence-level highlighting. Fluent local TTS has sentence-level highlighting until a timed alignment provider is added. No estimated timing is labeled exact. Pause restarts the selected word/remaining phrase; it is not sample-accurate audio pause. Device speech is optional; the bundled synthetic Mandarin voice works offline. Network voices can send text to the OS/browser speech provider.

Automatic segmentation and pinyin can still be wrong for names, idioms or polyphonic contexts. Model translation is not certified. The old Kokoro and Qwen isolated-character experiments in Hanzi Practice were not reused as validated narration.

## Compact reading and spoken tones

The passage shows one English cue per word. Full meanings remain in the tap-to-open word inspector. Included texts have contextual corrections; arbitrary pasted text uses dictionary cues until a local model supplies context. The model schema requires a single-word `gloss` separately from the full `meaning`, and old lesson files without `gloss` remain readable. Phrase breaks appear as wider spaces, with shaded editable gaps in the phrase editor.

Profile → Apply spoken tone changes is on by default. Compact contours above Chinese show common third-tone, 一 and 不 changes; dictionary pinyin stays intact, with derived spoken pinyin and rule explanations in the inspector. The [PolyU tone-sandhi reference](https://www.polyu.edu.hk/bepth/introduction-to-phonetics/tones/tone-sandhi/) describes these common changes. Word practice applies changes within a word; connected modes respect phrase boundaries and punctuation. Longer third-tone sequences use suggested word grouping and explicitly indicate that emphasis can change the result. These are teaching guides, not a forced phonetic transcript: the selected TTS engine handles its own pronunciation. Toggle the option off for citation-tone contours.

## Offline and licenses

Open Profile → Offline readiness while online and wait for “Ready offline”. The one-time package is approximately 21 MB: app, library, dictionary, all 9,574 stroke diagrams in the pinned Hanzi Writer dataset, and a built-in Mandarin speech engine. It works without any installed browser voice. “Check download & keep offline” verifies the cached files and requests persistent browser storage. Browser storage can still be cleared by the user; the readiness check reports missing files.

The built-in eSpeak NG voice is a compact synthetic voice, not a human/neural recording. Automatic voice selection prefers an available Mandarin device voice, skips network voices when offline, and falls back to the built-in engine on a missing or failed device voice. Selecting “Built-in offline Mandarin” uses it directly. Audio is generated in a local worker and played through Web Audio. There is no speech API call. Its GPL component and corresponding-source directions are in `web/public/voice/espeak-1-49-1/`; application code remains MIT. Stroke data retains its Arphic license and source notice in `/strokes/NOTICE.txt`.

The included English translations and previously processed lessons work offline. New full-sentence translations still require the separately installed local model companion; the browser supplies pinyin and dictionary meanings without it. No cloud AI is substituted.

Word, phrase and sentence practice offer separate repeat-aloud delays. Phrase and sentence delays can match actual spoken duration plus one second. Fluent reading adds no repeat pause. Suggested phrase marks are stored as source offsets at word boundaries, editable per reading and preserved in saved/exported lessons. Two- and three-word drills are available separately from a text’s authored/punctuation-based phrasing. A whole group is highlighted for phrase/sentence audio; only real browser boundary events drive finer fluent-word highlighting.

App code: MIT. Dictionary: unchanged 2026-11-02 CC-CEDICT snapshot from MDBG (125,356 entries), CC BY-SA 4.0; [notice](web/public/dictionary/NOTICE.txt). Stroke data: Make Me a Hanzi / Arphic Public License; [license](web/public/licenses/ARPHICPL.txt). Hanzi Writer and pinyin-pro: MIT. Data licenses remain separate from the application code.

## Validation scope

Regression tests also cover delayed model/dictionary results, same-ID reimports, progress preservation between readings, changes from another tab, corrupt storage protection, disclosure keyboard handling and local audio cancellation/timeouts. Tests exercise actual dictionary data, traditional/polyphonic readings, source offsets, corrupted imports, model-result rejection, cancellation and loopback boundary enforcement. Desktop/mobile Chromium workflows use synthetic speech events, real dictionary processing and real stroke SVGs. A real installed Ollama model was also probed separately; pronunciation output was unsuitable, which led to keeping dictionary pinyin authoritative. The production offline smoke check cold-reopens a persistent browser profile with networking and browser speech disabled, then verifies real non-silent built-in audio, cancellation, new dictionary annotation, library translations and an uncommon stroke diagram. Physical iPhone/Android playback and pronunciation review remain pending.

The pinned SDK patch adds an `offlineMessage` override for truthful local-save status and a `headerActions` slot so this app can retain the SDK Shell while replacing sign-in and quick settings with its local-profile avatar. Preserve or replace this slot when upgrading the SDK.
