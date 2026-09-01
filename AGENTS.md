<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Protected interaction invariant

- The sidebar navigation in `src/components/AppSidebar.tsx` is regression-protected behavior.
- Preserve its immediate `pointerdown` activation plus idempotent native `click` fallback for every current and future sidebar action.
- Do not replace it with a single event, global/delegated listeners, hydration queues, or duplicate navigation state.
- Any change that can affect layout, overlays, navigation, or pointer events must be checked after a full refresh with at least 100 alternating sidebar activations in both directions.
- Previously approved behavior must remain untouched unless the user explicitly asks to change it.
