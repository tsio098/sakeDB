/* ───────────────────────────────────────────────────────────
   日本酒DB — Home screen pieces
   Header / MoodSelector / FilterBar / SortSegment / SakeCard / HomeView
   ─────────────────────────────────────────────────────────── */

// ── Large header with scroll-driven compact bar ──────────────
function Header({ scrolled, count, onSearch }) {
  return (
    <>
      {/* compact sticky bar (fades in on scroll) */}
      <div className="glass-strong" style={{
        position:'absolute', top:0, left:0, right:0, zIndex:30,
        paddingTop:54, paddingBottom:12, paddingLeft:20, paddingRight:16,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        borderRadius:0, borderLeft:'none', borderRight:'none', borderTop:'none',
        borderBottom:'1px solid rgba(255,255,255,.5)',
        opacity: scrolled ? 1 : 0, transform: scrolled ? 'none':'translateY(-6px)',
        transition:'opacity .3s, transform .3s', pointerEvents: scrolled?'auto':'none',
      }}>
        <span style={{ fontWeight:700, fontSize:18, letterSpacing:'.02em' }}>日本酒DB</span>
        <IconButton name="search" onClick={onSearch} size={40} iconSize={19} />
      </div>

      {/* large title block (scrolls away) */}
      <div style={{ padding:'62px 20px 10px', position:'relative', zIndex:1 }}>
        <div style={{
          display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12,
        }}>
          <div>
            <div className="sf" style={{
              fontSize:11.5, fontWeight:600, letterSpacing:'.28em',
              color:'var(--emerald-deep)', textTransform:'uppercase', marginBottom:3,
            }}>Sake Database</div>
            <h1 style={{
              margin:0, fontSize:34, fontWeight:700, letterSpacing:'-.02em', lineHeight:1.05,
            }}>日本酒DB</h1>
            <div style={{ marginTop:6, fontSize:13, color:'var(--ink-2)', fontWeight:500 }}>
              <span className="num" style={{ fontWeight:700, color:'var(--ink)' }}>{count}</span> 本の記録
            </div>
          </div>
          <IconButton name="search" onClick={onSearch} size={46} iconSize={21}
            style={{ marginTop:18 }} />
        </div>
      </div>
    </>
  );
}

// ── Mood selector ────────────────────────────────────────────
function MoodSelector({ moods, selected, onSelect }) {
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ padding:'4px 20px 10px', display:'flex', alignItems:'baseline', gap:8 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:'-.01em' }}>今日の気分は？</h2>
        <span style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>タップでおすすめ順に</span>
      </div>
      <div style={{
        display:'flex', gap:10, overflowX:'auto', padding:'2px 20px 12px',
        scrollbarWidth:'none',
      }} className="hide-scroll">
        {moods.map(m => {
          const on = selected === m.key;
          return (
            <button key={m.key} onClick={()=>onSelect(on?null:m.key)} style={{
              flexShrink:0, width:96, padding:'14px 10px 12px', borderRadius:'var(--r-lg)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:9,
              border: on ? '1.5px solid var(--emerald)' : '1px solid rgba(255,255,255,.6)',
              background: on ? 'var(--emerald)' : 'var(--glass)',
              backdropFilter:'var(--blur)', WebkitBackdropFilter:'var(--blur)',
              boxShadow: on ? '0 8px 22px rgba(67,122,110,.35)' : 'var(--shadow-glass)',
              transition:'transform .2s cubic-bezier(.22,1,.36,1), background .2s, box-shadow .2s',
              transform: on ? 'translateY(-2px)':'none',
            }}>
              <span style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:36, height:34, flexShrink:0,
              }}>
                <MoodGlyph mood={m.key} size={33} stroke={1.55} color={on?'#fff':'var(--emerald-deep)'} />
              </span>
              <span style={{
                fontSize:11.5, fontWeight:700, lineHeight:1.25, textAlign:'center',
                color: on ? '#fff' : 'var(--ink)',
                letterSpacing:'-.01em',
              }}>{m.label.replace('：','\n')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter bar ───────────────────────────────────────────────
function FilterPill({ label, active, count, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6, flexShrink:0,
      height:38, padding:'0 14px', borderRadius:'var(--r-pill)',
      fontSize:13.5, fontWeight:600, fontFamily:'var(--jp)',
      border: active?'1.5px solid var(--emerald)':'1px solid rgba(255,255,255,.6)',
      background: active?'rgba(104,166,155,.16)':'var(--glass)',
      backdropFilter:'var(--blur)', WebkitBackdropFilter:'var(--blur)',
      color: active?'var(--emerald-deep)':'var(--ink-2)',
      boxShadow:'var(--shadow-glass)',
    }}>
      {label}
      {count>0 && <span className="num" style={{
        minWidth:18, height:18, padding:'0 5px', borderRadius:9, fontSize:11, fontWeight:800,
        background:'var(--emerald)', color:'#fff', display:'inline-flex',
        alignItems:'center', justifyContent:'center',
      }}>{count}</span>}
      <Icon name="chevDown" size={15} color={active?'var(--emerald-deep)':'var(--ink-3)'} stroke={2.4} />
    </button>
  );
}

function FilterBar({ filters, onOpen, onClearTag, onClearPref, onClearRating }) {
  const { pref, tags, rating } = filters;
  const activeChips = [
    ...(pref ? [{ k:'pref', label:pref, on:onClearPref }] : []),
    ...tags.map(t => ({ k:'tag-'+t, label:t, tag:t, on:()=>onClearTag(t) })),
    ...(rating ? [{ k:'rating', label:`★${rating}以上`, on:onClearRating }] : []),
  ];
  return (
    <div style={{ position:'sticky', top:0, zIndex:20 }}>
      <div style={{
        display:'flex', gap:9, overflowX:'auto', padding:'8px 20px 10px',
        scrollbarWidth:'none',
      }} className="hide-scroll">
        <FilterPill label="都道府県" active={!!pref} count={pref?1:0} onClick={()=>onOpen('pref')} />
        <FilterPill label="タグ" active={tags.length>0} count={tags.length} onClick={()=>onOpen('tags')} />
        <FilterPill label="評価" active={!!rating} count={rating?1:0} onClick={()=>onOpen('rating')} />
      </div>
      {activeChips.length>0 && (
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', padding:'0 20px 10px', animation:'fadeIn .25s' }}>
          {activeChips.map(c => (
            <Chip key={c.k} label={c.label} tag={c.tag} variant={c.tag?undefined:'neutral'} onRemove={c.on} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sort segmented control ───────────────────────────────────
function SortSegment({ value, onChange, moodActive }) {
  const opts = moodActive
    ? [{ k:'mood', label:'おすすめ気分順' }]
    : [{ k:'new', label:'新着' }, { k:'rating', label:'評価' }, { k:'name', label:'名前' }];
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 20px 12px' }}>
      <div style={{
        display:'inline-flex', padding:3, borderRadius:'var(--r-pill)',
        background:'rgba(255,255,255,.45)', backdropFilter:'var(--blur)',
        WebkitBackdropFilter:'var(--blur)', border:'1px solid rgba(255,255,255,.55)',
        boxShadow:'inset 0 0 0 1px rgba(27,44,42,.03)',
      }}>
        {opts.map(o => {
          const on = moodActive || value===o.k;
          return (
            <button key={o.k} onClick={()=>!moodActive && onChange(o.k)} style={{
              padding:'7px 15px', borderRadius:'var(--r-pill)', border:'none',
              fontSize:13, fontWeight:700, fontFamily:'var(--jp)',
              background: on?'#fff':'transparent',
              color: on?(moodActive?'var(--emerald-deep)':'var(--ink)'):'var(--ink-3)',
              boxShadow: on?'0 2px 6px rgba(27,44,42,.1)':'none',
              transition:'all .2s', cursor: moodActive?'default':'pointer',
            }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sake card ────────────────────────────────────────────────
function SakeCard({ sake, score, onOpen, index }) {
  const [press, setPress] = useState(false);
  const shownTags = sake.tags.slice(0,3);
  const extra = sake.tags.length - shownTags.length;
  const firstLine = (sake.review||'').split('\n')[0];
  return (
    <div
      onClick={onOpen}
      onPointerDown={()=>setPress(true)} onPointerUp={()=>setPress(false)} onPointerLeave={()=>setPress(false)}
      style={{
        animationDelay:`${Math.min(index,8)*45}ms`,
        transform: press?'scale(.975)':'none', transition:'transform .14s',
      }}>
      <div className="card-frost" style={{
        borderRadius:'var(--r-lg)', padding:11, display:'flex', gap:13,
        position:'relative', overflow:'hidden',
      }}>
        {/* thumbnail */}
        <div style={{
          width:90, height:90, borderRadius:'var(--r-md)', overflow:'hidden', flexShrink:0,
          boxShadow:'inset 0 0 0 1px rgba(255,255,255,.5)',
        }}>
          <SakeImage src={sake.image} name={sake.name} />
        </div>
        {/* content */}
        <div style={{ flex:1, minWidth:0, paddingRight: score!=null?2:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, justifyContent:'space-between' }}>
            <h3 style={{
              margin:0, fontSize:16, fontWeight:700, lineHeight:1.3, letterSpacing:'-.01em',
              overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
              WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            }}>{sake.name}</h3>
            {score!=null && <ScoreBadge score={score} style={{ flexShrink:0 }} />}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0 7px' }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:3, fontSize:11.5, fontWeight:700,
              color:'#2c5650', background:'var(--mint-grey)', padding:'2px 9px', borderRadius:'var(--r-pill)',
            }}>
              <Icon name="location" size={12} color="#2c5650" stroke={2.2} />{sake.place}
            </span>
            <Stars value={sake.rating} size={13} />
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
            {shownTags.map(t => <Chip key={t} tag={t} size="sm" />)}
            {extra>0 && <span style={{ fontSize:11, color:'var(--ink-3)', alignSelf:'center', fontWeight:600 }}>+{extra}</span>}
          </div>
          {firstLine && (
            <p style={{
              margin:0, fontSize:12.5, color:'var(--ink-2)', lineHeight:1.4,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{firstLine}</p>
          )}
        </div>
      </div>
    </div>
  );
}

window.HomePieces = { Header, MoodSelector, FilterBar, SortSegment, SakeCard };
