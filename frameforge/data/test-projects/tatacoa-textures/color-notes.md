# Color Notes — Tatacoa Textures

## Palette reference

| Hex | Name | Role | Safe zones | Risk zones |
|-----|------|------|------------|------------|
| `#5C6B74` | Dusty slate | Overlay only | All frames (never in text) | N/A |
| `#E0D8CE` | Ash white | All text | Dark bottom zones with ≥0.60 gradient | Top zones without gradient protection; warm ochre/sky backgrounds |
| `#B85530` | Terracotta | Shape accents only | Decorative shapes (never text) | N/A |

**Single text color across series.** All overrides replace `#E0D8CE` with `#FFFFFF`. The risk pattern is consistent: unprotected top-zone layers (eyebrows) and warm-background top zones where the gradient does not reach.

---

## Per-frame color guide

### frame-01 · wide-canyon-overview · text zones: top-left (eyebrow) + bottom-left (headline + caption)

**Zone character — top-left eyebrow:** Blue-grey sky with warm amber horizon glow at top-left of the wide canyon shot. No gradient coverage (gradient is to-bottom). Medium-light luminance.
**Luminance (eyebrow zone):** medium-light

**Zone character — bottom zone:** Flat sandy terrain leading into the canyon. Covered by to-bottom gradient at 0.65 opacity. Effectively dark after darkening.
**Luminance (bottom zone after gradient):** dark

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow | `#E0D8CE` | ⚠ OVERRIDE → #FFFFFF — sky at top-left is medium-light; warm cream has insufficient luminance contrast against lighter sky tones; eyebrow at size_pct 1.8 is the highest-risk layer in this frame |
| Headline | `#E0D8CE` | ✓ USE #E0D8CE — 0.65 gradient darkens sandy foreground well below readable threshold |
| Caption | `#E0D8CE` | ✓ USE #E0D8CE — same darkened bottom zone; two-sentence caption at 2.5 pct reads cleanly |

---

### frame-02 · eroded-channels-closeup

SILENT — no analysis needed.

---

### frame-03 · columnar-formations · text zone: top-left (headline)

**Zone character:** Warm reddish-ochre formation tops and/or sky at upper frame. The to-top gradient at 0.55 provides partial coverage: at offset_y 7% (headline position), effective overlay opacity ≈ 0.48, leaving the background at approximately medium luminance (~54%). Hue similarity between warm ochre rock and `#E0D8CE` cream further reduces perceptual contrast.
**Luminance (headline zone after gradient):** medium

| Role | Spec color | Decision |
|------|-----------|---------|
| Headline | `#E0D8CE` | ⚠ OVERRIDE → #FFFFFF — to-top gradient only partially darkens at the headline position; warm cream against warm ochre/sky at medium luminance fails the 3:1 large-text contrast threshold; #FFFFFF at 1.0 opacity passes cleanly |

---

### frame-04 · mesa-formation

SILENT — no analysis needed.

---

### frame-05 · cacti-canyon-wall · text zone: bottom-left (headline + caption)

**Zone character:** Canyon floor and lower cactus base area. Earthy reddish-brown tones. Covered by to-bottom gradient at 0.65 opacity.
**Luminance (bottom zone after gradient):** dark

| Role | Spec color | Decision |
|------|-----------|---------|
| Headline | `#E0D8CE` | ✓ USE #E0D8CE — 0.65 gradient darkens the earthy canyon floor; no hue conflict; warm cream reads well against darkened earth |
| Caption | `#E0D8CE` | ✓ USE #E0D8CE — same zone; single-sentence caption sits comfortably in darkened area |

---

### frame-06 · barrel-cactus-bloom · text zone: bottom-left (headline)

**Zone character:** Desert background and lower cactus body behind the barrel cactus. Warm earthy tones at base. Strong gradient at 0.68 opacity.
**Luminance (bottom zone after gradient):** dark

| Role | Spec color | Decision |
|------|-----------|---------|
| Headline | `#E0D8CE` | ✓ USE #E0D8CE — 0.68 gradient is the strongest in the series; bottom zone well-darkened; no conflict with the bloom (bloom is upper frame, well above the headline) |

---

### frame-07 · burrowing-owls · text zone: bottom-left (headline + caption)

**Zone character:** Blurred warm golden-brown grass in foreground. The owls occupy the mid-frame; the lower blurred grass is the text zone. Gradient at 0.65 opacity.
**Luminance (bottom zone after gradient):** dark

| Role | Spec color | Decision |
|------|-----------|---------|
| Headline | `#E0D8CE` | ✓ USE #E0D8CE — gradient darkens the warm grass foreground; warm cream reads cleanly; no hue conflict after darkening |
| Caption | `#E0D8CE` | ✓ USE #E0D8CE — same zone; two-sentence caption fits within darkened blurred foreground |

---

### frame-08 · desert-road · text zones: top-right (eyebrow) + bottom-left (headline)

**Zone character — top-right eyebrow:** Hazy blue-grey sky in the wide landscape shot. No gradient coverage (gradient is to-bottom). Medium-light luminance, cool-neutral hue.
**Luminance (eyebrow zone):** medium-light

**Zone character — bottom zone:** Dark road surface and earth tones. Covered by to-bottom gradient at 0.60 opacity.
**Luminance (bottom zone after gradient):** dark

| Role | Spec color | Decision |
|------|-----------|---------|
| Eyebrow | `#E0D8CE` | ⚠ OVERRIDE → #FFFFFF — hazy sky at top-right is medium-light; warm cream insufficient contrast against the cool-grey sky without gradient support; eyebrow at size_pct 1.8 requires maximum legibility |
| Headline | `#E0D8CE` | ✓ USE #E0D8CE — 0.60 gradient darkens road and earth tones; wide headline CAMINO DEL DESIERTO reads cleanly |
