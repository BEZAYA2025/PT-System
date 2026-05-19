// Twitter card image reuses the same generator as the OG image —
// Twitter renders summary_large_image at the same 1200×630 aspect,
// so we don't need a separate visual.
//
// `runtime` has to be declared inline here (not re-exported) because
// Turbopack statically parses route-segment config and can't follow
// the re-export. Default + metadata fields re-export from
// opengraph-image cleanly.

export const runtime = "edge";

export {
  default,
  alt,
  size,
  contentType,
} from "./opengraph-image";
