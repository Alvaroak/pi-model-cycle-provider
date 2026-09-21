import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * model-cycle-provider
 *
 * Overrides the model-cycle shortcuts (ctrl+p / shift+ctrl+p) to show the
 * provider in the switch toast: "Switched to Grok 4.6 (opencode-go)". Useful
 * when the same model id is served by several providers.
 *
 * Why an extension instead of patching pi: pi's updater reinstalls the
 * package from the npm tarball and reverts any dist edits. Extension
 * shortcuts are checked by the editor BEFORE built-in app actions, so this
 * cleanly replaces app.model.cycleForward/cycleBackward and survives updates.
 *
 * Cycling mirrors the built-in session.cycleModel: scoped models when a scope
 * is configured (filtered to models with auth available), otherwise all
 * available models, wrapping around, switching via pi.setModel (same session
 * path: auth check, thinking-level clamp, model-change entry, model_select).
 */

type AnyModel = { id: string; name?: string; provider: string; reasoning?: boolean };

const modelKey = (m: AnyModel): string => `${m.provider}\0${m.id}`;

function providerName(ctx: ExtensionContext, provider: string): string {
  try {
    return ctx.modelRegistry.getProviderDisplayName(provider) || provider;
  } catch {
    return provider;
  }
}

function makeCycleHandler(pi: ExtensionAPI, direction: "forward" | "backward") {
  return async (ctx: ExtensionContext): Promise<void> => {
    const current = ctx.model as AnyModel | undefined;
    const available = (ctx.modelRegistry.getAvailable() ?? []) as AnyModel[];
    const availableKeys = new Set(available.map(modelKey));

    let list: any[];
    let scopedLevels: (string | undefined)[] | undefined;

    const scoped = (ctx.scopedModels ?? []) as unknown as { model: AnyModel; thinkingLevel?: string }[];
    if (scoped.length > 0) {
      const filtered = scoped.filter((s) => availableKeys.has(modelKey(s.model)));
      if (filtered.length <= 1) {
        ctx.ui.notify("Only one model in scope", "info");
        return;
      }
      list = filtered.map((s) => s.model);
      scopedLevels = filtered.map((s) => s.thinkingLevel);
    } else {
      if (available.length <= 1) {
        ctx.ui.notify("Only one model available", "info");
        return;
      }
      list = available;
    }

    let idx = current ? list.findIndex((m) => modelKey(m) === modelKey(current)) : -1;
    if (idx === -1) idx = 0;
    const len = list.length;
    const nextIdx = direction === "forward" ? (idx + 1) % len : (idx - 1 + len) % len;
    const next = list[nextIdx];

    const ok = await pi.setModel(next as never);
    if (!ok) {
      ctx.ui.notify(`No API key for ${next.provider}/${next.id}`, "error");
      return;
    }
    // Scoped models may pin a per-model thinking level; setModel already
    // clamped the current one, so only override when the scope defines one.
    const scopedLevel = scopedLevels?.[nextIdx];
    if (scopedLevel) pi.setThinkingLevel(scopedLevel as never);

    const thinking = pi.getThinkingLevel();
    const thinkingStr =
      next.reasoning && thinking && thinking !== "off" ? ` (thinking: ${thinking})` : "";
    ctx.ui.notify(
      `Switched to ${next.name || next.id} (${providerName(ctx, next.provider)})${thinkingStr}`,
      "info",
    );
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+p", {
    description: "Cycle to next model (toast includes provider)",
    handler: makeCycleHandler(pi, "forward"),
  });
  pi.registerShortcut("shift+ctrl+p", {
    description: "Cycle to previous model (toast includes provider)",
    handler: makeCycleHandler(pi, "backward"),
  });
}
