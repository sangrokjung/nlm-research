// Single Preact + htm instance shared by every module (no build step).
// Bare specifiers resolve via the import map in index.html to /vendor/*.module.js
// (vendored locally — no runtime CDN). Using hooks (not signals) keeps one instance.
export { h, render, Fragment } from "preact";
export { useState, useEffect, useRef, useMemo, useCallback } from "preact/hooks";

import { h } from "preact";
import htm from "htm";

export const html = htm.bind(h);
