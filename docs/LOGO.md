# MatEx Project Logo

This document explains how to use the project logo (`matex_logo.png`) consistently across the project, following the repository's `project_rules.md` guidelines.

Guidelines
- Keep the logo file canonical and single-sourced at the repository root (`/matex_logo.png`).
- Do not hardcode presentation values into components — sizes, alt text and placement should be parameterised where possible.
- Provide accessible alt text for all instances: `alt="MatEx — materials exchange logo"`.
- Prefer PNG / WebP for raster assets. Provide multiple sizes for responsive use (recommended: 32px, 64px, 128px, 256px, 512px).

Suggested file locations & usage
- For a Next.js project, copy `matex_logo.png` into the `public/` directory and reference it via `/matex_logo.png` in markup or Next/Image.
- Example (React/Next):

```tsx
// Example component snippet
import Image from 'next/image'

export function Logo({ size = 64 }: { size?: number }) {
  return <Image src="/matex_logo.png" alt="MatEx — materials exchange logo" width={size} height={size} />
}
```

Favicon
- Generate a `favicon.ico` (or WebManifest icons) from the logo at an appropriate size (48–64px square source recommended) and add to `public/favicon.ico`.

Branding policy (short)
- Keep the brand colours and T&Cs/version references configurable (do not hardcode in UI). Prefer reading brand values from a `branding` key in `app_settings` or environment variables for compile-time assets.
- Document any change to the logo file and update `docs/LOGO.md` with the change reason and date.

Accessibility & performance
- Provide properly sized images (avoid shipping a 2k PNG for a 32px avatar).
- Consider WebP alternatives for better compression and a small fallback for older browsers.

Examples & preview
- See `public/logo_preview.html` for a minimal static preview page that shows the logo at several sizes.

License
- Keep logo and branding files under the repository license. If you intend to reuse or publish the logo externally, note any trademark or reuse policy here.

---
Generated as a low-risk doc to follow `project_rules.md` branding guidance.
