export type MarketNewsCategory = "FOREX" | "CRYPTO" | "STOCKS" | "COMMODITIES" | "GOLD";

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: "Investing.com" | "FXStreet";
  categories: MarketNewsCategory[];
  publishedAt: string; // ISO string
}

interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

// ------------------------------------------------------------
// Parser RSS 2.0 ringan pakai regex — sengaja nggak pakai library
// XML tambahan biar nggak nambah dependency baru di project.
// ------------------------------------------------------------

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1];
  return value.trim();
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201c")
    .replace(/&#8221;/g, "\u201d")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8230;/g, "\u2026");
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchRssFeed(url: string): Promise<RawFeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Loki4xBot/1.0; +https://4xcomunity.my.id)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 }, // cache 5 menit, cukup buat "auto-update tiap ada berita baru"
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemBlocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ?? [];

    return itemBlocks.map((block) => ({
      title: decodeEntities(stripHtml(extractTag(block, "title"))),
      link: extractTag(block, "link").trim(),
      description: decodeEntities(stripHtml(extractTag(block, "description"))).slice(0, 240),
      pubDate: extractTag(block, "pubDate").trim(),
    }));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// Kategorisasi berdasarkan kata kunci di judul + ringkasan.
// Satu berita bisa punya lebih dari satu label (misal Gold + Commodities).
// ------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<MarketNewsCategory, RegExp> = {
  GOLD: /\bgold\b|\bxau\b/i,
  CRYPTO:
    /\bcrypto|bitcoin|\bbtc\b|ethereum|\beth\b|blockchain|microstrategy|altcoin|stablecoin|\bxrp\b|dogecoin|\bsolana\b/i,
  COMMODITIES:
    /\boil\b|\bwti\b|\bbrent\b|crude|\bsilver\b|\bxag\b|\bcopper\b|natural gas|commodit|\bgrain\b|\bwheat\b|\bcorn\b/i,
  STOCKS: /\bstock|shares?\b|nasdaq|dow jones|s&p ?500|equit|earnings|\bipo\b|dividend/i,
  FOREX:
    /\busd\b|\beur\b|\bgbp\b|\bjpy\b|\baud\b|\bcad\b|\bchf\b|\bnzd\b|\bcny\b|\bmxn\b|\btry\b|\bzar\b|\bidr\b|forex|\bdollar\b|\beuro\b|\bpound\b|\byen\b|\byuan\b|rupiah|\bpeso\b|\bfranc\b|\bkrona\b|\bforint\b|\brand\b|\bwon\b|ringgit|\brupee\b/i,
};

function detectCategories(title: string, description: string, hints: MarketNewsCategory[] = []): MarketNewsCategory[] {
  const text = `${title} ${description}`;
  const found = new Set<MarketNewsCategory>(hints);

  for (const key of Object.keys(CATEGORY_KEYWORDS) as MarketNewsCategory[]) {
    if (CATEGORY_KEYWORDS[key].test(text)) found.add(key);
  }

  // Gold itu bagian dari commodities — kalau ke-tag Gold, pastikan Commodities ikut.
  if (found.has("GOLD")) found.add("COMMODITIES");

  return Array.from(found);
}

// ------------------------------------------------------------
// Sumber berita
// ------------------------------------------------------------

const INVESTING_FEEDS: { url: string; hint: MarketNewsCategory }[] = [
  { url: "https://www.investing.com/rss/news_1.rss", hint: "FOREX" }, // Forex News
  { url: "https://www.investing.com/rss/news_11.rss", hint: "COMMODITIES" }, // Commodities & Futures News
  { url: "https://www.investing.com/rss/news_25.rss", hint: "STOCKS" }, // Stock Market News
  { url: "https://www.investing.com/rss/news_301.rss", hint: "CRYPTO" }, // Cryptocurrency News
];

const FXSTREET_FEED = "https://www.fxstreet.com/news/feed";

function parseDate(pubDate: string): string {
  const parsed = new Date(pubDate);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Ambil & gabungkan berita fundamental dari Investing.com (4 kategori) dan
 * FXStreet, lalu kategorikan tiap berita ke satu atau lebih label:
 * Forex, Crypto, Stocks, Commodities, Gold.
 *
 * Di-cache 5 menit lewat Next.js fetch cache, jadi otomatis refresh sendiri
 * tanpa perlu cron terpisah — cukup reload/kunjungi halamannya.
 */
export async function getMarketNews(): Promise<MarketNewsItem[]> {
  const [investingResults, fxstreetItems] = await Promise.all([
    Promise.all(
      INVESTING_FEEDS.map(async (feed) => ({
        hint: feed.hint,
        items: await fetchRssFeed(feed.url),
      }))
    ),
    fetchRssFeed(FXSTREET_FEED),
  ]);

  const all: MarketNewsItem[] = [];
  let idx = 0;

  for (const { items, hint } of investingResults) {
    for (const item of items) {
      if (!item.title || !item.link) continue;
      all.push({
        id: `investing-${idx++}`,
        title: item.title,
        summary: item.description,
        link: item.link,
        source: "Investing.com",
        categories: detectCategories(item.title, item.description, [hint]),
        publishedAt: parseDate(item.pubDate),
      });
    }
  }

  for (const item of fxstreetItems) {
    if (!item.title || !item.link) continue;
    all.push({
      id: `fxstreet-${idx++}`,
      title: item.title,
      summary: item.description,
      link: item.link,
      source: "FXStreet",
      categories: detectCategories(item.title, item.description),
      publishedAt: parseDate(item.pubDate),
    });
  }

  const seenLinks = new Set<string>();
  const deduped = all.filter((item) => {
    if (seenLinks.has(item.link)) return false;
    seenLinks.add(item.link);
    return true;
  });

  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return deduped.slice(0, 80);
}
