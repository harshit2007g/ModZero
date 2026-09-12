import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = import.meta.env.VITE_SITE_URL ?? "https://modzero.app";

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Per-page title, description, canonical and Open Graph tags.
 *
 * Deliberately hand-rolled rather than pulling in react-helmet: this is a
 * handful of DOM writes and the bundle is already large enough.
 */
export interface SeoInput {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  schema?: Record<string, unknown>;
}

/** Hook form — safe to call above an early return. */
export function useSeo(input: SeoInput) {
  const { pathname } = useLocation();
  const { title, description, canonicalPath, noIndex = false, schema } = input;

  useEffect(() => {
    const fullTitle = title.includes("ModZero") ? title : `${title} — ModZero`;
    const url = `${SITE}${canonicalPath ?? pathname}`;

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex,follow" : "index,follow");
    upsertLink("canonical", url);

    let scriptEl: HTMLScriptElement | null = null;
    if (schema) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.dataset.page = "true";
      scriptEl.textContent = JSON.stringify(schema);
      document.head.appendChild(scriptEl);
    }
    return () => {
      scriptEl?.remove();
    };
  }, [title, description, canonicalPath, pathname, noIndex, schema]);
}

export function Seo({
  title,
  description,
  /** Leave unset to canonicalise to the current path. */
  canonicalPath,
  /** Record pages shouldn't be indexed — they're per-ID and thin. */
  noIndex = false,
  schema,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  schema?: Record<string, unknown>;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title.includes("ModZero") ? title : `${title} — ModZero`;
    const url = `${SITE}${canonicalPath ?? pathname}`;

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex,follow" : "index,follow");
    upsertLink("canonical", url);

    let scriptEl: HTMLScriptElement | null = null;
    if (schema) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.dataset.page = "true";
      scriptEl.textContent = JSON.stringify(schema);
      document.head.appendChild(scriptEl);
    }
    return () => {
      scriptEl?.remove();
    };
  }, [title, description, canonicalPath, pathname, noIndex, schema]);

  return null;
}

/** Breadcrumb JSON-LD alongside the visible trail. */
export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}
