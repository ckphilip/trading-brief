import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DailyPage() {
  const { data: report } = await supabase
    .from('daily_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const today = new Date().toDateString();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>Daily Market Commentary</h1>
        <p style={{ color: '#888', fontSize: 14 }}>ngohiang.com — {today}</p>
      </div>

      {!report ? (
        <p style={{ color: '#888' }}>No commentary available today. Check back later.</p>
      ) : (
        <>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 16 }}>Market Context</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#333' }}>
              {extractMarketContext(report.full_report)}
            </p>
          </div>

          {report.personal_note && (
            <div style={{ borderLeft: '3px solid #000', paddingLeft: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 }}>Personal Note</h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#333' }}>{report.personal_note}</p>
            </div>
          )}

          <p style={{ fontSize: 12, color: '#aaa', marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee' }}>
            This commentary is for educational purposes only and does not constitute financial advice.
            Always do your own research before making any investment decisions.
          </p>
        </>
      )}
    </div>
  );
}

function extractMarketContext(brief: string): string {
  if (!brief) return 'No market context available today.';
  const lines = brief.split('\n');
  const contextStart = lines.findIndex(l =>
    l.includes('MARKET CONTEXT') || l.includes('Market Context')
  );
  if (contextStart === -1) return 'No market context available today.';
  const contextLines = [];
  for (let i = contextStart + 1; i < lines.length; i++) {
    if (lines[i].match(/^(TRADE IDEAS|RATIONALE|PERSONAL NOTE|DECISION)/)) break;
    if (lines[i].trim()) contextLines.push(lines[i].trim());
  }
  return contextLines.join(' ') || 'No market context available today.';
}