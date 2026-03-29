import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

const parser = new Parser();

const FEEDS = [
  'https://feeds.reuters.com/reuters/businessNews',
  'https://feeds.reuters.com/reuters/technologyNews',
  'https://feeds.marketwatch.com/marketwatch/topstories',
  'https://feeds.marketwatch.com/marketwatch/marketpulse',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  'https://www.cnbc.com/id/20910258/device/rss/rss.html',
  'https://finance.yahoo.com/rss/topfinstories',
  'https://www.investing.com/rss/news.rss',
  'https://www.ft.com/rss/home/uk',
  'https://feeds.reuters.com/reuters/companyNews',
];

export async function GET() {
  const headlines: string[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      const items = parsed.items.slice(0, 2);
      for (const item of items) {
        if (item.title) headlines.push(item.title);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ headlines: headlines.slice(0, 25) });
}
