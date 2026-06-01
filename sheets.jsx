/* ───────────────────────────────────────────────────────────
   日本酒DB — Sheets, filters, toast, state views
   ─────────────────────────────────────────────────────────── */

// ── Bottom sheet wrapper ─────────────────────────────────────
function Sheet({ open, onClose, title, children, maxHeight = '86%', footer }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const sheetRef = useRef(null);
  useEffect(() => {
    if (open) setMounted(true);
    else {
      setShown(false);
      // fail-safe: unmount after the close transition even if transitionend
      // never fires (e.g. compositor throttled)
      const id = setTimeout(() => setMounted(false), 480);
      return () => clearTimeout(id);
    }
  }, [open]);
  // Reveal once mounted: force a reflow so the translateY(101%) start frame is
  // committed, then flip to translateY(0) so the CSS transition runs. No timer →
  // not affected by background-tab throttling.
  useLayoutEffect(() => {
    if (mounted && open && sheetRef.current) {
      void sheetRef.current.offsetHeight; // commit start frame
      setShown(true);
    }
  }, [mounted, open]);
  if (!mounted) return null;
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:80,
      display:'flex', flexDirection:'column', justifyContent:'flex-end',
      pointerEvents: open?'auto':'none',
    }}>
      {/* scrim */}
      <div onClick={onClose} style={{
        position:'absolute', inset:0, background:'rgba(20,34,32,.34)',
        opacity: shown?1:0, transition:'opacity .34s ease',
      }} />
      {/* sheet */}
      <div ref={sheetRef} onTransitionEnd={(e)=>{ if(e.target===e.currentTarget && !open) setMounted(false); }} style={{
        position:'relative', maxHeight, display:'flex', flexDirection:'column',
        background:'rgba(248,251,250,.98)',
        borderTopLeftRadius:28, borderTopRightRadius:28,
        borderTop:'1px solid rgba(255,255,255,.9)',
        boxShadow:'var(--shadow-pop)',
        transform: shown?'translateY(0)':'translateY(101%)',
        transition:'transform .42s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:2 }}>
          <div style={{ width:40, height:5, borderRadius:3, background:'rgba(27,44,42,.18)' }} />
        </div>
        {title && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 20px 12px',
          }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:'-.01em' }}>{title}</h2>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'50%', border:'none',
              background:'rgba(27,44,42,.07)', display:'flex', alignItems:'center', justifyContent:'center',
            }}><Icon name="x" size={17} color="var(--ink-2)" stroke={2.4} /></button>
          </div>
        )}
        <div className="hide-scroll" style={{ overflowY:'auto', padding:'0 20px', flex:1 }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px calc(12px + env(safe-area-inset-bottom))' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Filter sheet ─────────────────────────────────────────────
function FilterSheet({ type, open, onClose, data, filters, setFilters }) {
  const [q, setQ] = useState('');
  useEffect(()=>{ if(open) setQ(''); }, [open, type]);

  // prefecture counts
  const prefCounts = useMemo(()=>{
    const m = {}; data.forEach(s => m[s.place]=(m[s.place]||0)+1); return m;
  }, [data]);
  const prefList = useMemo(()=> Object.keys(prefCounts)
    .sort((a,b)=>prefCounts[b]-prefCounts[a])
    .filter(p => p.includes(q)), [prefCounts, q]);

  const titles = { pref:'都道府県で絞り込む', tags:'タグで絞り込む', rating:'評価で絞り込む' };

  return (
    <Sheet open={open} onClose={onClose} title={titles[type]} maxHeight={type==='rating'?'52%':'80%'}>
      {type==='pref' && (
        <>
          <SearchField value={q} onChange={setQ} placeholder="都道府県を検索" />
          <div style={{ paddingBottom:20 }}>
            {prefList.map(p => {
              const on = filters.pref===p;
              return (
                <button key={p} onClick={()=>setFilters(f=>({...f, pref: on?'':p}))} style={{
                  width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'13px 4px', border:'none', background:'transparent',
                  borderBottom:'1px solid var(--hair)', fontFamily:'var(--jp)',
                }}>
                  <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:15.5, fontWeight: on?700:500, color:'var(--ink)' }}>{p}</span>
                    <span className="num" style={{ fontSize:12, color:'var(--ink-3)' }}>{prefCounts[p]}本</span>
                  </span>
                  {on
                    ? <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={15} color="#fff" stroke={3}/></span>
                    : <span style={{ width:24, height:24, borderRadius:'50%', border:'1.5px solid var(--hair)' }} />}
                </button>
              );
            })}
            {prefList.length===0 && <p style={{ textAlign:'center', color:'var(--ink-3)', padding:'30px 0' }}>該当なし</p>}
          </div>
        </>
      )}

      {type==='tags' && (
        <div style={{ paddingBottom:20 }}>
          {[['種類', window.KINDS], ['味・香り', window.FLAVORS]].map(([label, list]) => (
            <div key={label} style={{ marginBottom:18 }}>
              <div className="sf" style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', letterSpacing:'.06em', textTransform:'uppercase', margin:'4px 0 10px' }}>{label}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {list.map(t => {
                  const on = filters.tags.includes(t);
                  return <Chip key={t} tag={t} active={on} onClick={()=>setFilters(f=>({
                    ...f, tags: on?f.tags.filter(x=>x!==t):[...f.tags,t]
                  }))} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {type==='rating' && (
        <div style={{ paddingBottom:24, paddingTop:4 }}>
          {[5,4,3,2,1].map(r => {
            const on = filters.rating===r;
            return (
              <button key={r} onClick={()=>setFilters(f=>({...f, rating: on?0:r}))} style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'13px 4px', border:'none', background:'transparent',
                borderBottom:'1px solid var(--hair)',
              }}>
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Stars value={r} size={19} />
                  <span style={{ fontSize:14, color:'var(--ink-2)', fontWeight:600 }}>以上</span>
                </span>
                {on
                  ? <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={15} color="#fff" stroke={3}/></span>
                  : <span style={{ width:24, height:24, borderRadius:'50%', border:'1.5px solid var(--hair)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

// ── Search field ─────────────────────────────────────────────
function SearchField({ value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:9, padding:'0 14px', height:44,
      background:'rgba(27,44,42,.05)', borderRadius:'var(--r-pill)', margin:'2px 0 14px',
    }}>
      <Icon name="search" size={18} color="var(--ink-3)" stroke={2.2} />
      <input value={value} autoFocus={autoFocus} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} style={{
        flex:1, border:'none', background:'transparent', outline:'none',
        fontFamily:'var(--jp)', fontSize:15, color:'var(--ink)',
      }} />
      {value && <button onClick={()=>onChange('')} style={{ border:'none', background:'rgba(27,44,42,.12)', width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="x" size={11} color="#fff" stroke={3}/></button>}
    </div>
  );
}

// ── Search overlay ───────────────────────────────────────────
function SearchSheet({ open, onClose, data, onOpenSake }) {
  const [q, setQ] = useState('');
  useEffect(()=>{ if(open) setQ(''); }, [open]);
  const results = useMemo(()=> q.trim()
    ? data.filter(s => s.name.includes(q) || s.place.includes(q) || s.tags.some(t=>t.includes(q)))
    : [], [q, data]);
  return (
    <Sheet open={open} onClose={onClose} title="検索" maxHeight="86%">
      <SearchField value={q} onChange={setQ} placeholder="品名・産地・タグ" autoFocus />
      <div style={{ paddingBottom:20, display:'flex', flexDirection:'column', gap:9 }}>
        {q.trim() && results.length===0 && (
          <p style={{ textAlign:'center', color:'var(--ink-3)', padding:'30px 0' }}>「{q}」に一致する記録はありません</p>
        )}
        {results.map((s,i)=>(
          <window.HomePieces.SakeCard key={s.id} sake={s} score={null} index={i} onOpen={()=>onOpenSake(s)} />
        ))}
        {!q.trim() && (
          <p style={{ textAlign:'center', color:'var(--ink-3)', padding:'24px 0', fontSize:13.5 }}>品名・産地・タグで横断検索</p>
        )}
      </div>
    </Sheet>
  );
}

// ── Toast ────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:'absolute', bottom:110, left:'50%', transform:'translateX(-50%)',
      zIndex:120, display:'flex', alignItems:'center', gap:10,
      padding:'13px 20px', borderRadius:'var(--r-pill)',
      background:'rgba(248,251,250,.98)', border:'1px solid rgba(255,255,255,.9)',
      boxShadow:'var(--shadow-pop)',
      animation:'toastIn .35s cubic-bezier(.22,1,.36,1)', whiteSpace:'nowrap',
    }}>
      <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name="check" size={14} color="#fff" stroke={3} />
      </span>
      <span style={{ fontSize:14.5, fontWeight:700 }}>{toast}</span>
    </div>
  );
}

// ── State views ──────────────────────────────────────────────
function SkeletonCard() {
  const sh = { background:'linear-gradient(90deg, rgba(255,255,255,.25) 25%, rgba(255,255,255,.55) 50%, rgba(255,255,255,.25) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' };
  return (
    <div className="card-frost" style={{ borderRadius:'var(--r-lg)', padding:11, display:'flex', gap:13 }}>
      <div style={{ width:90, height:90, borderRadius:'var(--r-md)', ...sh }} />
      <div style={{ flex:1, paddingTop:4 }}>
        <div style={{ height:15, width:'75%', borderRadius:6, ...sh, marginBottom:10 }} />
        <div style={{ height:12, width:'45%', borderRadius:6, ...sh, marginBottom:12 }} />
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ height:18, width:54, borderRadius:9, ...sh }} />
          <div style={{ height:18, width:44, borderRadius:9, ...sh }} />
        </div>
      </div>
    </div>
  );
}
function LoadingView() {
  return <div style={{ display:'flex', flexDirection:'column', gap:11, padding:'4px 20px 20px' }}>
    {[0,1,2,3,4].map(i=><SkeletonCard key={i} />)}
  </div>;
}

function CenterState({ emoji, title, body, action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'56px 36px', gap:6 }}>
      <div className="glass" style={{ width:76, height:76, borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, marginBottom:10 }}>{emoji}</div>
      <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}>{title}</h3>
      <p style={{ margin:'2px 0 0', fontSize:13.5, color:'var(--ink-2)', lineHeight:1.6, maxWidth:240 }}>{body}</p>
      {action && <div style={{ marginTop:14 }}>{action}</div>}
    </div>
  );
}

window.Sheets = { Sheet, FilterSheet, SearchSheet, SearchField, Toast, LoadingView, CenterState };
