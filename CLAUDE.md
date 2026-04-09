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

## Architecture

All logic runs in the browser. The Python backend from the original project is fully replaced.

```
Browser
  └── App.tsx          orchestrates session lifecycle + React UI
        ├── ToolBox    registers tool schemas + dispatch
        ├── runAgent   OpenAI Responses API loop (tool calls → history → loop)
        └── agents.ts  agent definitions (prompts + tool lists)
```

### Key Files

| File | Role |
|---|---|
| `src/App.tsx` | Root component. API key gate, session start/restart, message state, submit handler, download transcript. |
| `src/runAgent.ts` | Agent execution loop. Calls `client.responses.create()`, handles tool calls, loops until a text message or `conclude`. Port of the original `run_agent.py`. |
| `src/toolbox.ts` | `ToolBox` class. Registers tool schemas and dispatch functions. Replaces `tools.py` — schemas are declared manually (no runtime reflection). |
| `src/agents.ts` | Agent configs: name, model, tool list, and full system prompt. Two agents: `main` and `devils-advocate`. Replaces `logic_helper.yaml`. |

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

## WebSocket → Promise Resolver Pattern
The original Python design used asyncio queues to pause the agent loop while waiting for user input. The TypeScript equivalent uses a Promise resolver stored in a ref:

```
runAgent() starts → calls talk_to_user tool → creates Promise → stores resolver in inputResolverRef
User types and clicks Send → submit() calls inputResolverRef.resolve(text) → agent loop resumes
```

Session cancellation (New Session button) increments `sessionIdRef` and rejects any pending promise. Each tool closure captures its session ID and no-ops if the session has changed.

## OpenAI API Usage
- Uses the **Responses API** (`client.responses.create`) — not Chat Completions
- Input is a flat array of message/tool-call/tool-output objects (history)
- System prompt is appended to the history array at each call (not stored in history between calls)
- `dangerouslyAllowBrowser: true` is required for browser-side SDK usage
- Model: `gpt-5-mini` for both agents

## Planned Future Trainers
- **Gap Checker**: Spaced-repetition review agent. Reviews topics from a history module, finds gaps in understanding, updates review schedules. Defined in `gap_checker.yaml` in the original project — not yet ported.

When adding a new trainer, the pattern is:
1. Add agent configs to a new file (e.g. `src/trainers/gapChecker.ts`)
2. Add a trainer selector to `App.tsx` (or a new top-level router)
3. Register any trainer-specific tools in the session startup block

## Key Constraints
- No server, no build-time secrets — everything is client-side
- API key lives only in `localStorage`; never committed or logged
- `vite.config.ts` sets `base: '/cognitive-trainer/'` — all asset paths are relative to this
- Do not add a backend, proxy, or environment variable for the API key; the current user-supplied key pattern is intentional
