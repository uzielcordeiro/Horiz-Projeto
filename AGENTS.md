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
- Keep calendar repetition controls shared across categories; validate daily and weekly finite counts with the recurrence helpers in both creation and editing, while endless repetition belongs only to monthly controls, to keep calculations consistent.
- Mark newly created or edited weekly recurrences with `weeklyWithinStartMonth` and generate their dates from the start date at seven-day intervals; unmarked saved recurrences retain legacy behavior to avoid silently changing existing records.
- Daily recurrences with picked days store them in `daysOfMonth` and occur only on those days of the start month; empty `daysOfMonth` keeps legacy consecutive days. Why: reuses the existing field without migrating saved data.
- Keep the wording of a launch line in the compact month list inside the shared helper in `src/lib/month-item-label.ts` and render it through that helper for every category, so one label rule covers entradas, saídas and cartão at once and stays covered by a test.
- Use CalendarItemLabel for calendar month and day launch labels, passing original entry/occurrence tags through DayItem, so both lists display the same conditional tag line without modifying financial logic.
- Keep extra Horizonte color tiers in `horizonStatusOf` and the HorizonBoard status maps, never in `statusOf`, so the Saldos table and Totais keep their existing tones.


