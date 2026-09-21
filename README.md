# @alvaroak/pi-model-cycle-provider

Model cycling that shows the **provider** in the switch toast, for the [Pi coding agent](https://github.com/earendil-works/pi).

Useful when the same model id is served by several providers — native cycling says `Switched to Claude Sonnet 5`, this says `Switched to Claude Sonnet 5 (github-copilot)`, so same-name-different-provider hops are visible.

## Install

```bash
pi install git:github.com/Alvaroak/pi-model-cycle-provider@v0.1.0
```

## Usage

Same shortcuts as native model cycling — this extension cleanly shadows the built-in handlers (extension shortcuts are checked before built-in app actions):

- `ctrl+p` — next model
- `shift+ctrl+p` — previous model

Cycling mirrors the native `session.cycleModel`: scoped models when a scope is configured (filtered to models with auth available), otherwise all available models, wrapping around, switching via `pi.setModel` (same session path: auth check, thinking-level clamp, model-change entry). Scoped models with a pinned per-model thinking level carry it across switches.

## Why an extension

Editing pi's dist files doesn't survive updates — the updater reinstalls from the npm tarball. Extension shortcuts take precedence over built-ins, so this replaces `app.model.cycleForward`/`cycleBackward` cleanly and survives `pi` upgrades.

## License

MIT
