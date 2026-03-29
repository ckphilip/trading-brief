export const maxDuration = 30;
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

const parser = new Parser();

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', region: 'US' },
  { url: 'https://feeds.reuters.com/reuters/technologyNews', region: 'US' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories', region: 'US' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', region: 'US' },
  { url: 'https://finance.yahoo.com/rss/topfinstories', region: 'US' },
  { url: 'https://feeds.reuters.com/reuters/companyNews', region: 'US' },
  { url: 'https://www.investing.com/rss/news.rss', region: 'US' },
  { url: 'https://seekingalpha.com/feed.xml', region: 'US' },
  { url: 'https://www.wsj.com/xml/rss/3_7085.xml', region: 'US' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', region: 'US' },
  { url: 'https://www.ft.com/rss/home/uk', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/UKdomesticNews', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/UKBusinessNews', region: 'Europe' },
  { url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=business', region: 'Europe' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', region: 'Europe' },
  { url: 'https://www.theguardian.com/business/rss', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/europeFinancialNews', region: 'Europe' },
  { url: 'https://www.politico.eu/rss', region: 'Europe' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', region: 'Europe' },
  { url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen', region: 'Europe' },
  { url: 'https://feeds.reuters.com/reuters/asiaTopNews', region: 'Asia' },
  { url: 'https://asia.nikkei.com/rss/feed/nar', region: 'Asia' },
  { url: 'https://www.scmp.com/rss/2/feed', region: 'Asia' },
  { url: 'https://www.channelnewsasia.com/rssfeeds/8395884', region: 'Asia' },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', region: 'Asia' },
  { url: 'https://feeds.reuters.com/reuters/INbusinessNews', region: 'Asia' },
  { url: 'https://www.straitstimes.com/news/business/rss.xml', region: 'Asia' },
  { url: 'https://www.thejakartapost.com/rss/business.xml', region: 'Asia' },
  { url: 'https://www.bangkokpost.com/rss/data/business.xml', region: 'Asia' },
  { url: 'https://www.koreatimes.co.kr/www/rss/rss.xml', region: 'Asia' },
];

export async function GET() {
  const byRegion: Record<string, string[]> = { US: [], Europe: [], Asia: [] };

  await Promise.all(FEEDS.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      parsed.items.slice(0, 3).forEach(item => {
        if (item.title && item.title.length > 20) {
          byRegion[feed.region].push('[' + feed.region + '] ' + item.title);
        }
      });
    } catch {
      return;
    }
  }));

  const headlines = [
    ...byRegion.US.slice(0, 9),
    ...byRegion.Europe.slice(0, 8),
    ...byRegion.Asia.slice(0, 8),
  ];

  return NextResponse.json({ headlines: headlines.slice(0, 25), source: 'rss' });
}
