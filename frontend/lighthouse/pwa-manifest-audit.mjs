import { Audit } from "lighthouse";
import { pwaAuditResult } from "./pwa-audit-result.mjs";

const DISPLAY_MODES = new Set(["fullscreen", "standalone", "minimal-ui"]);

/**
 * Recreates the removed `installable-manifest` audit: manifest fields, icon
 * sizes, icon availability and theme color must match the browser criteria.
 */
class PwaManifest extends Audit {
  static get meta() {
    return {
      id: "pwa-manifest",
      title: "Web app manifest meets installability requirements",
      failureTitle: "Web app manifest is missing installability requirements",
      description:
        "The manifest must expose a name, a start URL, a standalone display mode, 192px and 512px icons, and a theme color matching the page.",
      requiredArtifacts: ["PwaSnapshot"],
    };
  }

  static audit(artifacts) {
    const snapshot = artifacts.PwaSnapshot;
    const manifest = snapshot.manifest;
    const checks = [
      {
        name: "Valid manifest linked from the page",
        ok: Boolean(manifest) && !snapshot.manifestError,
        detail: snapshot.manifestError ?? undefined,
      },
    ];

    if (manifest) {
      checks.push(
        {
          name: "name or short_name is present",
          ok: Boolean(manifest.name || manifest.short_name),
        },
        {
          name: "start_url is present",
          ok: typeof manifest.start_url === "string" && manifest.start_url.length > 0,
        },
        {
          name: "display is an app-like mode",
          ok: DISPLAY_MODES.has(manifest.display),
          detail: String(manifest.display ?? "missing"),
        },
        {
          name: "prefer_related_applications is not true",
          ok: manifest.prefer_related_applications !== true,
        },
      );

      const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
      const sizes = new Set(icons.flatMap((icon) => String(icon.sizes ?? "").split(/\s+/)));
      checks.push({
        name: "192px and 512px icons are declared",
        ok: sizes.has("192x192") && sizes.has("512x512"),
      });

      const reachable = snapshot.icons.filter((icon) => icon.ok).length;
      checks.push({
        name: "Declared icons are served",
        ok: snapshot.icons.length > 0 && reachable === snapshot.icons.length,
        detail: `${reachable}/${snapshot.icons.length} reachable`,
      });

      checks.push({
        name: "theme-color matches the manifest",
        ok:
          Boolean(snapshot.themeColor) &&
          snapshot.themeColor.toLowerCase() === String(manifest.theme_color ?? "").toLowerCase(),
        detail: snapshot.themeColor ?? "missing",
      });
    }

    return pwaAuditResult(checks);
  }
}

export default PwaManifest;
