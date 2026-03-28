# FrameForge Shapes Reference

All shapes are defined as layers with `"type": "shape"` in your frame's `layers` array.

## Common Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `"shape"` | required | Layer type |
| `id` | string | required | Unique layer ID within the frame |
| `shape` | string | required | Shape type (see table below) |
| `position` | object | `{}` | Position using zone or absolute mode |
| `dimensions` | object | `{}` | Size fields (see per-shape below) |
| `fill_color` | `"#RRGGBB"` | null | Fill color (no fill if absent) |
| `fill_opacity` | 0–1 | `1.0` | Fill opacity |
| `stroke_color` | `"#RRGGBB"` | null | Stroke/outline color (no stroke if absent) |
| `stroke_width_px` | number | `1` | Stroke width in export pixels |
| `stroke_opacity` | 0–1 | `1.0` | Stroke opacity |

**Backwards compatibility:** If `fill_color` is absent but `color` is set, `color` is used as fill. `opacity` falls back to `fill_opacity`.

**Positioning:** All shapes position with `x_pct`/`y_pct` or `zone` + offsets — the same coordinate system as text layers. There is no auto-pin behavior.

---

## Shape Types

### `line`

A horizontal or angled line (rendered as a thin filled rectangle).

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Line length as % of canvas width |
| `dimensions.height_px` | `2` | Line thickness in pixels |
| `angle_deg` | `0` | Rotation in degrees (0 = horizontal) |

```json
{ "type": "shape", "id": "divider", "shape": "line",
  "position": { "zone": "bottom-left", "offset_x_pct": 2, "offset_y_pct": -10 },
  "dimensions": { "width_pct": 20, "height_px": 2 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.6 }
```

---

### `rectangle`

A filled/outlined rectangle with optional rounded corners.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Width as % of canvas width |
| `dimensions.height_pct` | — | Height as % of canvas height |
| `dimensions.height_px` | `2` | Height in pixels (used if height_pct absent) |
| `border_radius_px` | `0` | Corner radius in pixels |

```json
{ "type": "shape", "id": "tag", "shape": "rectangle",
  "position": { "zone": "top-left", "offset_x_pct": 3, "offset_y_pct": 3 },
  "dimensions": { "width_pct": 15, "height_pct": 4 },
  "fill_color": "#000000", "fill_opacity": 0.6,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.8,
  "border_radius_px": 4 }
```

---

### `circle`

A circle or ellipse. Use equal width/height for a circle; different values for an ellipse.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Diameter (or horizontal axis) as % of canvas width |
| `dimensions.height_pct` | same as width | Vertical axis; omit for circle |

```json
{ "type": "shape", "id": "ring", "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 30, "height_pct": 30 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 0.7 }
```

---

### `triangle`

A filled/outlined triangle pointing in one of four directions.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Bounding box width |
| `dimensions.height_pct` | — | Bounding box height |
| `direction` | `"up"` | `up` / `down` / `left` / `right` |

```json
{ "type": "shape", "id": "pointer", "shape": "triangle",
  "direction": "up",
  "position": { "zone": "bottom-center", "offset_y_pct": -5 },
  "dimensions": { "width_pct": 5, "height_pct": 4 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.9 }
```

---

### `arrow`

A line with arrowhead(s) at one or both ends.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Arrow total length |
| `dimensions.height_px` | `2` | Shaft thickness in pixels |
| `angle_deg` | `0` | Direction (0 = right, 90 = down, 180 = left, 270 = up) |
| `arrowhead` | `"end"` | `end` / `start` / `both` |

```json
{ "type": "shape", "id": "callout", "shape": "arrow",
  "angle_deg": 45, "arrowhead": "end",
  "position": { "x_pct": 30, "y_pct": 60 },
  "dimensions": { "width_pct": 15, "height_px": 3 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 1.0 }
```

---

### `polygon`

A regular n-sided polygon or star shape.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Outer radius diameter |
| `sides` | `6` | Number of sides/points (3–12) |
| `star` | `false` | `true` for star shape |
| `inner_radius_pct` | `50` | Star inner radius as % of outer (only when `star: true`) |
| `rotation_deg` | `0` | Rotation offset in degrees |

```json
{ "type": "shape", "id": "hex-badge", "shape": "polygon",
  "sides": 6, "star": false, "rotation_deg": 0,
  "position": { "zone": "top-right", "offset_x_pct": -3, "offset_y_pct": 3 },
  "dimensions": { "width_pct": 18 },
  "fill_color": "#000000", "fill_opacity": 0.5,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.8 }
```

Star example:
```json
{ "type": "shape", "id": "star", "shape": "polygon",
  "sides": 5, "star": true, "inner_radius_pct": 40, "rotation_deg": -18,
  "position": { "zone": "top-left", "offset_x_pct": 4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 8 },
  "fill_color": "#FFD700", "fill_opacity": 1.0 }
```

---

### `polyline`

A connected series of straight line segments defined by two or more percentage coordinate points.

**When to use:**
- Road or path direction suggestions across a frame
- Angular mountain or horizon silhouettes
- Multi-segment accent strokes that span compositional zones

| Field | Default | Description |
|---|---|---|
| `points` | required | Ordered array of `{x_pct, y_pct}` objects (min 2, max 20) |
| `stroke_color` | null | Hex stroke color |
| `stroke_width_px` | `1` | Stroke thickness in pixels |
| `stroke_opacity` | `1.0` | Stroke opacity (clamped to 0.35 for decorative use) |
| `stroke_dash` | none | SVG dash pattern string, e.g. `"6 4"` — solid if omitted |
| `fill_color` | null | Optional hex fill — closes the path and fills the enclosed area |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 for decorative use) |
| `blend_mode` | `"normal"` | See Blend Mode section |

**Note:** Polyline layers are selectable (show a bounding box highlight) but are not draggable — the geometry is defined by the points array, not a single position anchor.

```json
{ "type": "shape", "id": "horizon-line", "shape": "polyline",
  "points": [
    { "x_pct": 0,  "y_pct": 65 },
    { "x_pct": 25, "y_pct": 55 },
    { "x_pct": 50, "y_pct": 62 },
    { "x_pct": 75, "y_pct": 50 },
    { "x_pct": 100,"y_pct": 58 }
  ],
  "stroke_color": "#FFFFFF", "stroke_width_px": 2, "stroke_opacity": 0.20 }
```

---

### `path`

A freeform curve defined by SVG-style path commands using percentage coordinates.

**When to use:**
- Curved road or river suggestions
- Organic horizon lines
- Framing arcs and sweeping compositional guides

**Supported commands (v1.1):** `M` (move to), `L` (line to), `Q` (quadratic bezier), `C` (cubic bezier), `Z` (close path). Commands `S`, `T`, `A` are not supported in v1.1.

**Coordinate space:** All numeric values are in 0–100 percentage space. `M 50 100` means center-bottom of the canvas, not pixel 50×100.

| Field | Default | Description |
|---|---|---|
| `path_pct` | required | SVG path `d` syntax, all coords in 0–100 percentage space |
| `stroke_color` | null | Hex stroke color |
| `stroke_width_px` | `1` | Stroke thickness in pixels |
| `stroke_opacity` | `1.0` | Stroke opacity (clamped to 0.35 for decorative use) |
| `stroke_linecap` | `"round"` | `"round"`, `"butt"`, or `"square"` |
| `fill_color` | null | Optional hex fill for closed paths |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 for decorative use) |
| `blend_mode` | `"normal"` | See Blend Mode section |

**Note:** Path layers have no bounding box — they are not selectable or draggable.

```json
{ "type": "shape", "id": "road-curve", "shape": "path",
  "path_pct": "M 10 95 Q 35 40 55 70 Q 75 100 90 45",
  "stroke_color": "#FFFFFF", "stroke_width_px": 3,
  "stroke_opacity": 0.22, "stroke_linecap": "round" }
```

---

### `image_mask`

A pre-defined silhouette drawn from the built-in named asset library. The AI specifies an asset by name; the renderer resolves it to a vector path and renders it at the specified position, size, and color.

**When to use:**
- Location-specific flora or fauna silhouettes
- Human presence suggestions (cyclist, standing figure)
- Environmental props (sign post, wave, mountain peak)
- Opening or closing frames needing a single strong silhouette anchor

**Multiple instances:** Using the same asset more than once is intentional and expected. Vary `x_pct`, `y_pct`, `dimensions`, and `fill_opacity` between instances for a naturalistic effect.

| Field | Default | Description |
|---|---|---|
| `asset` | required | Asset name from built-in library or project `custom_assets` |
| `position` | required | Standard FrameForge position object (zone or absolute mode) |
| `dimensions.width_pct` | `10` | Width as % of canvas width |
| `dimensions.height_pct` | `10` | Height as % of canvas height |
| `fill_color` | required | Hex silhouette fill color |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 by renderer) |
| `flip_x` | `false` | Mirror horizontally |
| `flip_y` | `false` | Mirror vertically |
| `rotation_deg` | `0` | Rotation in degrees |
| `blend_mode` | `"normal"` | See Blend Mode section |

**image_mask layers are fully draggable** (they have a standard `position` anchor).

```json
{ "type": "shape", "id": "silhouette-1", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-left", "offset_x_pct": 5, "offset_y_pct": -30 },
  "dimensions": { "width_pct": 12, "height_pct": 28 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.18 }
```

#### Built-in asset library

| Name | Description | Typical context |
|---|---|---|
| `frailejón` | Espeletia — tall stem with dense rosette crown | Colombian páramo |
| `pine-tree` | Conifer — classic triangular silhouette | Mountain and alpine |
| `deciduous-tree` | Rounded canopy tree | Valley, lowland, temperate |
| `mountain-peak` | Single angular peak | Establishing landscape |
| `mountain-range` | Three-peak horizon line | Wide landscape, skyline |
| `cactus` | Branching columnar cactus | Desert, arid |
| `grass-tuft` | Low ground-level grass cluster | Foreground, field |
| `bird-in-flight` | Simplified bird, wings spread | Open sky frames |
| `cyclist` | Simplified rider on bike | Cycling and sport projects |
| `person-standing` | Generic standing human figure | Human presence, scale |
| `road-sign-post` | Vertical post with rectangular panel | Milestone, wayfinding |
| `wave` | Single rolling ocean wave | Coastal, water |
| `palm-tree` | Tropical palm silhouette | Beach, tropical |
| `condor` | Large soaring bird, wide wingspan | Andean, wildlife |

---

### Blend Mode

`blend_mode` is now available on all shape layer types. Previously overlay-only.

| Value | Canvas operation | When to use |
|---|---|---|
| `"normal"` | `source-over` | Default — all opaque or semi-transparent shapes |
| `"screen"` | `screen` | Light-colored strokes that should glow rather than sit on top |
| `"multiply"` | `multiply` | Dark shapes that should deepen the photo without a hard edge |
| `"soft-light"` | `soft-light` | Subtle tonal overlays, texture suggestions |
| `"overlay"` | `overlay` | High-contrast accent shapes — use sparingly |

Applies to: `line`, `rectangle`, `circle`, `triangle`, `arrow`, `polygon`, `polyline`, `path`, `image_mask`.

---

### Custom Assets (`custom_assets`)

For projects requiring silhouettes not in the built-in library. Defined at the top level of the project JSON and referenced by name in any `image_mask` layer throughout the project.

Custom assets are resolved before the built-in library — a custom asset with the same name as a built-in asset will override it.

```json
"custom_assets": [
  {
    "name": "my-peak",
    "viewbox": "0 0 100 60",
    "path_d": "M 50 5 L 90 60 L 10 60 Z",
    "description": "Optional note shown in Inspector tooltip"
  }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Reference name used in `image_mask` layers |
| `viewbox` | string | Yes | SVG viewBox of the source path, e.g. `"0 0 100 80"` |
| `path_d` | string | Yes | Raw SVG `d` attribute in the asset's own coordinate space |
| `description` | string | No | Human-readable note for the Inspector tooltip |
