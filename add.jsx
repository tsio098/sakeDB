/* ───────────────────────────────────────────────────────────
   日本酒DB — Add / Edit form with live tag autocomplete
   ─────────────────────────────────────────────────────────── */

// Synonym map: substring found in text → suggested master tag
const TAG_SYNONYMS = {
  '甘口':['甘口','甘い','甘み','甘さ','あまく'],
  '辛口':['辛口','辛い','ドライ'],
  '超辛口':['超辛','激辛','キレッキレ'],
  '淡麗':['淡麗','淡い','水のよう','すっと'],
  '芳醇':['芳醇','ふくよか','豊潤'],
  'フルーティ':['フルーティ','フルーツ','果実','ジューシー'],
  'メロン系':['メロン','マスクメロン','瓜'],
  '華やか':['華やか','華','フローラル','花'],
  '爽やか':['爽やか','爽快','フレッシュ','清涼'],
  'すっきり':['すっきり','スッキリ','クリア','透明感','綺麗'],
  'キレ':['キレ','切れ'],
  'コク':['コク','濃醇','濃い','濃厚'],
  '旨口':['旨口','旨み','旨味','うまみ','旨い'],
  'まろやか':['まろやか','やわらか','柔らか','まろ'],
  'とろり':['とろり','とろっ','とろみ'],
  '酸味':['酸味','酸','サワー'],
  '微発泡':['微発泡','発泡','シュワ','ピチピチ'],
  'ガス感':['ガス感','ガス','炭酸'],
  '上品':['上品','エレガント','気品'],
  'おりがらみ':['おりがらみ','おりがら','澱'],
};

function detectTags(name, place, review, current) {
  const text = `${name||''} ${place||''} ${review||''}`;
  const found = new Set();
  // prefecture
  if (place) found.add(place);
  // kinds (literal match in name/review)
  window.KINDS.forEach(k => { if (text.includes(k)) found.add(k); });
  // flavors via synonyms
  Object.entries(TAG_SYNONYMS).forEach(([tag, syns]) => {
    if (syns.some(s => text.includes(s))) found.add(tag);
  });
  // exact flavor literals too
  window.FLAVORS.forEach(f => { if (text.includes(f)) found.add(f); });
  return [...found].filter(t => !current.includes(t));
}

function driveThumb(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
}

// ── Field primitives ─────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:7, marginBottom:8 }}>
        <label style={{ fontSize:13.5, fontWeight:700, color:'var(--ink)' }}>{label}</label>
        {required && <span style={{ fontSize:11, fontWeight:700, color:'#c0492f' }}>必須</span>}
        {hint && <span style={{ fontSize:11.5, color:'var(--ink-3)', fontWeight:500 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
const inputStyle = {
  width:'100%', border:'1px solid rgba(27,44,42,.1)', outline:'none',
  background:'rgba(255,255,255,.85)',
  borderRadius:'var(--r-md)', padding:'13px 15px', fontSize:15.5,
  fontFamily:'var(--jp)', color:'var(--ink)', boxShadow:'var(--shadow-glass)',
};

// ── Add / Edit sheet ─────────────────────────────────────────
// Photos are picked from the device, encoded as Base64, and (on save) sent to a
// GAS Web App that stores the Blob in this Drive folder and returns a share URL.
const DRIVE_FOLDER_ID = '1HEO7kZgeRXUusgJ7tO1S_ecSu-2VgABh';

function AddSheet({ open, onClose, onSave, editSake, prefectures }) {
  const { Sheet, FilterSheet } = window.Sheets;
  const blank = { name:'', place:'', review:'', tags:[], rating:0, image:'', imageName:'' };
  const [form, setForm] = useState(blank);
  const [prefOpen, setPrefOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const fileRef = useRef(null);

  useEffect(()=>{
    if (open) {
      setForm(editSake ? { ...editSake, tags:[...editSake.tags] } : blank);
      setDismissed([]);
    }
  }, [open, editSake]);

  const set = (k,v) => setForm(f=>({ ...f, [k]:v }));
  const suggestions = useMemo(
    () => detectTags(form.name, form.place, form.review, form.tags).filter(t=>!dismissed.includes(t)),
    [form.name, form.place, form.review, form.tags, dismissed]
  );
  const addTag = (t) => setForm(f=> f.tags.includes(t)?f:{ ...f, tags:[...f.tags, t] });
  const removeTag = (t) => setForm(f=>({ ...f, tags:f.tags.filter(x=>x!==t) }));
  const onPickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f=>({ ...f, image:reader.result, imageName:file.name }));
    reader.readAsDataURL(file); // Base64 data URL → sent to GAS on save
  };
  const valid = form.name.trim() && form.place;

  const footer = (
    <Button full size="lg" disabled={!valid}
      onClick={()=>{ if(valid) onSave({ ...form, name:form.name.trim() }); }}>
      {editSake ? '変更を保存' : '保存する'}
    </Button>
  );

  return (
    <>
      <Sheet open={open && !prefOpen && !tagPickerOpen} onClose={onClose}
        title={editSake ? '記録を編集' : '日本酒を記録'} maxHeight="94%" footer={footer}>
        <div style={{ paddingBottom:24 }}>
          {/* 品名 */}
          <Field label="品名" required>
            <input value={form.name} onChange={e=>set('name', e.target.value)}
              placeholder="例：東洋美人 純米吟醸" style={inputStyle} />
          </Field>

          {/* 製造場所 */}
          <Field label="製造場所" required>
            <button onClick={()=>setPrefOpen(true)} style={{
              ...inputStyle, display:'flex', alignItems:'center', justifyContent:'space-between',
              textAlign:'left', cursor:'pointer',
            }}>
              <span style={{ color: form.place?'var(--ink)':'var(--ink-3)' }}>{form.place || '都道府県を選択'}</span>
              <Icon name="chevDown" size={18} color="var(--ink-3)" stroke={2.4} />
            </button>
          </Field>

          {/* 感想 */}
          <Field label="感想" hint="任意・改行で区切り">
            <textarea value={form.review} onChange={e=>set('review', e.target.value)} rows={3}
              placeholder="例：フルーティで甘い" style={{ ...inputStyle, resize:'none', lineHeight:1.6 }} />
          </Field>

          {/* 自動補完サジェスト */}
          {suggestions.length>0 && (
            <div style={{
              borderRadius:'var(--r-md)', padding:'13px 14px', marginBottom:18,
              background:'rgba(242,230,167,.4)', border:'1px solid rgba(242,205,92,.5)',
              animation:'fadeUp .3s', boxShadow:'var(--shadow-glass)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <span style={{ fontSize:15 }}>✨</span>
                <span style={{ fontSize:12.5, fontWeight:700, color:'var(--gold-deep)' }}>テキストからタグを検出 — 追加しますか？</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {suggestions.map(t => (
                  <button key={t} onClick={()=>addTag(t)} style={{
                    display:'inline-flex', alignItems:'center', gap:5, padding:'6px 10px 6px 12px',
                    borderRadius:'var(--r-pill)', border:'1.5px dashed rgba(154,116,22,.5)',
                    background:'rgba(255,255,255,.6)', fontFamily:'var(--jp)',
                    fontSize:13, fontWeight:700, color:'var(--gold-deep)',
                  }}>
                    {t}
                    <span style={{ width:17, height:17, borderRadius:'50%', background:'var(--gold)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="plus" size={11} color="#5a4410" stroke={3} />
                    </span>
                  </button>
                ))}
                <button onClick={()=>setDismissed(d=>[...d, ...suggestions])} style={{
                  border:'none', background:'transparent', fontFamily:'var(--jp)', fontSize:12.5,
                  fontWeight:600, color:'var(--ink-3)', padding:'6px 8px',
                }}>無視</button>
              </div>
            </div>
          )}

          {/* タグ */}
          <Field label="タグ" hint="任意">
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
              {form.tags.map(t => <Chip key={t} tag={t} onRemove={()=>removeTag(t)} />)}
              <button onClick={()=>setTagPickerOpen(true)} style={{
                display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px 5px 10px',
                borderRadius:'var(--r-pill)', border:'1.5px solid var(--emerald)',
                background:'transparent', color:'var(--emerald-deep)', fontFamily:'var(--jp)',
                fontSize:13, fontWeight:700,
              }}>
                <Icon name="plus" size={14} color="var(--emerald-deep)" stroke={2.6} />タグを追加
              </button>
            </div>
          </Field>

          {/* オススメ度 */}
          <Field label="オススメ度" hint="任意">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Stars value={form.rating} size={34} interactive onChange={v=>set('rating', v)} />
              {form.rating>0 && (
                <button onClick={()=>set('rating',0)} style={{ border:'none', background:'transparent', fontSize:12.5, color:'var(--ink-3)', fontWeight:600 }}>クリア</button>
              )}
            </div>
          </Field>

          {/* 画像 */}
          <Field label="画像" hint="任意・端末の写真から選択">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display:'none' }} />
            {!form.image ? (
              <button onClick={()=>fileRef.current && fileRef.current.click()} style={{
                width:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:8, padding:'24px 16px', borderRadius:'var(--r-md)', cursor:'pointer',
                border:'1.5px dashed rgba(67,122,110,.45)', background:'var(--emerald-soft)',
                fontFamily:'var(--jp)',
              }}>
                <span style={{ display:'flex', gap:10 }}>
                  <Icon name="image" size={22} color="var(--emerald-deep)" stroke={1.8} />
                  <Icon name="camera" size={22} color="var(--emerald-deep)" stroke={1.8} />
                </span>
                <span style={{ fontSize:14.5, fontWeight:700, color:'var(--emerald-deep)' }}>写真を選択</span>
                <span style={{ fontSize:11.5, color:'var(--ink-3)', fontWeight:500 }}>ライブラリ または カメラで撮影</span>
              </button>
            ) : (
              <div style={{ animation:'fadeIn .25s' }}>
                <div style={{ position:'relative', borderRadius:'var(--r-md)', overflow:'hidden', boxShadow:'var(--shadow-glass)' }}>
                  <div style={{ width:'100%', height:170 }}>
                    <SakeImage src={form.image} name={form.name||'酒'} />
                  </div>
                  <button onClick={()=>setForm(f=>({ ...f, image:'', imageName:'' }))} style={{
                    position:'absolute', top:8, right:8, width:30, height:30, borderRadius:'50%',
                    border:'none', background:'rgba(20,34,32,.55)', display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <Icon name="x" size={16} color="#fff" stroke={2.6} />
                  </button>
                  <button onClick={()=>fileRef.current && fileRef.current.click()} style={{
                    position:'absolute', bottom:8, right:8, display:'inline-flex', alignItems:'center', gap:5,
                    padding:'6px 12px', borderRadius:'var(--r-pill)', border:'none',
                    background:'rgba(248,251,250,.92)', fontFamily:'var(--jp)', fontSize:12.5, fontWeight:700, color:'var(--ink)',
                  }}>
                    <Icon name="camera" size={14} color="var(--ink)" stroke={2.2} />変更
                  </button>
                </div>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginTop:9 }}>
              <Icon name="check" size={13} color="var(--emerald)" stroke={2.6} style={{ marginTop:2, flexShrink:0 }} />
              <span style={{ fontSize:11, color:'var(--ink-3)', lineHeight:1.5 }}>
                保存時に Base64 で送信し、Google Drive に自動アップロードされます（共有URLを記録）。
              </span>
            </div>
          </Field>
        </div>
      </Sheet>

      {/* prefecture picker */}
      <PrefPicker open={prefOpen} onClose={()=>setPrefOpen(false)} value={form.place}
        prefectures={prefectures} onPick={p=>{ set('place', p); setPrefOpen(false); }} />

      {/* tag picker */}
      <TagPicker open={tagPickerOpen} onClose={()=>setTagPickerOpen(false)}
        selected={form.tags} onToggle={t=> form.tags.includes(t)?removeTag(t):addTag(t)} />
    </>
  );
}

// ── Prefecture picker sheet ──────────────────────────────────
function PrefPicker({ open, onClose, value, prefectures, onPick }) {
  const { Sheet, SearchField } = window.Sheets;
  const [q, setQ] = useState('');
  useEffect(()=>{ if(open) setQ(''); }, [open]);
  const list = prefectures.filter(p=>p.includes(q));
  return (
    <Sheet open={open} onClose={onClose} title="製造場所" maxHeight="84%">
      <SearchField value={q} onChange={setQ} placeholder="都道府県を検索" autoFocus />
      <div style={{ paddingBottom:20 }}>
        {list.map(p=>(
          <button key={p} onClick={()=>onPick(p)} style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'13px 4px', border:'none', background:'transparent',
            borderBottom:'1px solid var(--hair)', fontFamily:'var(--jp)',
            fontSize:15.5, fontWeight: value===p?700:500, color:'var(--ink)',
          }}>
            {p}
            {value===p && <Icon name="check" size={18} color="var(--emerald)" stroke={2.6} />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ── Tag picker sheet ─────────────────────────────────────────
function TagPicker({ open, onClose, selected, onToggle }) {
  const { Sheet } = window.Sheets;
  return (
    <Sheet open={open} onClose={onClose} title="タグを選択" maxHeight="84%"
      footer={<Button full variant="emerald" onClick={onClose}>完了（{selected.length}）</Button>}>
      <div style={{ paddingBottom:12 }}>
        {[['種類', window.KINDS], ['味・香り', window.FLAVORS]].map(([label, list])=>(
          <div key={label} style={{ marginBottom:18 }}>
            <div className="sf" style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', letterSpacing:'.06em', textTransform:'uppercase', margin:'4px 0 10px' }}>{label}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {list.map(t=>(
                <Chip key={t} tag={t} active={selected.includes(t)} onClick={()=>onToggle(t)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

window.AddSheet = AddSheet;
