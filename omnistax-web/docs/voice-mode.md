# Voice mode for AskAI

Plan. Not built. Written 2026-10-27 in answer to "we should support voice mode
in AskAI; what's the pathway?"

## What the reader gets

A microphone button in the composer. Pressed once, the chat listens; what the
reader says appears in the composer as they say it and is sent when they stop
talking. The answer streams into the transcript as it does now and is read
aloud a sentence at a time as it arrives. Speaking while it reads stops the
reading and starts listening again. A voice turn is an ordinary message in
the chat tree: it can be edited, retried, branched, searched and copied like
a typed one, and the chips above the composer go with it.

Two modes, one toggle on the button's menu:

- **Push to talk** (the default): one press, one message, nothing read aloud
  unless the reader asks with the speaker button on a bubble.
- **Conversation**: listening comes back after every answer is read, until
  the reader presses Stop or leaves the tab.

## Why this order

The chat brings the reader's own key to seven providers, and only some of them
take audio at all. Anthropic's Messages API takes text and images and has no
speech in or out, and DeepSeek, Mistral and most local servers have none
either. So voice cannot be a provider feature first. It has to sit around the
text chat, turning speech into the composer's text and the answer's text into
speech, so every provider and every model works the same. Native audio comes
later, for the providers that have it.

## Stages

### 1. Browser speech on both ends (no key, no new dependency)

- **Speech to text**: the Web Speech API's `SpeechRecognition`
  (`webkitSpeechRecognition` in Chrome and Safari) with `interimResults` on,
  so the composer fills while the reader talks, and `lang` set to the reader's
  language (`i18n.locale`), not the book's. Chrome sends the audio to Google's
  recogniser unless on-device recognition is available. The button's first-use
  note has to say so, since "nothing leaves the browser except to the provider
  you chose" is otherwise a promise of `byoai.md`. Firefox has no
  `SpeechRecognition`; there the button only offers stage 2 or says it is
  unavailable.
- **Text to speech**: `lib/voice.ts` already has a speaker over
  `speechSynthesis` for Read aloud. Give it a streaming entry point,
  `speaker.feed(delta)` and `speaker.end()`, that cuts the arriving text at
  sentence ends and queues one utterance per sentence, so reading starts
  before the answer is done.
- **What is spoken**: the rendered bubble, read through `readableText` with the
  chat's own skips added (code blocks, widgets, tool steps and chips). The maths
  is the hard part: reading `\frac{1}{2}mv^2` as TeX is useless. In
  conversation mode the system prompt gains one paragraph asking for answers
  meant to be heard, with maths said in words and an equation written out only
  when it is the point. The readable-text pass speaks KaTeX's MathML
  (`<annotation>` is TeX; the `<math>` tree reads better) with a small
  speech map (`^2` "squared", `\frac` "over"). That map is pure and testable.
- **Turn-taking**: the end of a recognition result sends the message; a
  `speechstart` while the speaker talks cancels it (barge-in); a Stop button
  stops both and the stream.
- Files: `lib/voice.ts` (the speaker's streaming entry, the speech map),
  `lib/chat/listen.svelte.ts` (the recogniser and the turn loop),
  `components/chat/Composer.svelte` (the button and the live transcript), a
  speaker button on `Bubble.svelte`, settings under AI (mode, voice, rate).

### 2. Provider speech with the reader's key

For better recognition and voices, and for Firefox: record with `MediaRecorder`
and send the clip to a speech endpoint of a provider the reader has a key for.
That provider is chosen in Settings → AI and need not be the chat's model.
OpenAI's transcription and speech endpoints and Gemini's audio input fit, and
"OpenAI-compatible" covers a local Whisper or Kokoro server. The text chat in
between is unchanged. This adds one small `SpeechProvider` interface beside
`Provider` (`transcribe(blob) → text`, `speak(text) → audio stream`), and the
key rules of `byoai.md` hold: the key stays in `omnistax-ai-v1`, and the
request goes from the browser to the provider.

### 3. Native speech-to-speech (later, optional)

OpenAI's Realtime API (WebRTC) and Gemini's Live API (WebSocket) talk back with
low latency and hear tone. They are a different shape from the text chat:
their own sessions, their own tool calling, and audio in the transcript rather
than text. Taking them on means a second chat engine, with its turns written
back into the tree as text afterwards (both APIs give transcripts) and the
book's tools (`lib/chat/tools.ts`) declared again in their schema. Worth it
only once stages 1 and 2 show readers use voice. Until then, stage 2 with
sentence streaming is close enough.

## Open questions for Chen

- Should conversation mode read the answer while it streams, or wait for the
  whole answer and read a summary of it? A long derivation read aloud is slow.
- Is a note on Chrome's server-side recognition enough, or should stage 1 ship
  only where on-device recognition is available?
- Should a voice message keep its audio (as an asset, for replay), or only its
  text? Text only keeps the backup small and the tree as it is.
