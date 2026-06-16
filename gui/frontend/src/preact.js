// Single pinned Preact + htm instance shared by every module (no build step).
// Using hooks (not signals) keeps everything on one Preact instance via esm.sh.
export { h, render, Fragment } from "https://esm.sh/preact@10.19.3";
export { useState, useEffect, useRef, useMemo, useCallback } from "https://esm.sh/preact@10.19.3/hooks";

import { h } from "https://esm.sh/preact@10.19.3";
import htm from "https://esm.sh/htm@3.1.1";

export const html = htm.bind(h);
