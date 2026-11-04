# Local model processing

This companion runs on the same computer as your PAGS runner. It calls an already installed Ollama model over loopback; it never downloads models, calls a cloud model, starts a coding agent or changes PAGS configuration. Node 22+ and pnpm are required.

1. Clone this repo on the runner and run `pnpm install`.
2. Start your installed Ollama service and choose a downloaded Mandarin-capable text model. `ollama list` shows exact model names.
3. Set `CHINESE_MODEL` to that exact name (including its tag).
4. Run `pnpm runner`. In another terminal, run `pnpm dev` and open `http://localhost:5173`. Open Profile → Local model & your data → Check local connection. Both reader and companion must run on the same computer. The hosted FAS site blocks HTTP loopback connections through its content security policy; use the JSON export/import workflow there.
5. Open a reading and click Add local-model translations. Text goes to the local model only. Cancellation preserves the original lesson. Save or export the result explicitly.

Example (replace the model placeholder with a model you have actually installed):

```sh
CHINESE_MODEL='your-installed-model:tag' pnpm runner
```

## Remote PAGS machine / phone

The first version does **not** expose an automatic PAGS remote dispatch button. Localhost on a phone means the phone, not the runner. No agent instance or remote connection was created by this app.

Export the reading JSON, transfer it to your own runner, and run:

```sh
CHINESE_MODEL='your-installed-model:tag' pnpm process-reading input.lesson.json output.lesson.json
```

Import the output JSON in the browser. The CLI refuses to overwrite an existing output file. You can run this bounded command in your existing PAGS runner terminal; no cloud coding model is needed to process the text. A future remote integration should transfer results privately and verify owner/instance identity, with idempotent jobs and cancellation. Do not publish personal reading files into the app repository.

## Optional local speech

The browser is the default speech provider. The companion also supports an **already-running local** service implementing the OpenAI-compatible `/v1/audio/speech` request contract (this is a wire format, not a call to OpenAI). Set `CHINESE_TTS_URL` to its full HTTP loopback endpoint, `CHINESE_TTS_MODEL` to its installed model and `CHINESE_TTS_VOICE` to its voice identifier. Then enable Prefer local runner voice in the reader. No specific engine is installed or claimed as pronunciation-validated.

The app falls back to browser speech on local synthesis failure. Word practice speaks one token at a time and highlights that token. Fluent local audio without alignment highlights the sentence; it never invents word timestamps. Browser fluent speech uses actual boundary events when reported. Pause/resume restarts the selected word/remaining phrase, not an exact audio sample. Browser voices can be network-backed; the voice picker labels the device's own localService report.

## Boundaries

- The bridge listens only on `127.0.0.1:18791`; Host and exact Origin are checked. Accepted browser origins are the production reader and localhost/127.0.0.1 port 5173 for development. No wildcard CORS, credentials or arbitrary command execution.
- `CHINESE_OLLAMA_URL` defaults to `http://127.0.0.1:11434`; only loopback model endpoints are accepted. Redirects are rejected. Never expose either model service directly to the Internet.
- A single request runs at a time. Request size is bounded, model calls time out, and disconnect aborts processing. Logs contain no lesson text.
- The model must provide exactly one English word in `gloss`, and a full contextual explanation in `meaning`. Multiword glosses are rejected without applying partial output. The model is constrained to the supplied tokens, with exact text/order/offset validation before applying output. This catches structural corruption, not mistranslation or bad pronunciation. Human review is still needed for learning quality.

Validation covers the companion protocol with a synthetic local model. A real local llama3.2:1b smoke test translated 你好 as Hello in about eight seconds while preserving dictionary pinyin nǐ hǎo. This is a minimal integration check, not Mandarin translation-quality certification. Real local TTS has not been validated.
