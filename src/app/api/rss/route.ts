import FirecrawlApp from '@mendable/firecrawl-js';
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
const parser = new Parser();

const SCRAPE_SOURCES = [
  { url: 'https://www.reuters.com/markets/', name: 'Reuters US', region: 'US' },
  { url: 'https://www.cnbc.com/markets/', name: 'CNBC', region: 'US' },
  { url: 'https://finance.yahoo.com/topic/stock-market-news/', name: 'Yahoo Finance', region: 'US' },
  { url: 'https://www.marketwatch.com/latest-news', name: 'MarketWatch', region: 'US' },
  { url: 'https://seekingalpha.com/market-news', name: 'Seeking Alpha', region: 'US' },
  { url: 'https://www.ft.com/markets', name: 'FT Markets', region: 'Europe' },
  { url: 'https://www.ft.com/world/europe', name: 'FT Europe', region: 'Europe' },
  { url: 'https://www.reuters.com/world/europe/', name: 'Reuters Europe', region: 'Europe' },
  { url: 'https://www.euronews.com/business', name: 'Euronews', region: 'Europe' },
  { url: 'https://asia.nikkei.com/Markets', name: 'Nikkei Asia', region: 'Asia' },
  { url: 'https://www.scmp.com/business/markets', name: 'SCMP', region: 'Asia' },
  { url: 'https://www.reuters.com/world/asia-pacific/', name: 'Reuters Asia', region: 'Asia' },
  { url: 'https://www.channelnewsasia.com/business', name: 'CNA Business', region: 'Asia' },
  { url: 'https://www.businesstimes.com.sg/markets', name: 'Business Times SG', region: 'Asia' },
];

const RSS_FALLBACK = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', region: 'US' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories', region: 'US' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', region: 'US' },
  { url: 'https://finance.yahoo.com/rss/topfinstories', region: 'US' },
  { url: 'https://www.ft.com/rss/home/uk', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/UKdomesticNews', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/asiaTopNews', region: 'Asia' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', region: 'Asia' },
  { url: 'https://www.scmp.com/rss/2/feed', region: 'Asia' },
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395884', region: 'Asia' },
];

function isRealHeadline(line: string): boolean {
  if (line.length < 40 || line.length > 250) return false;
  if (line.includes('http') || line.includes('www.')) return false;
  if (line.includes('Skip to') || line.includes('Skip Navigation')) return false;
  if (line.includes('Subscribe') || line.includes('Sign in') || line.includes('Log in')) return false;
  if (line.includes('Cookie') || line.includes('Privacy') || line.includes('Terms')) return false;
  if (line.includes('Logo') || line.includes('svg') || line.includes('png')) return false;
  if (line.startsWith('!') || line.startsWith('[') ) return false;
  if (line.split(' ').length < 5) return false;
  const hasNewsWords = /\b(market|stock|rate|bank|economy|trade|bond|oil|fed|gdp|inflation|growth|decline|rise|fall|surge|drop|gain|loss|president|minister|war|deal|merger|profit|revenue|earnings|forecast|outlook|crisis|rally|selloff|recession|invest|fund|share|index|currency|dollar|euro|yen|yuan)\b/i.test(line);
  return hasNewsWords;
}

async function scrapeWithFirecrawl(): Promise<string[]> {
  const byRegion: Record<string, string[]> = { US: [], Europe: [], Asia: [] };
  for (const source of SCRAPE_SOURCES) {
    try {
      const result = await firecrawl.scrape(source.url, {
        formats: ['markdown'],
        onlyMainContent: true,
      }) as any;
      if (result?.markdown) {
        const lines = result.markdown
          .split('\n')
          .map((l: string) => l.replace(/[#*_\[\]()]/g, '').trim())
          .filter((l: string) => isRealHeadline(l))
          .slice(0, 3);
        lines.forEach((line: string) => byRegion[source.region].push('[' + source.name + '] ' + line));
      }
    } catch {
      continue;
    }
  }
  return [
    ...byRegion.US.slice(0, 8),
    ...byRegion.Europe.slice(0, 8),
    ...byRegion.Asia.slice(0, 8),
  ];
}

async function scrapeWithRSS(): Promise<string[]> {
  const byRegion: Record<string, string[]> = { US: [], Europe: [], Asia: [] };
  for (const feed of RSS_FALLBACK) {
    try {
      const parsed = await parser.parseURL(feed.url);
      parsed.items.slice(0, 4).forEach(item => {
        if (item.title && item.title.length > 20) {
          byRegion[feed.region].push('[RSS-' + feed.region + '] ' + item.title);
        }
      });
    } catch {
      continue;
    }
  }
  return [
    ...byRegion.US.slice(0, 8),
    ...byRegion.Europe.slice(0, 8),
    ...byRegion.Asia.slice(0, 8),
  ];
}

export async function GET() {
  let headlines = await scrapeWithFirecrawl();
  let source = 'firecrawl';
  if (headlines.length < 5) {
    console.log('Firecrawl returned few clean headlines, falling back to RSS');
    const rssHeadlines = await scrapeWithRSS();
    headlines = [...headlines, ...rssHeadlines];
    source = headlines.length > 0 ? 'rss' : 'none';
  }
  return NextResponse.json({
    headlines: headlines.slice(0, 25),
    source
  });
}
