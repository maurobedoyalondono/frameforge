# FrameForge Text Positioning

Text layers can be positioned using two modes: **zone mode** (recommended) or **absolute mode**.

---

## Zone Mode

The canvas is divided into 9 named zones:

```
┌────────────┬────────────┬────────────┐
│ top-left   │ top-center │ top-right  │
├────────────┼────────────┼────────────┤
│middle-left │middle-ctr  │middle-right│
├────────────┼────────────┼────────────┤
│bottom-left │bottom-ctr  │bottom-right│
└────────────┴────────────┴────────────┘
```

Each zone has an anchor point at its corner/edge/center. Use `offset_x_pct` and `offset_y_pct` to nudge the text away from the anchor.

```json
"position": {
  "zone": "bottom-left",
  "offset_x_pct": 5,
  "offset_y_pct": -8
}
```

**Important:** Bottom zones anchor to the *bottom* of the text block — text grows upward. All other zones anchor to the *top* of the first line — text grows downward.

---

## Absolute Mode

Position text at an exact canvas location using percentages (0–100 for both axes):

```json
"position": {
  "x_pct": 20,
  "y_pct": 35
}
```

---

## Drag to Reposition

In the FrameForge preview, text layers can be repositioned by dragging them with the mouse:

1. **Hover** over any text — the cursor changes to a grab hand
2. **Click and drag** — the text moves with the mouse
3. **Release** — the new position is saved automatically

### What happens to the position data:

- **Zone mode text:** The `offset_x_pct` and `offset_y_pct` values update. The zone name stays the same unless you drag close to a different zone anchor.
- **Absolute mode text:** The `x_pct` and `y_pct` values update directly.

### Zone snapping

When dragging, if you move the text within ~5% of a zone anchor point, it **snaps** to that zone. The cursor briefly changes to a crosshair to indicate the snap. The `zone` value in the JSON updates to the new zone, and offsets reset to 0.

**Text size is never affected by dragging.** Only the position changes.

---

## Zones and negative space

Use the zone system to place text in the negative space of your photo:

| Subject position | Recommended zones |
|---|---|
| Upper half of frame | `bottom-left`, `bottom-right`, `bottom-center` |
| Lower half of frame | `top-left`, `top-right`, `top-center` |
| Left side | `bottom-right`, `middle-right` |
| Right side | `bottom-left`, `middle-left` |
| Fills frame | One edge zone with strong gradient overlay |
