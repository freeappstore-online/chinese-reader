# Chinese Reader

Read your own Chinese text with pinyin, English word meanings, sentence translations, audio and stroke order together.

App: https://chinese-reader.freeappstore.online

## First version

- Paste Chinese, import UTF-8 `.txt`, or import/export a processed lesson `.json` (12,000 source characters, 2 MB import limit).
- Source-preserving dictionary segmentation in a Web Worker using CC-CEDICT. Contextual pinyin from pinyin-pro, checked against dictionary readings; simplified and traditional text remain unchanged.
- Word practice with utterance-level highlighting, fluent sentence reading with actual browser word boundaries where available, speed control, a saved 0–10 second pause after each word for repeating aloud (1.5 seconds by default, word mode only), repeat sentence, tap a word to pause, and resume from that word.
- Selected-word meanings and real Hanzi Writer stroke animation / tracing. The mobile inspector opens above the reading when a word is tapped.
- Browser-only lesson library and saved position. Sign-in does not sync readings. Export before clearing browser data.
- A local Ollama companion and standalone CLI, suitable for running on the computer hosting a PAGS runner. It adds English sentence translations and contextual meanings; it does not let model output overwrite dictionary pinyin.
- Optional already-configured local TTS service with browser-speech fallback.
- An avatar opens a local Profile containing playback, voice, theme, interface size, separate Chinese/pinyin/translation fonts and sizes, visibility, follow-reading and local-model settings. Preferences persist on this device, without sign-in.
- Sentence translations default to above the Chinese; Profile can move them below. Escape dismisses the selected-word popup and returns focus to the word, and closes an expanded label editor or the SDK navigation menu.
- Chinese, blue pinyin and purple translations share the reading size by default. Optional word-wide tone contours use Hanzi Practice’s tone shapes above each syllable; these reflect the written pinyin, not measured speech pitch.

The sample's sentence translations are authored content. Other sentence translations require the local model or an imported processed lesson. Dictionary definitions alone are not presented as fluent sentence translations.

## Starter library

The library includes 18 texts across suggested beginner, intermediate and advanced levels: six original modern practice passages, eight public-domain poems and four classical prose selections. Search by title, author or content; combine level, collection and tag filters. Saved readings support editable tags and levels, preserved in JSON exports. Opening an included text does not overwrite saved readings; saving it creates one reusable copy with progress.

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

## Local model and PAGS

See [runner/README.md](runner/README.md) for `pnpm runner` and `pnpm process-reading`.

Automatic **remote PAGS dispatch is not yet connected**. This release supports a same-computer loopback companion with the reader run locally, or manual lesson JSON transfer to/from a PAGS runner. The hosted FAS content security policy blocks HTTP loopback calls, so the hosted reader uses the file workflow. No PAGS instance, grant, engine setting or live agent was changed. Neither a cloud model nor a paid fallback is used by the companion.

FAS was selected because the reader is free and its storage/processing are local. PAS is not required to use a separately authorized PAGS runner. Hosted multi-device libraries or shared generated audio would be a reason to reconsider PAS.

## Playback accuracy and limits

Word mode speaks individual words, with gaps; it is a pronunciation drill. Fluent browser speech uses boundary callbacks. A voice that supplies no word positions produces sentence-level highlighting. Fluent local TTS has sentence-level highlighting until a timed alignment provider is added. No estimated timing is labeled exact. Pause restarts the selected word/remaining phrase; it is not sample-accurate audio pause. A Mandarin browser voice must be installed. Network voices can send text to the OS/browser speech provider.

Automatic segmentation and pinyin can still be wrong for names, idioms or polyphonic contexts. Model translation is not certified. The old Kokoro and Qwen isolated-character experiments in Hanzi Practice were not reused as validated narration.

## Offline and licenses

After the production service worker has installed, the app, dictionary and 400 common stroke datasets are cached for offline use. Additional stroke data loads on demand from the pinned `hanzi-writer-data@2.0.1` public CDN and may need connectivity. Browser voice availability offline depends on the device. The local model must already be installed; the app never downloads a model automatically.

App code: MIT. Dictionary: unchanged 2026-11-02 CC-CEDICT snapshot from MDBG (125,356 entries), CC BY-SA 4.0; [notice](web/public/dictionary/NOTICE.txt). Stroke data: Make Me a Hanzi / Arphic Public License; [license](web/public/licenses/ARPHICPL.txt). Hanzi Writer and pinyin-pro: MIT. Data licenses remain separate from the application code.

## Validation scope

Tests exercise actual dictionary data, traditional/polyphonic readings, source offsets, corrupted imports, model-result rejection, cancellation and loopback boundary enforcement. Desktop/mobile Chromium workflows use synthetic speech events, real dictionary processing and real stroke SVGs. A real installed Ollama model was also probed separately; pronunciation output was unsuitable, which led to keeping dictionary pinyin authoritative. Physical iPhone/Android playback and pronunciation review remain pending. Synthetic speech tests are not evidence of real device audio quality.

The pinned SDK patch adds a `headerActions` slot so this app can retain the SDK Shell while replacing sign-in and quick settings with its local-profile avatar. Preserve or replace this slot when upgrading the SDK.
