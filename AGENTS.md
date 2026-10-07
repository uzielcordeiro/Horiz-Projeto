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

- Use `dailyBudgetAmount` for daily forecast values in Menu, Totais, and calendar occurrences so all views share the same month-aware, downward-to-cents rounding.
- Keep Horizonte gestures axis-locked and hand vertical overflow to the page because diagonal movement and trapped scrolling break touch navigation.
- Load saved data before the main page paints (client-only route + layout effect, loading screen until ready) because a provisional empty render shows fake zeros on reload.
