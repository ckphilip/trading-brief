
export const maxDuration = 30;
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

const parser = new Parser();

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', region: 'US' },
  { url: 'https://feeds.reuters.com/reuters/technologyNews', region: 'US' },
  { url: 'https://feeds.reuters.com/reuters/companyNews', region: 'US' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories', region: 'US' },
  { url: 'https://feeds.marketwatch.com/marketwatch/marketpulse', region: 'US' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', region: 'US' },
  { url: 'https://finance.yahoo.com/rss/topfinstories', region: 'US' },
  { url: 'https://seekingalpha.com/feed.xml', region: 'US' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', region: 'US' },
  { url: 'https://www.benzinga.com/feed', region: 'US' },
  { url: 'https://feeds.nasdaq.com/nasdaq/news', region: 'US' },
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', region: 'US' },
  { url: 'https://news.google.com/rss/search?q=global+markets&hl=en-US&gl=US&ceid=US:en', region: 'US' },
  { url: 'https://news.google.com/rss/search?q=S%26P+500+stock+market&hl=en-US&gl=US&ceid=US:en', region: 'US' },
  { url: 'https://news.google.com/rss/search?q=inflation+interest+rates+federal+reserve&hl=en-US&gl=US&ceid=US:en', region: 'US' },
  { url: 'https://www.ft.com/rss/home/uk', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/UKBusinessNews', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/UKdomesticNews', region: 'Europe' },
  { url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=business', region: 'Europe' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', region: 'Europe' },
  { url: 'https://www.theguardian.com/business/rss', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/europeFinancialNews', region: 'Europe' },
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', region: 'Europe' },
  { url: 'https://www.imf.org/en/News/rss?language=eng', region: 'Europe' },
  { url: 'https://news.google.com/rss/search?q=oil+prices+energy+markets&hl=en-US&gl=US&ceid=US:en', region: 'Europe' },
  { url: 'https://news.google.com/rss/search?q=geopolitics+war+sanctions+economy&hl=en-US&gl=US&ceid=US:en', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/asiaTopNews', region: 'Asia' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', region: 'Asia' },
  { url: 'https://www.scmp.com/rss/2/feed', region: 'Asia' },
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395884', region: 'Asia' },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', region: 'Asia' },
  { url: 'https://feeds.reuters.com/reuters/INbusinessNews', region: 'Asia' },
  { url: 'https://www.straitstimes.com/news/business/rss.xml', region: 'Asia' },
  { url: 'https://www.businesstimes.com.sg/rss/all', region: 'Asia' },
  { url: 'https://www.moneycontrol.com/rss/marketreports.xml', region: 'Asia' },
  { url: 'https://news.google.com/rss/search?q=China+economy+markets&hl=en-US&gl=US&ceid=US:en', region: 'Asia' },
  { url: 'https://news.google.com/rss/search?q=Asia+markets+stocks&hl=en-US&gl=US&ceid=US:en', region: 'Asia' },
  { url: 'https://news.google.com/rss/search?q=bond+yields+treasury+dollar&hl=en-US&gl=US&ceid=US:en', region: 'Asia' },
];

export async function GET() {
  const byRegion: Record<string, string[]> = { US: [], Europe: [], Asia: [] };

  await Promise.all(FEEDS.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      parsed.items.slice(0, 2).forEach(item => {
        if (item.title && item.title.length > 20 && item.title.length < 200) {
          byRegion[feed.region].push('[' + feed.region + '] ' + item.title);
        }
      });
    } catch {
      return;
    }
  }));

  const headlines = [
    ...byRegion.US.slice(0, 10),
    ...byRegion.Europe.slice(0, 8),
    ...byRegion.Asia.slice(0, 8),
  ];

  return NextResponse.json({ headlines: headlines.slice(0, 26), source: 'rss' });
}
