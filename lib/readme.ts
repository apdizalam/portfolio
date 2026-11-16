import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const isAbsolute = (u: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const clean = (u: string) => u.replace(/^\.\//, "").replace(/^\//, "");

function slug(text: string) {
  return text.trim().toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

/** Fetch a GitHub README and return safe HTML with links/images fixed to point at GitHub. */
export async function renderReadme(repoPath: string): Promise<string | null> {
  if (!repoPath) return null;
  const rawBase = `https://raw.githubusercontent.com/${repoPath}/HEAD/`;
  const blobBase = `https://github.com/${repoPath}/blob/HEAD/`;

  let md: string | null = null;
  try {
    const r = await fetch(rawBase + "README.md", { next: { revalidate: 3600 } });
    if (r.ok) md = await r.text();
  } catch {}
  if (md == null) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repoPath}/readme`, {
        headers: { Accept: "application/vnd.github.raw" },
        next: { revalidate: 3600 },
      });
      if (r.ok) md = await r.text();
    } catch {}
  }
  if (md == null) return null;

  const html = await marked.parse(md, { gfm: true });
  const seen: Record<string, number> = {};

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "details", "summary", "picture", "source", "kbd", "sup", "sub", "del", "input",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "align", "loading"],
      source: ["srcset", "media", "type"],
      div: ["align"], p: ["align"], h1: ["align", "id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      td: ["align"], th: ["align"], input: ["type", "checked", "disabled"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      img: (tag, attribs) => {
        const src = attribs.src || "";
        return { tagName: "img", attribs: { ...attribs, src: src && !isAbsolute(src) ? rawBase + clean(src) : src, loading: "lazy" } };
      },
      source: (tag, attribs) => {
        const s = attribs.srcset || "";
        return { tagName: "source", attribs: { ...attribs, srcset: s && !isAbsolute(s) ? rawBase + clean(s) : s } };
      },
      a: (tag, attribs) => {
        const href = attribs.href || "";
        if (href.startsWith("#")) return { tagName: "a", attribs: { href } as Record<string, string> };
        return {
          tagName: "a",
          attribs: { href: href && !isAbsolute(href) ? blobBase + clean(href) : href, target: "_blank", rel: "noopener" } as Record<string, string>,
        };
      },
    },
  })
  // give headings GitHub-style ids so the README's "Contents" links work
  .replace(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/g, (_m, tag, attrs, inner) => {
    let id = slug(inner);
    if (seen[id] !== undefined) id += "-" + ++seen[id];
    else seen[id] = 0;
    return `<${tag}${attrs.replace(/\sid="[^"]*"/, "")} id="${id}">${inner}</${tag}>`;
  });
}
