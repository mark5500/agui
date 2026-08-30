# AG-UI .NET + React (TanStack) sample

Built from the .NET SDK shipped in [ag-ui-protocol/ag-ui#1963](https://github.com/ag-ui-protocol/ag-ui/pull/1963)
(`AGUI.Abstractions` / `AGUI.Server` / `AGUI.Formatting`, NuGet v0.0.3) and TanStack AI
(`@tanstack/ai`, `@tanstack/ai-client`, `@tanstack/ai-react`).

## Layout

- `backend` — ASP.NET Core minimal API. Adapts an `IChatClient`
  (Microsoft.Extensions.AI) into an AG-UI SSE endpoint at `POST /api/agent`.
- `frontend` — Vite + TanStack Router + React chat UI using `useChat` from `@tanstack/ai-react`.
  `@tanstack/ai-client`'s wire format is AG-UI's `RunAgentInput`/`BaseEvent` protocol directly
  (it depends on `@ag-ui/core`), so it talks to the .NET backend with no server-side changes.
  - [`chat/ChatProvider.tsx`](frontend/src/chat/ChatProvider.tsx) owns the single `useChat`
    instance and a registry of client tools contributed by whichever components are currently
    mounted, and [`chat/useAgentTool.ts`](frontend/src/chat/useAgentTool.ts) is the hook individual
    components call to register one — the same distributed-tool-registration shape as assistant-ui's
    `useAssistantTool`/Toolkits or CopilotKit's `useFrontendTool`, which TanStack AI itself doesn't
    ship (its docs only show one static `tools` array assembled up front). See
    [`BackgroundColorTool.tsx`](frontend/src/BackgroundColorTool.tsx) for the pattern in use: it owns
    its own state and registers `set_background_color` only for as long as it's mounted.
  - UI is [shadcn/ui](https://ui.shadcn.com) (`radix-nova` style, on Tailwind v4) — dashboard shell
    with a left nav ([`components/app-sidebar.tsx`](frontend/src/components/app-sidebar.tsx)) and a
    topbar ([`components/site-header.tsx`](frontend/src/components/site-header.tsx)), both wired
    through TanStack Router's `Link`. Chat itself lives in a second, independent collapsible
    sidebar on the right ([`routes/__root.tsx`](frontend/src/routes/__root.tsx)) — two nested
    `SidebarProvider`s, so the nav and chat panels toggle independently. `components.json` points
    `css` at `src/styles.css` and disables `rsc`; the shadcn CLI's `init -t vite` currently hardcodes
    `app/globals.css` regardless of that flag (reproduced on 4.18.0 and 4.19.0), so the theme CSS
    was generated into a throwaway `app/globals.css` and copied in by hand rather than fixed upstream.

The `Hosting/` files in the backend (`AddAGUI`, `MapAGUI`, `AGUIResults`, `AGUIEventStreamResult`)
are adapted from the ag-ui-protocol samples repo — they aren't published as a NuGet package yet
(SDK is pre-1.0), so they're vendored locally.

## Running

Requires the .NET 10 SDK and Node.js.

```bash
# backend (http://localhost:5001)
cd backend
dotnet run
```

Without an `OPENAI_API_KEY`, the backend falls back to a deterministic `FakeChatClient` that
echoes your message, so you can verify the wiring end-to-end without credentials. To use OpenAI:

```bash
cd backend
dotnet user-secrets set OPENAI_API_KEY sk-...
# optional: dotnet user-secrets set OPENAI_MODEL gpt-4o
dotnet run
```

```bash
# frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and send a message.

## Generative UI: the agent can change the page

The frontend declares a `set_background_color` client tool ([Chat.tsx](frontend/src/Chat.tsx)).
With a real model configured, try asking it to "make the background green" — the model decides
to call the tool, AG-UI streams `TOOL_CALL_START` / `TOOL_CALL_ARGS` / `TOOL_CALL_END` events down
to the browser, and the frontend applies the color directly (no server-side execution involved).
It then replies with a matching tool result so the conversation can continue across turns.

Without an API key, `FakeChatClient` scripts the same tool call when it spots a known color
name in your message, so the effect is visible even in offline/fake mode.

### Why `.client(execute)` isn't used: `@tanstack/ai-client`'s auto-continuation is TanStack-server-only

**Status: working, via a manual workaround — not a library bug, an architecture mismatch.**

Packages are current as of 2026-08-30 (`@tanstack/ai` 0.52.x, `@tanstack/ai-client` 0.29.x,
`@tanstack/ai-react` 0.22.x, `AGUI.*` 0.0.6). Re-tested against this release: switching
[Chat.tsx](frontend/src/Chat.tsx) back to the plain `.client(execute)` API still never invokes it
against this .NET backend — same gap as on 0.48.x/0.26.x a week earlier. Tracked upstream as
[TanStack/ai#911](https://github.com/TanStack/ai/discussions/911) (open, no PR yet closes it;
[#970](https://github.com/TanStack/ai/pull/970) and [#1102](https://github.com/TanStack/ai/pull/1102)
are adjacent but explicitly don't cover foreign-server interop).

`ChatClient`'s automatic "execute the client tool, then auto-continue" path (`onToolCall`, in
`@tanstack/ai/dist/esm/activities/chat/stream/processor.js`) is only wired up to fire when a run
finishes via TanStack's own **interrupt** extension — `RUN_FINISHED` carrying
`outcome: { type: "interrupt", interrupts: [{ reason: "client_tool_input", ... }] }`. Plain AG-UI's
`TOOL_CALL_START` / `TOOL_CALL_ARGS` / `TOOL_CALL_END` events (what the spec defines, and what this
.NET backend emits) update the tool-call part to `input-complete` but never call `onToolCall` —
that handler only listens for the interrupt-shaped outcome. A foreign AG-UI server that doesn't
also speak TanStack's interrupt protocol on top of the base spec will never trigger
`.client(execute)`, regardless of package version.

[Chat.tsx](frontend/src/Chat.tsx) works around this the way TanStack's own maintainer/community
answered the same question in
[TanStack/ai#784](https://github.com/TanStack/ai/discussions/784) ("`useChat` doesn't automatically
invoke client tools?" — confirmed there as a custom-backend-only limitation, not TanStack's native
pipeline): tools are registered bare (no `.client(execute)`, which would just never run), and the
`onFinish` callback passed to `useChat` generically scans the finished message's tool-call parts for
any that reached `state === "input-complete"`. Rather than special-casing `set_background_color`,
it looks the tool name up in `clientToolExecutors` — a small `Record<string, (input) => output>`
map — runs the matching executor if one exists, and reports the result via the `addToolResult`
returned by `useChat` (which internally drives `checkForContinuation()` and sends the follow-up
turn itself, the same as the automatic `.client(execute)` path would have). Adding another client
tool means adding one entry to that map; `onFinish` itself doesn't change.

#### `FakeChatClient` footgun this workaround exposed

Once `addToolResult`'s auto-continuation is actually firing (confirmed working as of 0.29.x —
it wasn't when this workaround was first written), it resends the full message history including
the *original* user turn, since a continuation has no new user message of its own.
[FakeChatClient.cs](backend/FakeChatClient.cs) originally scripted a tool call whenever
*any* message in history contained a known color name — so every continuation re-triggered the
same tool call, forever, in a tight client/server loop. Fixed by only scripting the tool call when
no tool-result message exists yet *after* the latest user turn, so each user turn gets scripted at
most once. A real model wouldn't have hit this (it would just say "done" instead of re-calling the
tool), but it's worth knowing this class of bug exists if you extend `FakeChatClient` further.
