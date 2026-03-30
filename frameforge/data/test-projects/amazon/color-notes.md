# Color Notes — Amazonía

## Palette reference

| Hex | Name | Role | Safe zones | Risk zones |
|-----|------|------|-----------|-----------|
| `#F5EFE0` | Warm White | All captions and headlines | Dark zones, gradient bars, solid bars | Light/bright/hazy backgrounds |
| `#C4782A` | River Amber | Eyebrows only | Dark zones, solid bars | Warm-toned, bright, or amber-hued zones |
| `#1B3826` | Deep Canopy | Overlay/bar base | — | — |

---

## Per-frame color guide

### frame-01 · aerial-amazon-river · text zone: top
**Zone character:** The aerial shot shows the river winding through dense canopy; the top edge is sky and treetop canopy — a medium-toned blue-green haze with moderate brightness.
**Luminance:** medium — sky is hazy overcast, not punchy bright; canopy tops at the horizon add mid-green texture.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow | `#C4782A` | ✓ USE `#C4782A` — gradient darkens the top zone to 50% Deep Canopy; amber reads clearly against deep green-black overlay. |
| Headline | `#F5EFE0` | ✓ USE `#F5EFE0` — gradient at top provides a dark anchor; warm white headline will read at 9.5 size_pct without issue. |

---

### frame-02 · aerial-river-descent · text zone: bottom
**Zone character:** The bottom of this aerial frame shows wide river surface catching diffuse sky light — pale grey-silver water, relatively uniform and bright.
**Luminance:** light — river surface is reflective and near-white under overcast sky.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption | `#F5EFE0` | ⚠ OVERRIDE → `#FFFFFF` — the bottom zone gradient (to_opacity 0.55 at 100%) lays Deep Canopy over a very bright river surface; at 55% opacity the underlay may still be quite light. The gradient should be sufficient but `#F5EFE0` is a very low-contrast warm white on a silver-lit river. Recommend confirming at render; if the gradient darkens adequately, `#F5EFE0` will work — but if the river highlights bleed through the 55% overlay, push to pure white `#FFFFFF` for safety. **Conditional: hold `#F5EFE0` if gradient renders at full 55% opacity; override to `#FFFFFF` if caption appears muddy.** |

---

### frame-03 · canoe-interior-river-view · text zone: bottom
**Zone character:** Interior of a canoe looking outward — the bottom zone is the dark wooden hull interior, very dark brown/black shadowed wood.
**Luminance:** very dark — canoe interior is deep shadow, almost black.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption | `#F5EFE0` | ✓ USE `#F5EFE0` — no gradient needed; the natural dark canoe interior provides excellent contrast for warm white text. Maximum legibility. |

---

### frame-04 · canoe-dusk-silhouette · text zone: none
SILENT — no analysis needed.

---

### frame-05 · canoes-water-hyacinths · text zone: bottom solid bar
**Zone character:** Text reads against `#1B3826` solid bar at 82% opacity, not the photo. The photo below shows canoes and water hyacinths (busy green/teal water surface with plant texture).
**Luminance:** N/A — solid bar determines legibility.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on `#1B3826` Deep Canopy is high contrast (dark forest green vs. near-white). Safe. |

---

### frame-06 · jungle-canopy-vertical · text zone: bottom solid bar
**Zone character:** Text reads against `#1B3826` solid bar at 82% opacity. The photo is an extreme vertical canopy shot — very dense dark-green foliage top to bottom.
**Luminance:** N/A — solid bar determines legibility.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on Deep Canopy bar is high contrast. Safe. |

---

### frame-07 · buttress-roots-closeup · text zone: none
SILENT — no analysis needed.

---

### frame-08 · yellow-tree-frog · text zone: bottom solid bar
**Zone character:** Text reads against `#1B3826` solid bar at 82% opacity. The photo shows a vivid yellow tree frog on dark/brown leaf litter. Bar sits below the subject.
**Luminance:** N/A — solid bar determines legibility.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow | `#C4782A` | ✓ USE `#C4782A` — River Amber on Deep Canopy bar gives strong contrast; the amber/dark-green pairing works here and will not compete with the yellow frog (eyebrow sits in the bar, not over the subject). |
| Caption | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on Deep Canopy bar is high contrast. Safe. |

---

### frame-09 · howler-monkey-portrait · text zone: top (eyebrow) + bottom (caption), no gradient
**Zone character:** Top zone — the howler monkey is positioned centrally/low; the top zone is a dark warm-brown blurred background (out-of-focus jungle interior). Bottom zone — similarly dark, warm brown bokeh and jungle shadow.
**Luminance:** dark — the background is a deep warm brown throughout both zones, very dark at top and bottom edges.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow (top) | `#C4782A` | ⚠ OVERRIDE → `#F5EFE0` — the top background is warm brown/amber-toned, which is the same chromatic family as River Amber `#C4782A`. The eyebrow will disappear against the warm-brown bokeh. Use warm white for the eyebrow text in this frame. |
| Caption (bottom) | `#F5EFE0` | ✓ USE `#F5EFE0` — bottom zone is dark warm shadow; warm white reads clearly with good contrast. |

---

### frame-10 · squirrel-monkey-branch · text zone: top (eyebrow) + bottom (caption), no gradient
**Zone character:** Top zone — squirrel monkey portrait; background is soft-focus green foliage (medium green bokeh, moderately bright). Bottom zone — green bokeh, similar mid-tone.
**Luminance:** medium — out-of-focus foliage creates a medium-bright green background in both zones.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow (top) | `#C4782A` | ✓ USE `#C4782A` — amber against medium green is sufficiently distinct in hue to read; the tones are different enough (warm amber vs. cool-to-neutral green). Acceptable, though on the edge. |
| Caption (bottom) | `#F5EFE0` | ⚠ OVERRIDE → `#FFFFFF` — the bottom zone is medium-bright green bokeh with no gradient overlay. `#F5EFE0` (warm near-white) may lack sufficient contrast against bright green bokeh. Override to pure white `#FFFFFF` for safety, or confirm at render. Alternatively, consider adding a subtle gradient for this frame. |

---

### frame-11 · hoatzin-perched · text zone: top (eyebrow) + bottom (caption), no gradient
**Zone character:** The hoatzin (#27 on Sheet 3) is perched in foliage; the background is medium-dark green jungle vegetation. Top zone — dark-green foliage upper canopy. Bottom zone — similar dark-green vegetation.
**Luminance:** dark — foliage is dense and underexposed, giving a deep green-brown background.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow (top) | `#C4782A` | ✓ USE `#C4782A` — amber against dark green reads well; the hue contrast is strong and luminance contrast is adequate. |
| Caption (bottom) | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on dark foliage background is legible. No issue. |

---

### frame-12 · kingfisher-amazon · text zone: top (eyebrow) + bottom (caption), no gradient
**Zone character:** The kingfisher (#13 on Sheet 2) is perched against soft-focus green foliage — medium-bright green bokeh background, relatively uniform. Both zones are the same soft green out-of-focus background.
**Luminance:** medium — soft bokeh green, moderately bright.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow (top) | `#C4782A` | ✓ USE `#C4782A` — amber reads against medium green bokeh with reasonable hue separation. Acceptable. |
| Caption (bottom) | `#F5EFE0` | ⚠ OVERRIDE → `#FFFFFF` — medium-bright green bokeh without a gradient overlay creates insufficient contrast for `#F5EFE0` (which can appear almost as light as the background in these conditions). Override to pure `#FFFFFF` for safety, or add a subtle bottom gradient. |

---

### frame-13 · trogon-red-black · text zone: top (eyebrow) + bottom (caption), no gradient
**Zone character:** The trogon (#24 on Sheet 3) shows a red-and-black bird against a dark canopy background — deep shadowed foliage, very dark. Top zone: dark green-black. Bottom zone: dark green-black.
**Luminance:** very dark — deep canopy shadow provides near-black background in both zones.

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow (top) | `#C4782A` | ✓ USE `#C4782A` — amber on near-black background has strong contrast. The bird's red coloring is centrally positioned and will not interfere with the eyebrow at top-left. |
| Caption (bottom) | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on near-black canopy background is excellent contrast. |

---

### frame-14 · heron-golden-light · text zone: none
SILENT — no analysis needed.

---

### frame-15 · spider-closeup-eyes · text zone: none
SILENT — no analysis needed.

---

### frame-16 · boy-canoe-bw · text zone: bottom, no gradient (B&W)
**Zone character:** Black-and-white photo of a boy in a canoe; the bottom zone is dark river water — near-black in the B&W rendering, smooth and uniform.
**Luminance:** very dark — dark river water in B&W gives a near-black bottom zone.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption italic | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on near-black B&W water reads with high contrast. The warmth of `#F5EFE0` adds a subtle tone poem against the cold B&W; intentional and effective. |

---

### frame-17 · family-stilt-house-window · text zone: bottom solid bar
**Zone character:** Text reads against `#1B3826` solid bar at 82% opacity. The photo shows a family at a stilt house window — complex architectural scene with many tones, but the bar covers this entirely.
**Luminance:** N/A — solid bar determines legibility.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption | `#F5EFE0` | ✓ USE `#F5EFE0` — warm white on Deep Canopy bar is high contrast. Safe. |

---

### frame-18 · children-football-field · text zone: none
SILENT — no analysis needed.

---

### frame-19 · two-canoe-bw · text zone: none
SILENT — no analysis needed.

---

### frame-20 · woman-heart-invitation · text zone: bottom
**Zone character:** The woman making a heart gesture (#47 on Sheet 5) is photographed on what appears to be a balcony or deck structure with a warm colorful background — the bottom zone behind the gradient will include the lower body and the structural elements below. The image has warm afternoon tones. The gradient (to-bottom, to_opacity 0.55) will apply Deep Canopy over this zone.
**Luminance:** medium-warm — the bottom zone has warm tones from the background architecture; gradient brings it to a dark anchor.

| Role | Spec color | Decision |
|------|-----------|---------|
| Caption italic | `#F5EFE0` | ✓ USE `#F5EFE0` — the gradient at 55% opacity will darken the bottom sufficiently; warm white italic caption reads cleanly. The warmth of `#F5EFE0` harmonizes with the warm tones of the scene even as the gradient darkens it. |

---

## Summary of overrides

| Frame | Role | Override |
|-------|------|---------|
| frame-02 | Caption | Conditional: hold `#F5EFE0` if gradient renders adequately; override to `#FFFFFF` if river highlights bleed through |
| frame-09 | Eyebrow | `#C4782A` → `#F5EFE0` (warm-amber background camouflages River Amber) |
| frame-10 | Caption | `#F5EFE0` → `#FFFFFF` (medium-bright green bokeh, no gradient overlay) |
| frame-12 | Caption | `#F5EFE0` → `#FFFFFF` (medium-bright green bokeh, no gradient overlay) |
