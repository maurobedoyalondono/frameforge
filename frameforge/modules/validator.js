/**
 * validator.js — JSON schema validation for FrameForge projects.
 * Returns { errors: string[], warnings: string[] }
 */

export const KNOWN_LAYER_TYPES = new Set([
  'image', 'overlay', 'text', 'shape', 'stats_block', 'logo',
]);

/**
 * Validate a parsed project JSON object.
 * @param {object} data
 * @param {Set<string>} [uploadedImages] — set of uploaded filenames (for warnings)
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateProject(data, uploadedImages = new Set()) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    errors.push('Document root must be a JSON object.');
    return { errors, warnings };
  }

  // ── Top-level required keys ────────────────────────────────────────────
  for (const key of ['project', 'export', 'globals', 'frames']) {
    if (!(key in data)) {
      errors.push(`Missing required top-level key: "${key}".`);
    }
  }

  // ── image_index (optional) ────────────────────────────────────────────
  if (data.image_index != null) {
    if (!Array.isArray(data.image_index)) {
      warnings.push('"image_index" must be an array if present.');
    } else {
      data.image_index.forEach((entry, i) => {
        if (!entry.key)      warnings.push(`image_index[${i}]: missing "key" (filename).`);
        if (!entry.frame_id) warnings.push(`image_index[${i}]: missing "frame_id".`);
      });
    }
  }

  // ── custom_assets (optional) ───────────────────────────────────────────
  if (data.custom_assets != null) {
    if (!Array.isArray(data.custom_assets)) {
      warnings.push('"custom_assets" must be an array if present.');
    } else {
      data.custom_assets.forEach((asset, i) => {
        const ap = `custom_assets[${i}]`;
        if (!asset.name)    warnings.push(`${ap}: missing "name".`);
        if (!asset.viewbox) warnings.push(`${ap}: missing "viewbox".`);
        if (!asset.path_d)  warnings.push(`${ap}: missing "path_d".`);
      });
    }
  }

  if (errors.length > 0) return { errors, warnings };

  // ── project ────────────────────────────────────────────────────────────
  const project = data.project;
  if (!project || typeof project !== 'object') {
    errors.push('"project" must be an object.');
  } else {
    for (const k of ['id', 'title', 'version', 'created']) {
      if (!project[k]) errors.push(`project.${k} is required.`);
    }
  }

  // ── export ────────────────────────────────────────────────────────────
  const exp = data.export;
  if (!exp || typeof exp !== 'object') {
    errors.push('"export" must be an object.');
  } else {
    for (const k of ['target', 'width_px', 'height_px', 'dpi', 'scale_factor', 'format', 'filename_pattern']) {
      if (exp[k] == null) errors.push(`export.${k} is required.`);
    }
    if (exp.width_px <= 0)   errors.push('export.width_px must be positive.');
    if (exp.height_px <= 0)  errors.push('export.height_px must be positive.');
    if (exp.scale_factor > 3) warnings.push(`export.scale_factor=${exp.scale_factor} is large (>3); export may be slow.`);
  }

  // ── globals ───────────────────────────────────────────────────────────
  const globals = data.globals;
  if (!globals || typeof globals !== 'object') {
    errors.push('"globals" must be an object.');
  } else {
    if (!globals.background_color) warnings.push('globals.background_color not set; defaulting to #000000.');
    if (globals.font_defaults) {
      const fd = globals.font_defaults;
      if (fd.opacity != null && (fd.opacity < 0 || fd.opacity > 1)) {
        warnings.push('globals.font_defaults.opacity is outside 0–1; will be clamped.');
      }
    }
  }

  // ── frames ────────────────────────────────────────────────────────────
  const frames = data.frames;
  if (!Array.isArray(frames)) {
    errors.push('"frames" must be an array.');
    return { errors, warnings };
  }
  if (frames.length === 0) {
    errors.push('"frames" array is empty.');
    return { errors, warnings };
  }

  const frameIds = new Set();
  frames.forEach((frame, fi) => {
    const prefix = `frames[${fi}]`;

    if (!frame.id) {
      errors.push(`${prefix}: missing "id".`);
    } else {
      if (frameIds.has(frame.id)) {
        warnings.push(`${prefix}: duplicate frame id "${frame.id}".`);
      }
      frameIds.add(frame.id);
    }

    if (!frame.image_src) {
      errors.push(`${prefix}: missing "image_src".`);
    }
    // Note: image_src filename mismatch is not warned here — images are assigned
    // manually via the Image Tray drag-and-drop interface.

    // white_frame (optional)
    if (frame.white_frame !== undefined && frame.white_frame !== null) {
      const wf = frame.white_frame;
      if (typeof wf !== 'object') {
        errors.push(`${prefix}.white_frame: must be an object if present.`);
      } else {
        if (typeof wf.enabled !== 'boolean') {
          errors.push(`${prefix}.white_frame: "enabled" must be a boolean.`);
        }
        if (!Number.isInteger(wf.size_px) || wf.size_px <= 0) {
          errors.push(`${prefix}.white_frame: "size_px" must be a positive integer.`);
        }
        const knownWfKeys = new Set(['enabled', 'size_px']);
        Object.keys(wf).forEach((k) => {
          if (!knownWfKeys.has(k)) {
            warnings.push(`${prefix}.white_frame: unknown key "${k}" (ignored).`);
          }
        });
      }
    }

    if (!Array.isArray(frame.layers)) {
      errors.push(`${prefix}: "layers" must be an array.`);
      return;
    }

    const layerIds = new Set();
    frame.layers.forEach((layer, li) => {
      const lp = `${prefix}.layers[${li}]`;

      if (!layer.id) {
        errors.push(`${lp}: missing "id".`);
      } else {
        if (layerIds.has(layer.id)) {
          errors.push(`${lp}: duplicate layer id "${layer.id}" within frame "${frame.id}".`);
        }
        layerIds.add(layer.id);
      }

      if (!layer.type) {
        errors.push(`${lp}: missing "type".`);
      } else if (!KNOWN_LAYER_TYPES.has(layer.type)) {
        errors.push(`${lp}: unknown layer type "${layer.type}".`);
      }

      // Per-type checks
      validateLayer(layer, lp, warnings, uploadedImages);
    });
  });

  return { errors, warnings };
}

function validateLayer(layer, lp, warnings, uploadedImages) {
  switch (layer.type) {
    case 'image':
      if (!layer.src) warnings.push(`${lp} (image): "src" not set.`);
      // Image availability is shown in the Inspector / filmstrip status; no warning here.
      if (layer.opacity != null && (layer.opacity < 0 || layer.opacity > 1)) {
        warnings.push(`${lp} (image): opacity outside 0–1; will be clamped.`);
      }
      break;

    case 'overlay':
      if (layer.opacity != null && (layer.opacity < 0 || layer.opacity > 1)) {
        warnings.push(`${lp} (overlay): opacity outside 0–1; will be clamped.`);
      }
      if (layer.gradient?.enabled) {
        const g = layer.gradient;
        const validDirs = ['to-bottom','to-top','to-right','to-left','to-bottom-left','to-bottom-right'];
        if (!validDirs.includes(g.direction)) {
          warnings.push(`${lp} (overlay): unknown gradient direction "${g.direction}".`);
        }
      }
      break;

    case 'text':
      if (!layer.content && layer.content !== '') {
        warnings.push(`${lp} (text): "content" not set.`);
      }
      if (layer.font?.size_pct > 20) {
        warnings.push(`${lp} (text): font.size_pct=${layer.font.size_pct} is very large (>20).`);
      }
      if (layer.font?.opacity != null && (layer.font.opacity < 0 || layer.font.opacity > 1)) {
        warnings.push(`${lp} (text): font.opacity outside 0–1; will be clamped.`);
      }
      if (layer.shadow?.opacity != null && (layer.shadow.opacity < 0 || layer.shadow.opacity > 1)) {
        warnings.push(`${lp} (text): shadow.opacity outside 0–1; will be clamped.`);
      }
      break;

    case 'shape': {
      const KNOWN_SHAPES = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'polygon', 'polyline', 'path', 'image_mask'];
      if (!layer.shape) {
        warnings.push(`${lp} (shape): "shape" not set.`);
      } else if (!KNOWN_SHAPES.includes(layer.shape)) {
        warnings.push(`${lp} (shape): unknown shape "${layer.shape}". Known: ${KNOWN_SHAPES.join(', ')}.`);
      } else {
        if (layer.shape === 'triangle') {
          const validDirs = ['up', 'down', 'left', 'right'];
          if (layer.direction && !validDirs.includes(layer.direction)) {
            warnings.push(`${lp} (shape): triangle direction "${layer.direction}" unknown. Use: up/down/left/right.`);
          }
        }
        if (layer.shape === 'arrow') {
          const validHeads = ['end', 'start', 'both'];
          if (layer.arrowhead && !validHeads.includes(layer.arrowhead)) {
            warnings.push(`${lp} (shape): arrow arrowhead "${layer.arrowhead}" unknown. Use: end/start/both.`);
          }
        }
        if (layer.shape === 'polygon') {
          if (layer.sides != null && (layer.sides < 3 || layer.sides > 12)) {
            warnings.push(`${lp} (shape): polygon sides=${layer.sides} out of range (3–12).`);
          }
        }
        if (layer.shape === 'polyline') {
          if (!Array.isArray(layer.points)) {
            warnings.push(`${lp} (polyline): "points" must be an array.`);
          } else if (layer.points.length < 2) {
            warnings.push(`${lp} (polyline): "points" must have at least 2 entries (has ${layer.points.length}).`);
          }
        }
        if (layer.shape === 'path') {
          if (layer.path_pct == null) {
            warnings.push(`${lp} (path): missing "path_pct".`);
          }
        }
        if (layer.shape === 'image_mask') {
          if (!layer.asset) {
            warnings.push(`${lp} (image_mask): missing "asset" name.`);
          }
          if (!layer.dimensions?.width_pct)  warnings.push(`${lp} (image_mask): missing "dimensions.width_pct".`);
          if (!layer.dimensions?.height_pct) warnings.push(`${lp} (image_mask): missing "dimensions.height_pct".`);
          if (!layer.fill_color) {
            warnings.push(`${lp} (image_mask): missing "fill_color" — silhouette will not render.`);
          }
        }
        if (layer.fill_opacity != null && (layer.fill_opacity < 0 || layer.fill_opacity > 1)) {
          warnings.push(`${lp} (shape): fill_opacity outside 0–1; will be clamped.`);
        }
        if (layer.stroke_opacity != null && (layer.stroke_opacity < 0 || layer.stroke_opacity > 1)) {
          warnings.push(`${lp} (shape): stroke_opacity outside 0–1; will be clamped.`);
        }
      }
      break;
    }

    case 'logo':
      if (!layer.src) warnings.push(`${lp} (logo): "src" not set.`);
      else if (!uploadedImages.has(layer.src)) warnings.push(`${lp} (logo): src "${layer.src}" not yet uploaded.`);
      if (layer.opacity != null && (layer.opacity < 0 || layer.opacity > 1)) {
        warnings.push(`${lp} (logo): opacity outside 0–1; will be clamped.`);
      }
      break;

    case 'stats_block':
      if (!Array.isArray(layer.items) || layer.items.length === 0) {
        warnings.push(`${lp} (stats_block): "items" array is empty or missing.`);
      }
      break;
  }
}
