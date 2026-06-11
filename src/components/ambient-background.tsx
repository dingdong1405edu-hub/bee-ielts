/**
 * Decorative page background — intentionally EMPTY.
 *
 * The honeycomb "tổ ong" grid watermark + leaf scatter (and earlier the brand
 * glow blobs) were all removed so the main learning section is a clean, flat,
 * minimal white surface — per user request: "bỏ hết nền lưới ngũ giác, để
 * trắng cho tối giản". Kept as a no-op component so existing mounts
 * (LearnBackground / LandingBackground) don't need to change.
 */
export function AmbientBackground() {
  return null;
}
