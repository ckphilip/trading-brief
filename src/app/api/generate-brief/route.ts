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
  const { headlines, personalNote } = await request.json();

  const { data: systemState } = await supabase
    .from('system_state').select('*').eq('id', 1).single();

  const { data: recentTrades } = await supabase
    .from('trades').select('*')
    .order('created_at', { ascending: false }).limit(5);

  const isOnCooldown = systemState?.cooldown_until &&
    new Date(systemState.cooldown_until) > new Date();
  const canTrade = !isOnCooldown && (systemState?.active_trades || 0) < 3;
  const decision = canTrade ? 'TRADE' : 'NO TRADE';

  const prompt = `You are Philip's personal trading coach and morning brief generator. You think like a seasoned options income trader with decades of experience. You are strict, disciplined, and never sugarcoat reality.

PHILIP'S TRADING CONSTITUTION

Philosophy:
- Objective is to MINIMISE LOSS, not maximise profit
- Whenever possible: LONG stocks, SHORT options
- Holding cash is better than losing cash
- When trade turns sour, exit cleanly
- When satisfied with profit, sell. Do not chase greed
- Wait for the fish to fall into the net. Never chase
- Never violate a hard rule and celebrate it

Money Management (Non-Negotiable):
- Max risk per trade: 4% of total equity
- Max trade size: 10% of total equity
- Max monthly loss: 12% of total equity
- Max active trades: 3
- Max working capital: 30% of total equity
- Cash reserve: minimum 70%, sacred
- 2 consecutive losses = 2 week mandatory cooldown
- After losing month: halve working capital next month
- After 2 consecutive losing months: paper trade only

Entry Rules:
- IV Rank above 30% to sell premium
- IV level below 60%
- Open Interest above 500
- Delta for CSP/CC: 0.30 to 0.40
- Delta for IC short strikes: 0.20 to 0.30
- DTE: 30 to 45 days entry, close or roll at 21 DTE
- Minimum ROI per day: 0.5%
- Only liquid underlyings: SPY, QQQ, IWM, DIA, SPX and large cap stocks
- Bid ask spread under $0.10

Profit Taking:
- 50% profit rule: close at 50% of max profit if in under 50% of trade duration
- 200% loss rule: close immediately if short option reaches 200% of premium collected
- When satisfied with profit, sell. Do not hold for last dollar

Roll Rules:
- Roll only for net credit, never pay debit to roll
- Never roll same position more than twice
- Roll at 21 DTE not at expiration

Hard Avoidance:
- Never hold short option through earnings, close 5 days before
- No new IC when VIX above 30
- No new positions during FOMC week
- Never force a trade

Strategy Preferences:
- CSP: delta 0.30 to 0.40, 30 to 45 DTE, at key support
- CC: sell on green days, at or above cost basis
- IC: ETFs only, StochRSI middle, short strikes outside 1SD
- Credit Spreads: key support/resistance, min 0.5% ROI per day
- Wheel: only stocks willing to hold through 40% drawdown

CURRENT SYSTEM STATE:
Active trades: ${systemState?.active_trades ?? 0}/3
Consecutive losses: ${systemState?.consecutive_losses ?? 0}
Cooldown: ${isOnCooldown ? 'ON COOLDOWN until ' + systemState.cooldown_until : 'None'}
Decision: ${decision}

RECENT TRADES:
${recentTrades?.map((t: any) => t.date + ' | ' + t.ticker + ' | ' + t.setup_type + ' | ' + t.result).join('\n') || 'No recent trades'}

TODAY'S MARKET HEADLINES:
${headlines?.join('\n') || 'No headlines available'}

YOUR TASK:
Generate Philip's morning trading brief. Be direct, strict, coach-like. No fluff.

Format your response exactly like this:

MORNING BRIEF - ${new Date().toDateString()}

SYSTEM STATUS
[Summarise active trades, losses, cooldown. Flag any issues.]

DECISION: ${decision}
[One clear sentence explaining why.]

MARKET CONTEXT
[3 to 4 bullet points from headlines relevant to options income trading.]

TRADE IDEAS
${canTrade ? '[Suggest 2 to 3 high probability income setups. For each include: Ticker, Strategy, Why now, Entry criteria, DTE, Delta target, Risk note.]' : '[Show 2 to 3 watchlist ideas. Label clearly as WATCHLIST ONLY - NOT ACTIONABLE.]'}

RATIONALE
[2 to 3 sentences. Coach style. Remind Philip of the most relevant rule for today.]

PERSONAL NOTE
${personalNote || 'No personal note today'}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const briefContent = message.content[0].type === 'text'
    ? message.content[0].text : '';

  await supabase.from('daily_reports').insert([{
    date: new Date().toISOString().split('T')[0],
    full_report: briefContent,
    decision,
    personal_note: personalNote || '',
  }]);

  try {
    await resend.emails.send({
      from: 'Trading Brief <onboarding@resend.dev>',
      to: process.env.EMAIL_TO!,
      subject: `Morning Brief - ${new Date().toDateString()} - ${decision}`,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          Morning Brief — ${new Date().toDateString()}
        </h1>
        <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="font-size: 18px; font-weight: bold; color: ${decision === 'TRADE' ? '#38a169' : '#e53e3e'};">
            DECISION: ${decision}
          </p>
        </div>
        <pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.8;">
${briefContent}
        </pre>
        <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
          This brief is for educational purposes only. Not financial advice.
        </p>
      </div>`,
    });
  } catch (emailError) {
    console.error('Email send failed:', emailError);
  }

  return NextResponse.json({ brief: briefContent, decision });
}
```

Save with **Ctrl + S**.

Now there's one important thing about Resend on a free account — emails can only be sent to verified addresses OR from `onboarding@resend.dev` as the sender. Since you haven't verified a domain yet, we're using their default sender which works fine for testing.

Restart your app:
```
taskkill /F /IM node.exe
```
```
cd "C:\Users\Philip Ho\trading-brief"
```
```
npm run dev