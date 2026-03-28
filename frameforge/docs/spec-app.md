# FrameForge Application Specification

## Overview

FrameForge is a browser-based photography layout tool. Users compose frames by placing images, text, shapes, and logos on a canvas, configure their visual properties through the Inspector UI, and preview changes in real-time on the renderer (main canvas).

---

## Frame Schema

A frame is the core data object that defines a single composition. It contains global properties (dimensions, background color, etc.) and a list of layers (image, text, shapes, logo).

### Frame Structure

```js
{
  id: string,                    // Unique frame ID
  image_src: string,            // Reference to the background image source
  width_px: number,             // Canvas width in pixels
  height_px: number,            // Canvas height in pixels
  background_color: string,     // Hex color code (e.g., "#000000")
  white_frame: object (optional),// White border/mat effect
  layers: Array<Layer>,         // Array of layer objects
}
```

### Frame Properties

#### `id` (required string)
Unique identifier for the frame within a project.

#### `image_src` (required string)
Reference to the background image source. The renderer uses this to load and display the image layer.

#### `width_px` (required number)
Canvas width in pixels. Used to determine aspect ratio and export dimensions.

#### `height_px` (required number)
Canvas height in pixels. Used to determine aspect ratio and export dimensions.

#### `background_color` (required string)
Background fill color as a hex color code (e.g., `"#000000"` for black). The renderer fills the canvas with this color before rendering layers.

#### `white_frame` (optional object)
Draws a white border (mat) around all frame content.

| Field | Type | Description |
|---|---|---|
| `enabled` | boolean | `true` to activate the border |
| `size_px` | integer | Border thickness on all four sides (px). Range: 1–400. Typical: 20–80 social, 40–120 print. |

Example:
```json
"white_frame": { "enabled": true, "size_px": 40 }
```

Omit the property entirely when no white frame is desired.

#### `layers` (required array)
Array of layer objects (image, text, shape, logo). Each layer is rendered in order from first to last. See the layer specification for details on layer types and properties.

---

## Inspector

The Inspector is the control panel on the right side of the application. It displays and allows editing of frame and layer properties.

### Frame Section

The Frame section displays global frame properties:
- **Image source** — reference to the background image
- **Canvas dimensions** — width and height in pixels
- **Background color** — interactive color picker
- **White frame** — checkbox to enable/disable and a px number input for the border size (shown only when enabled)

The Frame section contains **White frame** controls: a checkbox to enable/disable and a px number input for the border size (shown only when enabled). Changes fire an `inspector:white-frame-changed` custom event that triggers save + re-render.

### Layer Section

The Layer section displays properties of the currently selected layer. When a layer is selected (by clicking on the canvas or from a layers list), this section updates to show:
- Layer type indicator
- Layer-specific properties (position, dimensions, colors, text content, etc.)
- Delete and visibility controls

Changes to layer properties fire layer-change events that trigger save and re-render.

---

## Renderer

The Renderer is the main canvas area where the frame composition is displayed in real-time. It reads frame and layer data and draws them to a 2D canvas context using the HTML5 Canvas API.

### Rendering Flow

1. **Background fill** — Fill the entire canvas with `frame.background_color`
2. **White frame (if enabled)** — Fill the entire canvas with white (`#ffffff`) as a mat layer
3. **Layer rendering** — Render each layer in the `layers` array in order
4. **Safe zone overlay** — Draw guides/indicators for safe zones if enabled

### White Frame Rendering

When `white_frame.enabled` is true, the renderer draws a white `fillRect` over the full canvas, then calls `ctx.save()` + `ctx.translate(inset, inset)` before rendering layers. All layer rendering uses `effW = canvasW - 2*inset` and `effH = canvasH - 2*inset`. `ctx.restore()` is called after the safe zone overlay. `inset = Math.round(size_px * scaleFactor)`.

### Layer Rendering

Each layer is rendered according to its type:
- **Image layers** — Fetch and draw the image, scaled and positioned according to the layer's position and dimension properties
- **Text layers** — Render text with the specified font, size, color, and alignment
- **Shape layers** — Draw geometric shapes (rectangle, circle, line, polygon, etc.) with fill and stroke properties
- **Logo layers** — Fetch and draw a logo/icon image

All layers are rendered within the canvas bounds (or within the effective bounds if a white frame is active).

### Safe Zone Overlay

If enabled, the renderer draws safe zone indicators to show areas that are guaranteed to be visible on different devices (mobile, tablet, desktop, print). These guides help users position critical content away from the edges.

---

## Floating Text Toolbar

When a text layer is selected on the canvas, a floating toolbar appears anchored to that layer. It is absolutely positioned within `#canvas-wrap` and floats above the selected layer (or below if the layer is near the top edge). An arrow indicator points toward the selected layer.

### Layout

The toolbar uses a two-row panel:

**Row 1 — Formatting controls:**
| Control | Detail |
|---|---|
| Font family button | Opens the font picker panel (see below) |
| Size stepper | Step: 0.5. Range: 1.5–25 |
| Bold / Italic toggles | Standard bold and italic |
| Align L / C / R | SVG icon buttons for text alignment |
| Line height stepper | Step: 0.05. Range: 0.8–2.5 |
| Max width stepper | Step: 5%. Range: 10–100% |
| Color swatch | Opens a color picker for the text fill color |
| Shadow toggle | Enables/disables a drop shadow |
| Delete | Removes the text layer from the frame |

**Row 2 — Content:**
- Full-width text input. Changes are applied live to the layer.

### Font Picker Panel

Opens below the font family button. Contains three sections:

1. **IN THIS PROJECT** — Lists the font families already used in the current frame.
2. **DISPLAY** — Curated list of 6 display/headline fonts.
3. **BODY/LABELS** — Curated list of 6 body/label fonts.
4. **Search input** — Accepts any Google Font name; fetches and applies the font on selection.

---

## Floating Shape Toolbar

When a shape layer is selected on the canvas, a floating toolbar appears anchored to that layer using the same positioning logic as the text toolbar (floats above or below, with an arrow indicator).

### Layout

Single-row panel:

| Control | Detail |
|---|---|
| Fill color swatch | Opens a color picker for the shape fill color |
| Opacity stepper | Step: 0.05. Range: 0.05–1.0 |
| Width stepper | Step: 1%. Range: 1–100%. For square and circle shapes, height is adjusted automatically to preserve the aspect ratio. |
| Delete | Removes the shape layer from the frame |

### Shape Dragging

Shape layers are draggable on the canvas. Click and drag to reposition. Position is stored as `x_pct` / `y_pct` (percentage of canvas dimensions). There is no `pin_above` auto-pin behavior; shapes use only `x_pct`/`y_pct` positioning.

### Schema Migration

On first write via the toolbar, legacy `color` and `opacity` fields are migrated to `fill_color` and `fill_opacity` respectively.

---

## Data Persistence

Frame and project data are persisted to browser localStorage after any change. The application automatically saves on:
- Frame property changes (background color, dimensions, white frame settings)
- Layer changes (position, size, content, styling)
- Layer addition/deletion

Retrieval happens on application load, allowing users to resume work across sessions.

---

## Events

### Custom Events

The Inspector dispatches custom events that trigger application-level actions (save + re-render):

#### `inspector:white-frame-changed`
Fired when the white frame checkbox or size input changes. Includes:
- `detail.frameIndex` — Index of the frame being edited

#### `inspector:layer-property-changed`
Fired when any layer property is modified. Triggers layer re-render and data persistence.

#### `inspector:layer-deleted`
Fired when a layer is deleted from the frame.

---

## Validator

The application includes a validator module (`modules/validator.js`) that ensures frame and layer data conform to the schema. Validation errors are logged but do not prevent rendering; warnings are informational.

### Frame Validation

- `id` must be a non-empty string
- `image_src` must be a string (reference, not checked for existence)
- `width_px` and `height_px` must be positive numbers
- `background_color` must be a valid hex color code
- `white_frame` (if present):
  - `enabled` must be a boolean
  - `size_px` must be a positive integer
- `layers` must be an array

Unknown properties are ignored (forward compatibility).

---

## File Structure

- `index.html` — Main HTML document
- `app.js` — Application entry point and event coordination
- `styles/` — Stylesheets
  - `main.css` — Global styles
  - `components.css` — Component-specific styles (Inspector, Renderer, etc.)
- `ui/` — User interface modules
  - `inspector.js` — Inspector panel logic
  - `renderer.js` — Canvas rendering logic
- `modules/` — Core application modules
  - `validator.js` — Data validation
  - `storage.js` — localStorage persistence
- `data/` — Data and constants
  - `ai-manual-content.js` — AI context/manual

---

