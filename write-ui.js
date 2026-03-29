const fs = require('fs');

fs.writeFileSync('src/app/daily/page.tsx', `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function DailyPage() {
  const { data: report } = await supabase
    .from('daily_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  function extractMarketContext(brief: string): string[] {
    if (!brief) return [];
    const lines = brief.split('\\n');
    const start = lines.findIndex(l => l.includes('MARKET CONTEXT'));
    if (start === -1) return [];
    const bullets: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(TRADE IDEAS|RATIONALE|PERSONAL NOTE|DECISION|MORNING BRIEF)/)) break;
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        bullets.push(line.replace(/^[•\\-\\*]\\s*/, '').trim());
      } else if (line.length > 20) {
        const parts = line.split(/\\s*•\\s*/);
        parts.forEach(p => { if (p.trim().length > 20) bullets.push(p.trim()); });
      }
    }
    return bullets.filter(b => b.length > 0);
  }

  const bullets = report ? extractMarketContext(report.full_report) : [];
  const personalNote = report?.personal_note || '';
  const date = report ? new Date(report.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: 'Inter, -apple-system, sans-serif', WebkitFontSmoothing: 'antialiased' } as any}>
      <div style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(60,60,67,0.12)', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 } as any}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#000', letterSpacing: -0.4 }}>Daily Commentary</span>
          <span style={{ fontSize: 13, color: '#6E6E73' }}>ngohiang.com</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 48px' }}>
        {!report ? (
          <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 15, color: '#6E6E73' }}>No commentary available today. Check back later.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16, paddingLeft: 4 }}>{date}</div>

            {bullets.length > 0 && (
              <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.8 }}>Market Context</div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {bullets.map((bullet, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 20px', borderBottom: i < bullets.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#007AFF', marginTop: 8, flexShrink: 0 }} />
                      <div style={{ fontSize: 15, lineHeight: 1.7, color: '#000' }}>{bullet}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(60,60,67,0.08)', display: 'flex', gap: 16 }}>
                  <a href="https://www.reuters.com/markets/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#007AFF', textDecoration: 'none' }}>Reuters</a>
                  <a href="https://www.marketwatch.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#007AFF', textDecoration: 'none' }}>MarketWatch</a>
                  <a href="https://asia.nikkei.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#007AFF', textDecoration: 'none' }}>Nikkei Asia</a>
                  <a href="https://www.ft.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#007AFF', textDecoration: 'none' }}>FT</a>
                </div>
              </div>
            )}

            {personalNote ? (
              <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.8 }}>Chief's Note</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 15, lineHeight: 1.8, color: '#000', marginBottom: 20 }}>{personalNote}</div>
                  <div style={{ borderTop: '1px solid rgba(60,60,67,0.08)', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>Ngo Hiang</div>
                    <div style={{ fontSize: 12, color: '#6E6E73' }}>Market Chief · ngohiang.com</div>
                    <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 2 }}>{date}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, color: '#AEAEB2', fontStyle: 'italic' }}>Chief's note not yet published for today.</div>
              </div>
            )}

            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: '#AEAEB2', lineHeight: 1.6 }}>
                This commentary is for educational purposes only and does not constitute financial advice. Always conduct your own research before making investment decisions.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
`);

console.log('done');