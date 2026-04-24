# Bus Tracker — 10 Structural Mockups

---

## 1. MAP-FIRST (Everything is a layer on the map)

No screens. No tabs. The map IS the app. Everything slides up from the bottom.

```
┌─────────────────────────────┐
│ [🔍 חפש קו...]        [📍] │  ← floating search bar
│                             │
│         🚌                  │
│    · · · · · · ·            │
│  · ·    🔵me   · ·          │
│  ·    🟡stop     ·          │
│  ·         🚌    ·          │
│   · · · · · · · ·          │
│            🚌               │
│                             │
│                             │
├─ ─ ─ ─ ─ ─ drag up ─ ─ ─ ─┤
│ ▔▔▔  (handle)               │
│ 201 אגד    LIVE ~4 דק'      │
│ 5   דן     הבא 16:20        │
│ 72  מטרו   LIVE ~8 דק'      │
└─────────────────────────────┘
```

**Drag up** → full schedule + favorites list
**Tap bus** → info bubble
**Tap stop** → schedule slides up
**No navigation. No tabs. Just the map.**

**Rationale**: Bus tracking is inherently spatial. Why leave the map?

---

## 2. GLANCEABLE (Big numbers, zero thinking)

Inspired by airport departure boards. Massive text. Instant comprehension.

```
┌─────────────────────────────┐
│                             │
│  כרמלית, תל אביב             │
│                             │
│  ┌───────────────────────┐  │
│  │  201                  │  │
│  │          4            │  │
│  │         דק'           │  │
│  │  ● LIVE   → רחובות    │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  5                    │  │
│  │         12            │  │
│  │         דק'           │  │
│  │  לוח זמנים  → ב"ש     │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  72      18 דק'       │  │
│  └───────────────────────┘  │
│                             │
│  [🗺️ מפה]    [+ קו]   [⚙️] │
└─────────────────────────────┘
```

**The ETA number is HUGE (48pt+).** Everything else is secondary.
Tap a card → map + details. But the default view is just: which bus, how long.

**Rationale**: You're at the stop, phone in one hand, sun glaring. You need ONE number.

---

## 3. TIMELINE (Chronological feed of all your buses)

Like a calendar but for buses. One unified timeline.

```
┌─────────────────────────────┐
│  🚌 עכשיו          [+] [📍] │
├─────────────────────────────┤
│                             │
│  ──── מתקרבים ────           │
│                             │
│  ⏱ 3 דק'                    │
│  201 אגד · כרמלית → רחובות   │
│  ● LIVE · 34 קמ"ש           │
│  ├─────────●──────────┤     │
│                             │
│  ⏱ 8 דק'                    │
│  72 מטרופולין · ת. רכבת      │
│  ● LIVE                     │
│                             │
│  ──── בקרוב ────             │
│                             │
│  ⏱ 16:20 (בעוד 18 דק')      │
│  201 אגד · כרמלית → רחובות   │
│  לוח זמנים                   │
│                             │
│  ⏱ 16:25                    │
│  5 דן · ת. רכבת → דיזנגוף    │
│                             │
│  ⏱ 16:40                    │
│  201 אגד                    │
│                             │
│  ──── מאוחר יותר ────        │
│  16:55 · 17:10 · 17:30...   │
│                             │
└─────────────────────────────┘
```

**All your favorite lines, merged into one chronological stream.**
Closest arrivals on top. Scroll down = further in the future.

**Rationale**: You don't care about "line 201 schedule" — you care about "what's coming next to MY stop."

---

## 4. STOP-CENTRIC (Your stop is the hero, not the line)

You save STOPS, not lines. The app shows everything at your stop.

```
┌─────────────────────────────┐
│  📍 כרמלית, תל אביב     [⚙️]│
├─────────────────────────────┤
│                             │
│  ┌──────┬──────┬──────┐     │
│  │ 201  │  5   │  72  │     │ ← tabs per line at this stop
│  └──┬───┴──────┴──────┘     │
│     ▼                       │
│                             │
│  201 אגד · → רחובות         │
│                             │
│  ● 4 דק'  🚌 ━━━━━●━━━━    │
│    16:20        בעוד 18 דק'  │
│    16:40        בעוד 38 דק'  │
│    17:00                    │
│                             │
│  ─────────────────────      │
│  201 אגד · → תל אביב  (←)  │
│    16:15  LIVE ~2 דק'       │
│    16:30                    │
│                             │
├─────────────────────────────┤
│                             │
│  📍 תחנות שלי:               │
│  כרמלית · ת. רכבת · הבימה   │
│                             │
└─────────────────────────────┘
```

**You pick a stop (or it auto-detects). The app shows ALL lines at that stop.**
Swipe between your saved stops.

**Rationale**: Real-world mental model — "I'm standing at THIS stop, what's coming?"

---

## 5. SPLIT-VIEW (Map always visible)

Persistent 50/50 split. Map on top, content below. Always.

```
┌─────────────────────────────┐
│                             │
│    🔵    · · · ·            │
│        ·    🚌  ·           │
│      ·  🟡       ·          │
│       ·     🚌  ·           │
│        · · · ·              │
│                             │
├──── drag to resize ─────────┤
│                             │
│  201 → רחובות     LIVE 4דק' │
│  201 ← תל אביב   LIVE 2דק' │
│  ───────────────────────    │
│  5  → דיזנגוף    16:20      │
│  72 → ת. רכבת    LIVE 8דק'  │
│                             │
│  [כל הלוח]  [★ מועדפים]     │
│                             │
└─────────────────────────────┘
```

**Map NEVER disappears.** The bottom panel is a compact list.
Drag the divider to see more map or more list.

**Rationale**: The two most important things (where is the bus + when does it arrive) are always visible simultaneously.

---

## 6. COMMAND BAR (Search-first, like Spotlight/Raycast)

No home screen. Just a search bar that understands natural queries.

```
┌─────────────────────────────┐
│                             │
│                             │
│   🚌                        │
│                             │
│  ┌───────────────────────┐  │
│  │ 🔍 201 רחובות...      │  │
│  └───────────────────────┘  │
│                             │
│  ── מהיר ──                  │
│  ★ 201 כרמלית    LIVE 4דק'  │
│  ★ 5 ת.רכבת     16:20      │
│                             │
│  ── הצעות ──                 │
│  "201"  → אגד, ת"א-רחובות   │
│  "201"  → קווים, מודיעין     │
│  "רחובות" → תחנות ברחובות    │
│  "קרוב"  → אוטובוסים קרובים  │
│                             │
│                             │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

**Type anything**: line number, city name, stop name, or "קרוב אליי".
Favorites show as quick-access below the bar.
Results are instant — tap → map.

**Rationale**: Power users want speed. One input, instant result. No drilling through menus.

---

## 7. CAROUSEL (Horizontal swipe between favorites)

Each favorite is a full-screen card. Swipe left/right.

```
┌─────────────────────────────┐
│  · · ● · ·            [+]  │  ← dot indicators
├─────────────────────────────┤
│                             │
│         201                 │
│     אגד · → רחובות          │
│                             │
│    ┌─────────────────┐      │
│    │   (mini map)    │      │
│    │  🔵···🚌···🟡   │      │
│    │                 │      │
│    └─────────────────┘      │
│                             │
│         ~4                  │
│         דק'                 │
│      ● LIVE                 │
│                             │
│  ─── לוח זמנים ───           │
│  16:00 LIVE בדרך             │
│  ▶16:20 בעוד 18 דק'         │
│  16:40 · 17:00 · 17:20      │
│                             │
│  [★ כרמלית, ת"א]      [🗺️]  │
│                             │
├─────────────────────────────┤
│        ← swipe →            │
│     🔍 חפש קו חדש           │
└─────────────────────────────┘
```

**Each favorite = one full card with everything: mini map, ETA, schedule.**
Swipe to next favorite. Last card = "add new".

**Rationale**: If you have 2-3 daily lines, this is the fastest UX. Zero taps for your most-used info.

---

## 8. DARK DASHBOARD (Control-center style)

Dark theme. Dense information. Multiple widgets at once.

```
┌─────────────────────────────┐
│  16:02  יום ו'         [⚙️] │
├─────────────────────────────┤
│ ┌──────────┬──────────┐     │
│ │ 201      │ 5        │     │
│ │ ●4 דק'   │ 12 דק'   │     │
│ │ →רחובות  │ →דיזנגוף  │     │
│ │ ██████●░░│ ████░░░░░│     │
│ └──────────┴──────────┘     │
│ ┌──────────┬──────────┐     │
│ │ 72       │ 480      │     │
│ │ ●8 דק'   │ 22 דק'   │     │
│ │ →ת.רכבת  │ →ירושלים  │     │
│ │ █████░░░░│ ██░░░░░░░│     │
│ └──────────┴──────────┘     │
│                             │
│ ┌─────────────────────────┐ │
│ │      (live map)         │ │
│ │  🚌  ·  🔵  ·  🚌      │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│  קרוב: 18(3') 55(5') 89(7')│
│                             │
│  [🔍]                  [📍] │
└─────────────────────────────┘
```

**4 widget tiles** for favorites (big ETAs + progress bars).
**Live map** below showing all tracked buses.
**Bottom ticker** with nearby buses.
Dark background for outdoor readability.

**Rationale**: Information density. See 4 lines + map + nearby in one glance. No scrolling.

---

## 9. BOTTOM-SHEET NATIVE (iOS-style layered sheets)

Feels like Apple Maps. Primary content peeks from bottom.

```
┌─────────────────────────────┐
│                             │
│                             │
│       (full map)            │
│    🚌    🔵   🚌            │
│      · · 🟡 · ·             │
│         🚌                  │
│                             │
│                             │
│                             │
├▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔┤
│  ▔▔▔ (grab handle)          │
│                             │
│  🔍 [חפש קו או תחנה...]     │
│                             │
│  ★ 201  ● 4דק'  → רחובות   │
│  ★ 5       12דק'  → דיזנגוף │
│                             │
│  ↑ pull up for more         │
└─────────────────────────────┘

     ┌── pulled up ──┐

┌─────────────────────────────┐
│  (map shrinks to 30%)       │
├▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔┤
│  ▔▔▔                        │
│  🔍 [חפש קו או תחנה...]     │
│                             │
│  ── מועדפים ──               │
│  ★ 201  ● 4דק'  → רחובות   │
│  ★ 5       12דק'  → דיזנגוף │
│  ★ 72   ● 8דק'  → ת.רכבת   │
│                             │
│  ── קרוב אליי ──            │
│  18 · 55 · 89 · 201 · 480  │
│                             │
│  ── לוח זמנים כרמלית ──      │
│  201: 16:00● 16:20 16:40    │
│  5:   16:25  16:45          │
│                             │
└─────────────────────────────┘
```

**Map is always there**, sheet overlays with 3 snap points:
- **Peek**: Just favorites + search (20%)
- **Half**: Full list with nearby + schedule (50%)
- **Full**: Detailed schedule, covers map (90%)

**Rationale**: This is the pattern users already know from Apple/Google Maps. Feels native.

---

## 10. STORY MODE (Line journey as a visual story)

Each line is a visual journey. See where all buses are along the route as a linear strip.

```
┌─────────────────────────────┐
│  201 אגד · תל אביב → רחובות │
├─────────────────────────────┤
│                             │
│  כרמלית ○───────────────    │
│            🚌 4 דק'         │
│  לוינסקי ○───────────────   │
│                             │
│  פלורנטין ○──────────────   │
│                 🚌 12 דק'   │
│  חולון    ○──────────────   │
│                             │
│  בת ים    ○──────────────   │
│                             │
│  ראשל"צ   ○──────────────   │
│                    🚌       │
│  נס ציונה ○──────────────   │
│                             │
│  🟡רחובות  ●──────────────  │ ← your stop
│                     🚌 עבר  │
│  ת.מרכזית ○──────────────   │
│                             │
├─────────────────────────────┤
│  [🗺️ מפה]  [⏱ לוח]  [←→]  │
└─────────────────────────────┘
```

**The route is a vertical strip.** Stops are nodes. Buses are dots moving between them.
**Your stop is highlighted.** You see exactly where each bus is relative to you.
Like a subway diagram but for your bus line.

**Rationale**: The most intuitive way to answer "how far is the bus?" — a linear spatial view.

---

## Summary Comparison

| # | Name | Key Idea | Best For |
|---|------|----------|----------|
| 1 | Map-First | Map IS the app | Visual trackers |
| 2 | Glanceable | Giant ETA numbers | Quick glance at stop |
| 3 | Timeline | Unified chronological feed | Multi-line commuters |
| 4 | Stop-Centric | Save stops, not lines | Fixed-stop users |
| 5 | Split-View | Map + list always visible | Want it all |
| 6 | Command Bar | Search-first, instant | Power users |
| 7 | Carousel | Swipe between favorites | 2-3 line commuters |
| 8 | Dark Dashboard | Dense widget grid | Information maximizers |
| 9 | Bottom-Sheet | iOS Maps pattern | Familiar UX |
| 10 | Story Mode | Linear route diagram | Visual understanding |
