const fs = require('fs');

fs.writeFileSync('src/app/api/generate-brief/route.ts', `
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { headlines, personalNote, source } = await request.json();
  const sourceLabel = source === 'firecrawl' ? 'Firecrawl (live web scrape)' : 'RSS feeds (global)';

  const prompt = \`You are Philip's personal trading coach and morning brief generator. You think like a seasoned options income trader with decades of experience. You are strict, disciplined, and never sugarcoat reality.

PHILIP'S TRADING CONSTITUTION

Philosophy:
- Objective is to MINIMISE LOSS, not maximise profit
- Whenever possible: LONG stocks, SHORT options
- Holding cash is better than losing cash
- When trade turns sour, exit cleanly
- When satisfied with profit, sell. Do not chase greed
- Wait for the fish to fall into the net. Never chase
- Never violate a hard rule and celebrate it

Money Management:
- Max risk per trade: 4% of total equity
- Max trade size: 10% of total equity
- Max monthly loss: 12% of total equity
- Max active trades: 3
- Max working capital: 30% of total equity
- Cash reserve: minimum 70%, sacred
- 2 consecutive losses = 2 week mandatory cooldown

Entry Rules:
- IV Rank above 30% to sell premium
- IV level below 60%
- Open Interest above 500
- Delta for CSP/CC: 0.30 to 0.40
- Delta for IC short strikes: 0.20 to 0.30
- DTE: 30 to 45 days entry, close or roll at 21 DTE
- Minimum ROI per day: 0.5%
- Only liquid underlyings: SPY, QQQ, IWM, DIA, SPX and large cap stocks

Profit Taking:
- 50% profit rule: close at 50% of max profit if in under 50% of trade duration
- 200% loss rule: close if short option reaches 200% of premium collected

Roll Rules:
- Roll only for net credit
- Never roll same position more than twice
- Roll at 21 DTE not at expiration

Hard Avoidance:
- Never hold short option through earnings, close 5 days before
- No new IC when VIX above 30
- No new positions during FOMC week
- Never force a trade

DATA SOURCE: \${sourceLabel}

TODAY'S MARKET HEADLINES (tagged by region):
\${headlines?.join('\\n') || 'No headlines available'}

Generate Philip's morning trading brief. Be direct, strict, coach-like. No fluff. Reference specific headlines and regions.

Format exactly like this:

MORNING BRIEF - \${new Date().toDateString()}
Data source: \${sourceLabel}

MARKET CONTEXT
[3 to 5 bullet points covering US, Europe and Asia. Include source region for each point.]

TRADE IDEAS
[Suggest 2 to 3 high probability income setups. For each: Ticker, Strategy, Why now, Entry criteria, DTE, Delta target, Risk note.]

RATIONALE
[2 to 3 sentences. Coach style. Remind Philip of the most relevant rule for today.]
\`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const briefContent = message.content[0].type === 'text' ? message.content[0].text : '';

  const { data: inserted } = await supabase.from('daily_reports').insert([{
    date: new Date().toISOString().split('T')[0],
    full_report: briefContent,
    decision: 'TRADE',
    personal_note: '',
  }]).select().single();

  try {
    await resend.emails.send({
      from: 'Trading Brief <brief@ngohiang.com>',
      to: process.env.EMAIL_TO!,
      subject: \`Morning Brief - \${new Date().toDateString()}\`,
      html: \`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">Morning Brief - \${new Date().toDateString()}</h1><pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.8;">\${briefContent}</pre><p style="color: #888; font-size: 12px; margin-top: 24px;">Educational purposes only. Not financial advice.</p></div>\`,
    });
  } catch (emailError) {
    console.error('Email failed:', emailError);
  }

  return NextResponse.json({ brief: briefContent, source: sourceLabel, id: inserted?.id || null });
}
`);

console.log('done');