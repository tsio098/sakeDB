/* ───────────────────────────────────────────────────────────
   日本酒DB — Detail sheet (modal)
   ─────────────────────────────────────────────────────────── */

function DetailSheet({ sake, mood, onClose, onEdit, onDelete }) {
  const { Sheet } = window.Sheets;
  const open = !!sake;
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(()=>{ if(!sake) setConfirmDel(false); }, [sake]);
  const score = sake && mood ? window.scoreFor(sake, mood) : null;

  return (
    <Sheet open={open} onClose={onClose} maxHeight="92%">
      {sake && (
        <div style={{ paddingBottom:24 }}>
          {/* hero image */}
          <div style={{
            height:208, borderRadius:'var(--r-lg)', overflow:'hidden', position:'relative',
            boxShadow:'inset 0 0 0 1px rgba(255,255,255,.5)', marginBottom:18,
          }}>
            <SakeImage src={sake.image} name={sake.name} size="detail" />
            {score!=null && (
              <div style={{ position:'absolute', top:12, right:12 }}>
                <span className="glass-strong" style={{
                  display:'inline-flex', alignItems:'center', gap:5, padding:'7px 13px',
                  borderRadius:'var(--r-pill)', fontWeight:800, fontSize:14, color:'var(--gold-deep)',
                  background:'rgba(247,251,250,.85)',
                }}>
                  <span>★</span><span className="num">{score}</span>
                  <span style={{ fontSize:11.5, color:'var(--ink-2)', fontWeight:600 }}>気分スコア</span>
                </span>
              </div>
            )}
          </div>

          {/* title row */}
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8, flexWrap:'wrap' }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4, fontSize:13, fontWeight:700,
              color:'#2c5650', background:'var(--mint-grey)', padding:'4px 12px', borderRadius:'var(--r-pill)',
            }}>
              <Icon name="location" size={13} color="#2c5650" stroke={2.2} />{sake.place}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Stars value={sake.rating} size={18} />
              <span className="num" style={{ fontSize:13, fontWeight:700, color:'var(--gold-deep)' }}>{sake.rating}.0</span>
            </div>
          </div>
          <h1 style={{ margin:'0 0 18px', fontSize:27, fontWeight:700, lineHeight:1.25, letterSpacing:'-.02em' }}>{sake.name}</h1>

          {/* review */}
          {sake.review && (
            <div className="glass" style={{ borderRadius:'var(--r-md)', padding:'15px 16px', marginBottom:16 }}>
              <div className="sf" style={{ fontSize:11, fontWeight:700, color:'var(--emerald-deep)', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:8 }}>Tasting Note</div>
              <p style={{ margin:0, fontSize:15, lineHeight:1.75, color:'var(--ink)', whiteSpace:'pre-line' }}>{sake.review}</p>
            </div>
          )}

          {/* tags */}
          <div style={{ marginBottom:22 }}>
            <div className="sf" style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:10 }}>Tags</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {sake.tags.map(t => <Chip key={t} tag={t} />)}
            </div>
          </div>

          {/* actions */}
          {!confirmDel ? (
            <div style={{ display:'flex', gap:10 }}>
              <Button variant="soft" full leftIcon="edit" onClick={onEdit}>編集</Button>
              <Button variant="danger" leftIcon="trash" onClick={()=>setConfirmDel(true)} style={{ flexShrink:0, width:54, padding:0 }}> </Button>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius:'var(--r-md)', padding:16, animation:'fadeUp .25s', border:'1.5px solid rgba(192,73,47,.25)' }}>
              <p style={{ margin:'0 0 14px', fontSize:14.5, fontWeight:600, lineHeight:1.5 }}>「{sake.name}」を削除しますか？<br/><span style={{ color:'var(--ink-3)', fontWeight:500, fontSize:13 }}>この操作は取り消せません。</span></p>
              <div style={{ display:'flex', gap:10 }}>
                <Button variant="ghost" full onClick={()=>setConfirmDel(false)}>キャンセル</Button>
                <Button full onClick={()=>onDelete(sake)} style={{ background:'#c0492f', color:'#fff', boxShadow:'0 4px 12px rgba(192,73,47,.3)' }}>削除する</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

window.DetailSheet = DetailSheet;
