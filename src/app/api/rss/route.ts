import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

const parser = new Parser();

const FEEDS = [
  'https://feeds.reuters.com/reuters/businessNews',
  'https://feeds.marketwatch.com/marketwatch/topstories',
];

export async function GET() {
  const headlines: string[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      const items = parsed.items.slice(0, 3);
      for (const item of items) {
        if (item.title) headlines.push(item.title);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ headlines });
}