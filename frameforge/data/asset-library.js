/**
 * asset-library.js — Built-in silhouette asset library for FrameForge.
 *
 * Each asset has:
 *   viewbox   — SVG viewBox string the path was authored in (e.g. "0 0 100 100")
 *   path_d    — raw SVG path `d` string in the asset's own coordinate space
 *   description — human-readable note for the Inspector tooltip
 *
 * The renderer scales path_d coordinates from viewbox space to target
 * canvas dimensions at render time using Path2D + ctx.scale().
 *
 * Custom project assets (project.data.custom_assets) use the same structure
 * and are checked before this library when resolving an asset name.
 */

export const ASSET_LIBRARY = {
  'frailejón': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 Q 70 8 72 22 Q 78 38 65 48 Q 58 54 53 50 L 53 100 L 47 100 L 47 50 Q 42 54 35 48 Q 22 38 28 22 Q 30 8 50 5 Z',
    description: 'Espeletia — tall stem with dense rosette crown (Colombian páramo)',
  },
  'pine-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 L 82 68 L 62 68 L 62 80 L 80 80 L 94 100 L 6 100 L 20 80 L 38 80 L 38 68 L 18 68 Z',
    description: 'Conifer — classic triangular layered silhouette',
  },
  'deciduous-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 Q 92 5 92 42 Q 92 78 50 78 Q 8 78 8 42 Q 8 5 50 5 Z M 44 78 L 44 100 L 56 100 L 56 78 Z',
    description: 'Rounded canopy tree with trunk',
  },
  'mountain-peak': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 L 95 95 L 5 95 Z',
    description: 'Single angular mountain peak',
  },
  'mountain-range': {
    viewbox: '0 0 100 100',
    path_d: 'M 0 100 L 0 92 L 22 18 L 42 58 L 62 8 L 80 48 L 100 14 L 100 100 Z',
    description: 'Three-peak horizon line',
  },
  'cactus': {
    viewbox: '0 0 100 100',
    path_d: 'M 44 100 L 44 58 L 26 58 L 26 28 L 44 28 L 44 15 L 56 15 L 56 28 L 74 28 L 74 58 L 56 58 L 56 100 Z',
    description: 'Branching columnar cactus',
  },
  'grass-tuft': {
    viewbox: '0 0 100 100',
    path_d: 'M 8 90 Q 2 58 12 32 Q 20 60 18 90 Z M 26 90 Q 20 52 32 22 Q 40 54 36 90 Z M 50 90 Q 46 42 54 12 Q 62 44 58 90 Z M 72 90 Q 66 52 76 22 Q 84 54 80 90 Z M 90 90 Q 84 58 92 32 Q 100 60 96 90 Z',
    description: 'Low ground-level grass cluster — five blades',
  },
  'bird-in-flight': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 44 Q 32 26 8 38 Q 18 42 28 46 Q 38 43 45 52 L 50 48 L 55 52 Q 62 43 72 46 Q 82 42 92 38 Q 68 26 50 44 Z M 46 52 Q 48 64 50 60 Q 52 64 54 52 Q 52 58 50 56 Q 48 58 46 52 Z',
    description: 'Simplified bird, wings spread in flight',
  },
  'cyclist': {
    viewbox: '0 0 100 100',
    path_d: 'M 52 4 Q 60 4 60 12 Q 60 20 52 20 Q 44 20 44 12 Q 44 4 52 4 Z M 44 20 L 30 52 Q 14 52 14 68 Q 14 84 30 84 Q 44 84 46 70 L 52 56 L 56 70 Q 58 84 72 84 Q 88 84 88 68 Q 88 52 72 52 L 60 20 Z',
    description: 'Simplified rider on bike — head, body, two wheels',
  },
  'person-standing': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 4 Q 60 4 60 14 Q 60 24 50 24 Q 40 24 40 14 Q 40 4 50 4 Z M 38 24 L 36 58 L 26 96 L 38 96 L 46 65 L 54 65 L 62 96 L 74 96 L 64 58 L 62 24 Z',
    description: 'Generic standing human figure',
  },
  'road-sign-post': {
    viewbox: '0 0 100 100',
    path_d: 'M 44 100 L 44 46 L 4 46 L 4 8 L 96 8 L 96 46 L 56 46 L 56 100 Z',
    description: 'Vertical post with rectangular panel — milestone, wayfinding',
  },
  'wave': {
    viewbox: '0 0 100 100',
    path_d: 'M 0 52 Q 12 22 26 44 Q 40 66 54 38 Q 68 10 80 36 Q 90 56 100 40 L 100 100 L 0 100 Z',
    description: 'Single rolling ocean wave',
  },
  'palm-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 46 100 Q 42 72 38 48 Q 16 34 2 40 Q 16 44 28 52 Q 36 46 40 44 L 36 26 Q 42 36 42 46 L 40 18 Q 46 30 46 45 L 48 10 Q 52 30 52 45 L 60 18 Q 56 32 54 46 L 62 44 Q 72 50 86 46 Q 98 40 96 34 Q 80 28 60 44 Q 56 46 54 48 Q 58 72 54 100 Z',
    description: 'Tropical palm silhouette',
  },
  'condor': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 38 Q 30 20 4 34 Q 14 38 24 42 Q 34 40 42 50 Q 46 46 50 50 Q 54 46 58 50 Q 66 40 76 42 Q 86 38 96 34 Q 70 20 50 38 Z M 44 50 Q 48 64 50 60 Q 52 64 56 50 Q 52 56 50 54 Q 48 56 44 50 Z',
    description: 'Large soaring bird, wide wingspan — Andean condor',
  },
};
