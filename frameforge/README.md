# FrameForge

Browser-based photography layout tool. Load a project JSON, assign images, preview and export frames as PNG.

## Getting Started

1. Open `index.html` in a browser (Chrome/Firefox recommended)
2. Drag a project JSON file onto the drop zone, or click the toolbar JSON button
3. Drag image files onto the canvas or into the image tray
4. Preview and export frames

---

## Shapes & Figures

Add geometric shapes to your designs via the `shape` layer type in your project JSON.

### Available shape types

| `shape` value | Description |
|---|---|
| `line` | Horizontal or angled line (`angle_deg` field) |
| `rectangle` | Filled/outlined rectangle with optional `border_radius_px` |
| `circle` | Circle or ellipse (`width_pct` and `height_pct` dimensions) |
| `triangle` | Triangle with `direction`: `up` / `down` / `left` / `right` |
| `arrow` | Line with arrowhead(s): `arrowhead`: `end` / `start` / `both` |
| `polygon` | Regular polygon or star (`sides` 3–12, `star: true` for star) |

### Fill and stroke

```json
{
  "type": "shape",
  "id": "my-shape",
  "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 25, "height_pct": 25 },
  "fill_color": "#FFFFFF",
  "fill_opacity": 0.15,
  "stroke_color": "#FFFFFF",
  "stroke_width_px": 2,
  "stroke_opacity": 0.8
}
```

See [`docs/shapes-reference.md`](docs/shapes-reference.md) for full field reference and one example per shape type.

---

## Text Positioning & Dragging

Text layers can be positioned via zone mode (recommended) or absolute percentage mode.

### Zone names

```
┌────────────┬────────────┬────────────┐
│ top-left   │ top-center │ top-right  │
├────────────┼────────────┼────────────┤
│middle-left │middle-ctr  │middle-right│
├────────────┼────────────┼────────────┤
│bottom-left │bottom-ctr  │bottom-right│
└────────────┴────────────┴────────────┘
```

```json
"position": { "zone": "bottom-left", "offset_x_pct": 5, "offset_y_pct": -8 }
```

### Dragging text

In the canvas preview, hover over any text to see the grab cursor, then drag to reposition. Positions are saved automatically. Drag close to a zone anchor to snap. Text size is never affected.

See [`docs/text-positioning.md`](docs/text-positioning.md) for full details.

---

## Project JSON Structure

See `data/ai-manual-content.js` for the complete JSON schema reference, including all layer types, fields, and examples.
