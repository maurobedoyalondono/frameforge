# Amazonía — Concept Template

## Series

- **Title:** Amazonía
- **Project ID:** `the-amazon`
- **Platform:** Instagram Portrait 4:5 — 1080 × 1350 px, 72 DPI, scale_factor 2
- **Frames:** 20
- **Narrative arc:** Opening aerial → Act I: River & Jungle → Act II: Wildlife → Act III: People & Community → Closing invitation

---

## Color Palette

| Name | Hex | Role |
|------|-----|------|
| Deep Canopy | `#1B3826` | Primary overlay — gradients, solid bars, shape anchors. Old-growth forest shadow, warm not cold. |
| River Amber | `#C4782A` | Eyebrows and species labels. Color of golden-hour river light. Never used in headlines or body copy. |
| Sage Canopy | `#7B9E87` | Secondary overlay — light gradient moments in brighter frames where Deep Canopy is too heavy. |

**Text color:** `#F5EFE0` — warm near-white for all headline and caption text.

---

## Type System

| Role | Family | Usage |
|------|--------|-------|
| Display | `Fraunces` | Opening title, italic captions (Act III pivot frame, closing frame). Weight 300. |
| Sans-serif | `DM Sans` | All eyebrows, act markers, captions. Weight 400. |

**Size scale (size_pct):**
- Display headline: 9.5
- Caption italic (closing): 3.0
- Caption: 2.5
- Eyebrow: 1.8

**Numeral rule:** DM Sans only for any numeric content. Fraunces prohibited for numbers.

---

## Application Rules

- Gradient color: `#1B3826` (Deep Canopy) on frames with smooth background in text zone
- Solid bar color: `#1B3826` at 82% opacity on frames with noisy or complex background in text zone
- Eyebrow color: `#C4782A` (River Amber) on all frames
- Text color: `#F5EFE0` on all text layers
- Gradient direction matches text zone: bottom text → `to-bottom`; top text → `to-top`
- Italic Fraunces reserved exclusively for frames 16 and 20 — signals the emotional register shift of the human acts and the series close
- Wildlife frames 9–13: eyebrow (species name) + caption (interesting biological fact). No gradient — natural backgrounds provide contrast.
- Silent frames (4, 7, 14, 15, 18, 19): image only, no intervention of any kind

---

## Frame Reference

### frame-01 · aerial-amazon-river · Sheet 5 · #46 · dji_fly_20260228_131446_0609_1772316071531_photo.jpg

**Status:** Text — Eyebrow + headline · top zone
**Gradient:** to-top · from_opacity 0.0 at 65% · to_opacity 0.50 at 0%
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `AMAZONÍA · COLOMBIA` |
| Headline | top-left, offset_x 6, offset_y 11 | Fraunces wt 300 | 9.5 | `Amazonía` |

---

### frame-02 · aerial-river-descent · Sheet 5 · #45 · dji_fly_20260228_131208_0599_1772316094210_photo.jpg

**Status:** Text — Caption · bottom zone
**Gradient:** to-bottom · from_opacity 0.0 at 78% · to_opacity 0.55 at 100%
**Focal point:** x_pct 50, y_pct 50

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Un mes en la Amazonia colombiana.` |

---

### frame-03 · canoe-interior-river-view · Sheet 5 · #48 · IMG_9464.jpg

**Status:** Text — Caption · natural dark zone (no gradient)
**Gradient:** None — dark canoe interior provides natural contrast
**Focal point:** x_pct 50, y_pct 40

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `El río: única vía de entrada y salida.` |

---

### frame-04 · canoe-dusk-silhouette · Sheet 4 · #38 · CC2A8728.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 55

Image only. Cinematically complete — silence is the deliberate treatment.

---

### frame-05 · canoes-water-hyacinths · Sheet 1 · #2 · CC2A0134.jpg

**Status:** Text — Caption · solid bar bottom (noisy water and plant texture background)
**Gradient:** None — solid bar replaces gradient; textured surface would defeat a gradient
**Focal point:** x_pct 50, y_pct 50

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom bar, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `En la Amazonia, la canoa reemplaza al auto.` |

---

### frame-06 · jungle-canopy-vertical · Sheet 3 · #22 · CC2A5184.jpg

**Status:** Text — Caption · solid bar bottom (dense vertical foliage, extremely noisy)
**Gradient:** None — solid bar replaces gradient; vertical canopy texture would defeat a gradient
**Focal point:** x_pct 50, y_pct 40

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom bar, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `El dosel amazónico supera los 30 metros de altura.` |

---

### frame-07 · buttress-roots-closeup · Sheet 3 · #26 · CC2A6056.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 55

Image only. Act I closes in silence.

---

### frame-08 · yellow-tree-frog · Sheet 5 · #42 · CC2A9805.jpg

**Status:** Text — Eyebrow + caption · solid bar bottom (Act II chapter marker; saturated subject, textured foliage)
**Gradient:** None — solid bar; foliage texture and vivid frog color require a clean treatment
**Focal point:** x_pct 50, y_pct 50

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | bottom bar, offset_x 6, offset_y above caption | DM Sans wt 400 | 1.8 | `FAUNA` |
| Caption | bottom bar, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `La Amazonia alberga el 10% de la vida silvestre del planeta.` |

---

### frame-09 · howler-monkey-portrait · Sheet 1 · #4 · CC2A0442.jpg

**Status:** Text — Eyebrow + caption · no gradient (dark jungle background provides contrast)
**Gradient:** None — naturally dark background
**Focal point:** x_pct 50, y_pct 40

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `MONO AULLADOR` |
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Su rugido se escucha a 5 km de distancia.` |

---

### frame-10 · squirrel-monkey-branch · Sheet 1 · #6 · CC2A0551.jpg

**Status:** Text — Eyebrow + caption · no gradient (out-of-focus foliage provides contrast)
**Gradient:** None — soft bokeh background
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `MONO ARDILLA` |
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Vive en grupos de hasta 300 individuos.` |

---

### frame-11 · hoatzin-perched · Sheet 3 · #27 · CC2A6358.jpg

**Status:** Text — Eyebrow + caption · no gradient (foliage background provides contrast)
**Gradient:** None — natural background contrast
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `HOATZÍN` |
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Sus crías nacen con garras en las alas.` |

---

### frame-12 · kingfisher-amazon · Sheet 2 · #13 · CC2A4344.jpg

**Status:** Text — Eyebrow + caption · no gradient (soft-focus foliage provides contrast)
**Gradient:** None — soft bokeh background
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `MARTÍN PESCADOR` |
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Caza en picado a más de 40 km/h.` |

---

### frame-13 · trogon-red-black · Sheet 3 · #24 · CC2A5494.jpg

**Status:** Text — Eyebrow + caption · no gradient (dark canopy background provides contrast)
**Gradient:** None — naturally dark canopy
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Eyebrow | top-left, offset_x 6, offset_y 7 | DM Sans wt 400 | 1.8 | `TROGÓN` |
| Caption | bottom-left, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Solo habita en selva primaria no intervenida.` |

---

### frame-14 · heron-golden-light · Sheet 3 · #30 · CC2A6998.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 50

Image only. Painterly golden-light quality — naming shifts register from mood to nature guide.

---

### frame-15 · spider-closeup-eyes · Sheet 1 · #9 · CC2A1030.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 50

Image only. Act II closes on discomfort; no label defuses it.

---

### frame-16 · boy-canoe-bw · Sheet 1 · #1 · CC2A0036.jpg

**Status:** Text — Caption italic · natural dark zone (Act III pivot)
**Gradient:** None — dark river water provides natural contrast
**Focal point:** x_pct 50, y_pct 40

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom-left, offset_x 6, offset_y -6 | Fraunces italic wt 300 | 2.5 | `Este es el hogar.` |

---

### frame-17 · family-stilt-house-window · Sheet 2 · #11 · CC2A3875.jpg

**Status:** Text — Caption · solid bar bottom (complex architectural scene)
**Gradient:** None — solid bar; window, wall, and family create a noisy background
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom bar, offset_x 6, offset_y -6 | DM Sans wt 400 | 2.5 | `Casas palafíticas: construidas para sobrevivir las crecidas del río.` |

---

### frame-18 · children-football-field · Sheet 1 · #10 · CC2A1085.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 50

Image only. Joy needs no annotation.

---

### frame-19 · two-canoe-bw · Sheet 2 · #19 · CC2A4844.jpg

**Status:** Silent — no overlay, no text, no shapes
**Focal point:** x_pct 50, y_pct 50

Image only. Visual echo of frame-04 and frame-16; the chord is the meaning.

---

### frame-20 · woman-heart-invitation · Sheet 5 · #47 · IMG_9302.jpg

**Status:** Text — Caption italic · bottom zone (series close)
**Gradient:** to-bottom · from_opacity 0.0 at 72% · to_opacity 0.55 at 100%
**Focal point:** x_pct 50, y_pct 45

| Layer | Zone | Font | size_pct | Content |
|-------|------|------|----------|---------|
| Caption | bottom-left, offset_x 6, offset_y -6 | Fraunces italic wt 300 | 3.0 | `Ven a la Amazonia.` |
