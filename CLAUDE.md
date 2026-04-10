# CLAUDE.md — Cognitive Trainer

## Project Purpose
Cognitive Trainer is a collection of browser-based AI coaching tools that run entirely client-side — no server, no backend. The first trainer is **Logic Trainer**: a Socratic reasoning coach that guides users through formalizing a belief into explicit premises, then stress-tests the argument via a `devils-advocate` sub-agent. All OpenAI calls happen in the browser using the user's own API key (stored in `localStorage`).

The project is deployed as a static site to GitHub Pages at:
`https://joshuaculmer.github.io/cognitive-trainer/`

## How to Run Locally
```bash
npm install        # first time only
npm run dev        # starts Vite dev server at http://localhost:5173/cognitive-trainer/
```

On first load, the app prompts for an OpenAI API key. Enter any valid key — it is stored in `localStorage` under the key `ct_openai_key` and never sent anywhere except directly to OpenAI.

## How to Build & Deploy
```bash
npm run build      # outputs to dist/
```

Deployment is automatic: pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. No secrets or environment variables are needed in CI — the API key is supplied by the user at runtime.

To enable GitHub Pages for a new repo: **Settings → Pages → Source → GitHub Actions**.

## File Structure

```
src/
  components/                        # Shared UI components (one folder per component)
    ChatView/
      ChatView.tsx                   # Chat screen: header+tabs, message list, status bar, input footer
      ChatView.css
    KeyGate/
      KeyGate.tsx                    # API key entry screen shown before session starts
      KeyGate.css
    UsagePage/
      UsagePage.tsx                  # Token usage + cost table (rendered inside ChatView usage tab)
      UsagePage.css
  trainers/                          # One folder per trainer
    logic-trainer/
      agents.ts                      # Agent configs: name, model, tool list, system prompts
      useLogicTrainerSession.ts      # Session hook: OpenAI client, toolbox wiring, all state + refs
  runAgent.ts                        # Generic agent loop (Responses API); not trainer-specific
  toolbox.ts                         # ToolBox class: register/dispatch tool schemas and functions
  types.ts                           # Shared TypeScript interfaces (Agent)
  usage.ts                           # localStorage usage recording + cost summarization
  App.tsx                            # Root: manages API key state, calls hook, routes to KeyGate or ChatView
  main.tsx                           # Vite entry point
  index.css                          # Global CSS vars (design tokens), resets, typography base

docs/
  css-reference.md                   # Design token reference, spacing/type/button patterns — read before adding CSS
```

## Architecture

All logic runs in the browser. The Python backend from the original project is fully replaced.

```
App.tsx  (key state + routing)
  ├── KeyGate          (unauthenticated)
  └── ChatView         (authenticated)
        ├── useLogicTrainerSession   (session hook: agent wiring, state, Promise-resolver pattern)
        │     ├── runAgent           (OpenAI Responses API loop)
        │     ├── ToolBox            (tool schema registry + dispatch)
        │     └── agents.ts          (Logic Trainer prompts + agent configs)
        └── UsagePage  (usage tab content)
```

### Component Contract

**`ChatView`** receives a `LogicTrainerSession` object as `session` prop plus `onStartNew` and `onChangeKey` callbacks. It owns only UI state (tab, textarea ref, scroll ref) — all session state lives in the hook. This means `useLogicTrainerSession` can be paired with a different UI, and `ChatView` can be paired with a different trainer's hook.

**`useLogicTrainerSession`** returns: `messages`, `input`, `setInput`, `statusText`, `waitingForInput`, `sessionDone`, `usageVersion`, `transcriptIsEmpty`, `submit()`, `downloadTranscript()`, `clearUsage()`, `cancelSession()`, `startSession(key)`.

## Agent Design

### `main` (Logic Trainer / Socratic coach)
- Walks the user through 6 steps: establish belief → clarify → formalize premises → call `devils-advocate` → confirm soundness → `conclude`
- All user communication goes through `talk_to_user` (which pauses the agent loop and waits for user input via a Promise resolver)
- One-way announcements use `send_message_to_user`
- Ends the session by calling `conclude`

### `devils-advocate`
- Invoked as a tool by the `main` agent
- Receives the user's current argument as a string, returns a structured critique
- Checks for a large catalogue of named logical fallacies (defined in `DA_PROMPT` in `agents.ts`)
- Never suggests corrections — only identifies problems

## Promise Resolver Pattern
The original Python design used asyncio queues to pause the agent loop while waiting for user input. The TypeScript equivalent uses a Promise resolver stored in a ref:

```
runAgent() starts → calls talk_to_user tool → creates Promise → stores resolver in inputResolverRef
User types and clicks Send → submit() calls inputResolverRef.resolve(text) → agent loop resumes
```

Session cancellation (`cancelSession()` / New Session button) increments `sessionIdRef` and rejects any pending promise. Each tool closure captures its session ID and no-ops if the session has changed.

## OpenAI API Usage
- Uses the **Responses API** (`client.responses.create`) — not Chat Completions
- Input is a flat array of message/tool-call/tool-output objects (history)
- System prompt is appended to the history array at each call (not stored in history between calls)
- `dangerouslyAllowBrowser: true` is required for browser-side SDK usage
- Model: `gpt-5-mini` for both agents

## CSS
All styles use CSS custom properties from `src/index.css`. Each component has its own `.css` file co-located in its folder — no shared component stylesheet.

See **`docs/css-reference.md`** for the full design token reference, typography scale, spacing cadence, button patterns, and conventions before adding or modifying any CSS.

## Adding a New Trainer
1. Create `src/trainers/my-trainer/agents.ts` — agent configs (import `Agent` from `../../types`)
2. Create `src/trainers/my-trainer/useMyTrainerSession.ts` — session hook (same Promise-resolver pattern)
3. Wire in `App.tsx` — add a trainer selector or route, call the hook, pass session to `<ChatView>`
4. Register trainer-specific tools inside the hook's `startSession` (same ToolBox pattern)

## Key Constraints
- No server, no build-time secrets — everything is client-side
- API key lives only in `localStorage`; never committed or logged
- `vite.config.ts` sets `base: '/cognitive-trainer/'` — all asset paths are relative to this
- Do not add a backend, proxy, or environment variable for the API key; the current user-supplied key pattern is intentional
