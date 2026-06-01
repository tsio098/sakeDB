/* ───────────────────────────────────────────────────────────
   日本酒DB — Browse screen (groupings: 都道府県 / タグ / 評価)
   ─────────────────────────────────────────────────────────── */

function BrowseView({ data, onApplyPref, onApplyTag, onOpenSake }) {
  const [mode, setMode] = useState('pref');

  const prefCounts = useMemo(()=>{
    const m={}; data.forEach(s=>m[s.place]=(m[s.place]||0)+1);
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [data]);

  const tagCounts = useMemo(()=>{
    const m={}; data.forEach(s=>s.tags.forEach(t=>{
      if(!window.PREFECTURES.includes(t)) m[t]=(m[t]||0)+1;
    }));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [data]);

  const byRating = useMemo(()=>{
    const m={5:[],4:[],3:[],2:[],1:[]};
    data.forEach(s=>{ if(m[s.rating]) m[s.rating].push(s); });
    return m;
  }, [data]);

  return (
    <div className="app-scroll" data-screen-label="ブラウズ">
      <div style={{ padding:'62px 20px 8px' }}>
        <div className="sf" style={{ fontSize:11.5, fontWeight:600, letterSpacing:'.28em', color:'var(--emerald-deep)', textTransform:'uppercase', marginBottom:3 }}>Browse</div>
        <h1 style={{ margin:0, fontSize:34, fontWeight:700, letterSpacing:'-.02em' }}>ブラウズ</h1>
      </div>

      {/* segmented */}
      <div style={{ padding:'10px 20px 14px' }}>
        <div style={{
          display:'flex', padding:3, borderRadius:'var(--r-pill)',
          background:'rgba(255,255,255,.45)', backdropFilter:'var(--blur)',
          WebkitBackdropFilter:'var(--blur)', border:'1px solid rgba(255,255,255,.55)',
        }}>
          {[['pref','都道府県'],['tag','タグ'],['rating','評価']].map(([k,l])=>{
            const on=mode===k;
            return <button key={k} onClick={()=>setMode(k)} style={{
              flex:1, padding:'9px 0', borderRadius:'var(--r-pill)', border:'none',
              fontSize:13.5, fontWeight:700, fontFamily:'var(--jp)',
              background:on?'#fff':'transparent', color:on?'var(--ink)':'var(--ink-3)',
              boxShadow:on?'0 2px 6px rgba(27,44,42,.1)':'none', transition:'all .2s',
            }}>{l}</button>;
          })}
        </div>
      </div>

      <div style={{ padding:'0 20px 24px' }}>
        {mode==='pref' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {prefCounts.map(([p,c])=>(
              <button key={p} onClick={()=>onApplyPref(p)} className="card-frost" style={{
                borderRadius:'var(--r-md)', padding:'15px 15px', textAlign:'left',
                display:'flex', flexDirection:'column', gap:6, cursor:'pointer',
              }}>
                <Icon name="location" size={18} color="var(--emerald)" stroke={2.2} />
                <span style={{ fontSize:15.5, fontWeight:700, letterSpacing:'-.01em' }}>{p}</span>
                <span className="num" style={{ fontSize:12.5, color:'var(--ink-3)', fontWeight:600 }}>{c} 本</span>
              </button>
            ))}
          </div>
        )}

        {mode==='tag' && (
          <div className="glass" style={{ borderRadius:'var(--r-lg)', padding:'18px 16px' }}>
            <div style={{ display:'flex', gap:9, flexWrap:'wrap', alignItems:'center' }}>
              {tagCounts.map(([t,c])=>{
                const scale = 0.86 + Math.min(c,8)/9;
                return (
                  <button key={t} onClick={()=>onApplyTag(t)} style={{
                    border:'none', background:'transparent', padding:0, cursor:'pointer',
                    transform:`scale(${scale})`, transformOrigin:'center',
                  }}>
                    <Chip tag={t} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode==='rating' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {[5,4,3,2,1].map(r=> byRating[r].length>0 && (
              <div key={r}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingLeft:2 }}>
                  <Stars value={r} size={16} />
                  <span className="num" style={{ fontSize:12.5, color:'var(--ink-3)', fontWeight:700 }}>{byRating[r].length}本</span>
                </div>
                <div className="hide-scroll" style={{ display:'flex', gap:11, overflowX:'auto', paddingBottom:4 }}>
                  {byRating[r].map(s=>(
                    <button key={s.id} onClick={()=>onOpenSake(s)} className="card-frost" style={{
                      flexShrink:0, width:130, borderRadius:'var(--r-md)', padding:8,
                      textAlign:'left', cursor:'pointer', border:'1px solid rgba(255,255,255,.6)',
                    }}>
                      <div style={{ height:84, borderRadius:'var(--r-sm)', overflow:'hidden', marginBottom:8 }}>
                        <SakeImage src={s.image} name={s.name} />
                      </div>
                      <div style={{ fontSize:12.5, fontWeight:700, lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', height:33 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:3, fontWeight:600 }}>{s.place}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.BrowseView = BrowseView;
