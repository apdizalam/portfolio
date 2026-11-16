import "server-only";
import { marked, type Token, type TokensList } from "marked";
import sanitizeHtml from "sanitize-html";

export type GalleryImage = { src: string; alt: string };
export type GalleryGroup = { title: string; images: GalleryImage[] };
export type ProjectReadme = {
  overview: string;        // safe HTML: intro + "how it works" / "overview" sections
  features: string;        // safe HTML: "features" section (shown collapsed)
  groups: GalleryGroup[];  // screenshots, grouped by their README sub-heading
};

// Sections we show. Everything else (setup, API, architecture, structure…) is left on GitHub.
const OVERVIEW_RE = /^(overview|about|introduction|intro|how it works|what it does|summary|description)\b/i;
const FEATURES_RE = /^(key )?features?\b|highlights/i;
const SCREENSHOTS_RE = /screenshots?|gallery|preview|demo|ui\b|pages/i;
// Images that are not screenshots
const NOT_SCREENSHOT_RE = /shields\.io|badge|skillicons|readme-typing|komarev|github-readme-stats|\/logo|logo\.|-logo|icon|avatar|favicon/i;

const isAbsolute = (u: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const clean = (u: string) => u.replace(/^\.\//, "").replace(/^\//, "");

async function fetchReadme(repoPath: string): Promise<string | null> {
  const opts = { next: { revalidate: 3600 } } as RequestInit;
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${repoPath}/HEAD/README.md`, opts);
    if (r.ok) return await r.text();
  } catch {}
  try {
    const r = await fetch(`https://api.github.com/repos/${repoPath}/readme`, {
      ...opts,
      headers: { Accept: "application/vnd.github.raw" },
    });
    if (r.ok) return await r.text();
  } catch {}
  return null;
}

function findImages(raw: string, rawBase: string): GalleryImage[] {
  const out: GalleryImage[] = [];
  const md = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  const html = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = md.exec(raw))) out.push({ alt: m[1], src: m[2] });
  while ((m = html.exec(raw))) {
    const tag = m[0];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || "";
    if (src) out.push({ src, alt });
  }
  return out
    .filter((i) => !NOT_SCREENSHOT_RE.test(i.src) && !/\blogo\b/i.test(i.alt))
    .map((i) => ({ alt: i.alt.trim(), src: isAbsolute(i.src) ? i.src : rawBase + clean(i.src) }))
    .filter((i) => /^https:\/\//.test(i.src));
}

function toSafeHtml(tokens: Token[], links: TokensList["links"], blobBase: string) {
  if (!tokens.length) return "";
  const list = Object.assign([...tokens], { links }) as TokensList;
  const html = marked.parser(list, { gfm: true });
  const safe = sanitizeHtml(html, {
    // pictures live in the gallery, so the text keeps no images
    allowedTags: ["p", "br", "strong", "b", "em", "i", "code", "pre", "ul", "ol", "li", "blockquote", "a", "h3", "h4", "hr", "span", "del", "kbd"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tag, attribs) => {
        const href = attribs.href || "";
        // links to removed README sections become plain text
        if (!href || href.startsWith("#")) return { tagName: "span", attribs: {} as Record<string, string> };
        return {
          tagName: "a",
          attribs: { href: isAbsolute(href) ? href : blobBase + clean(href), target: "_blank", rel: "noopener" } as Record<string, string>,
        };
      },
    },
    exclusiveFilter: (frame) => ["p", "span", "li"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length,
  });
  return safe.replace(/(<p>\s*<\/p>|<span>\s*<\/span>)/g, "").trim();
}

/** Overview text + screenshot gallery from a GitHub README (setup/API/architecture left out). */
export async function getProjectReadme(repoPath: string): Promise<ProjectReadme | null> {
  if (!repoPath) return null;
  const md = await fetchReadme(repoPath);
  if (md == null) return null;

  const rawBase = `https://raw.githubusercontent.com/${repoPath}/HEAD/`;
  const blobBase = `https://github.com/${repoPath}/blob/HEAD/`;
  const tokens = marked.lexer(md, { gfm: true });

  const overview: Token[] = [];
  const features: Token[] = [];
  const groups = new Map<string, GalleryImage[]>();   // from the Screenshots section
  const extra: GalleryImage[] = [];                    // pictures found elsewhere (intro, features)
  const addImages = (group: string | null, raw: string) => {
    const found = findImages(raw, rawBase);
    if (group === null) return void extra.push(...found);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(...found);
  };

  let section = "";        // current "## " heading ("" = intro before the first one)
  let sub = "";            // current "### " heading inside it
  for (const t of tokens) {
    if (t.type === "heading") {
      const text = (t as { text: string }).text.replace(/<[^>]+>/g, "").trim();
      if (t.depth === 1) continue;           // the project title is already on the page
      if (t.depth === 2) { section = text; sub = ""; continue; }
      sub = text;
    }

    const inScreens = SCREENSHOTS_RE.test(section);
    if (inScreens) addImages(sub || "Screenshots", t.raw);
    else if (!section || OVERVIEW_RE.test(section) || FEATURES_RE.test(section)) addImages(null, t.raw);

    if (inScreens) continue;
    // diagrams / code are technical details: leave them on GitHub
    if (t.type === "code") continue;
    if (!section || OVERVIEW_RE.test(section)) overview.push(t);
    else if (FEATURES_RE.test(section)) features.push(t);
  }

  // Remove duplicates, then put pictures from the intro into the first group.
  const seen = new Set<string>();
  const dedupe = (list: GalleryImage[]) => list.filter((i) => (seen.has(i.src) ? false : (seen.add(i.src), true)));
  const ordered: GalleryGroup[] = [...groups.entries()]
    .map(([title, images]) => ({ title, images: dedupe(images) }))
    .filter((g) => g.images.length);
  const rest = dedupe(extra);
  if (rest.length) {
    if (ordered.length) ordered[0].images.unshift(...rest);
    else ordered.push({ title: "Screenshots", images: rest });
  }

  return {
    overview: toSafeHtml(overview, tokens.links, blobBase),
    features: toSafeHtml(features, tokens.links, blobBase),
    groups: ordered,
  };
}
