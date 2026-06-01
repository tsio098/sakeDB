/* ───────────────────────────────────────────────────────────
   日本酒DB — Production root (no prototype scaffolding)
   - IOSDevice / TweaksPanel を除去
   - データ取得を GAS API に委譲（オフライン時は localStorage キャッシュ）
   ─────────────────────────────────────────────────────────── */

const { useState, useEffect, useMemo, useRef } = React;

function App() {
  const { Header, MoodSelector, FilterBar, SortSegment, SakeCard } = window.HomePieces;
  const { FilterSheet, SearchSheet, Toast, LoadingView, CenterState } = window.Sheets;

  // ── data + loading state ──
  const [data, setData] = useState(() => {
    try { const sv = localStorage.getItem('sakedb'); if (sv) return JSON.parse(sv); } catch (e) {}
    return window.SAKE_DATA || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const lastFetchRef = useRef(0);

  // 共通の再フェッチ関数
  const fetchList = React.useCallback(async (opts = {}) => {
    if (!window.API || !window.API.list) return;
    // 連続フェッチ防止（最小5秒）
    if (!opts.force && Date.now() - lastFetchRef.current < 5000) return;
    lastFetchRef.current = Date.now();
    try {
      const fresh = await window.API.list();
      if (Array.isArray(fresh) && fresh.length) {
        setData(fresh);
        try { localStorage.setItem('sakedb', JSON.stringify(fresh)); } catch (e) {}
      }
      setIsError(false);
    } catch (e) {
      setIsError(true);
    }
  }, []);

  // 起動時：ローディング表示付きで取得
  useEffect(() => {
    setIsLoading(true);
    fetchList({ force: true }).finally(() => setIsLoading(false));
  }, [fetchList]);

  // タブが再アクティブになった時に最新化（バックグラウンド復帰・PWA再表示）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchList();
    };
    const onFocus = () => fetchList();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchList]);

  // localStorage への永続化（オフラインキャッシュ）
  useEffect(() => {
    try { localStorage.setItem('sakedb', JSON.stringify(data)); } catch (e) {}
  }, [data]);

  // ── UI state ──
  const [tab, setTab] = useState('home');
  const [mood, setMood] = useState(null);
  const [filters, setFilters] = useState({ pref: '', tags: [], rating: 0 });
  const [sort, setSort] = useState('new');
  const [scrolled, setScrolled] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editSake, setEditSake] = useState(null);
  const [toast, setToast] = useState(null);
  const toastT = useRef(null);
  const appRef = useRef(null);

  const moodDef = mood ? window.MOOD_DEFS.find(m => m.key === mood) : null;

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2200);
  };

  // ── filter + sort ──
  const list = useMemo(() => {
    let arr = data.filter(s => {
      if (filters.pref && s.place !== filters.pref) return false;
      if (filters.rating && s.rating < filters.rating) return false;
      if (filters.tags.length && !filters.tags.every(tg => s.tags.includes(tg))) return false;
      return true;
    });
    if (moodDef) {
      arr = arr.map(s => ({ s, sc: window.scoreFor(s, moodDef) }))
        .filter(x => x.sc > 0)
        .sort((a, b) => b.sc - a.sc || b.s.rating - a.s.rating)
        .map(x => ({ ...x.s, _score: x.sc }));
    } else {
      arr = [...arr].sort((a, b) => {
        if (sort === 'rating') return b.rating - a.rating || b.id - a.id;
        if (sort === 'name') return a.name.localeCompare(b.name, 'ja');
        return b.id - a.id;
      });
    }
    return arr;
  }, [data, filters, moodDef, sort]);

  const activeFilterCount = (filters.pref ? 1 : 0) + filters.tags.length + (filters.rating ? 1 : 0);

  // ── save / delete ──
  const handleSave = async (form) => {
    if (editSake) {
      // optimistic update
      setData(d => d.map(s => s.id === editSake.id ? { ...s, ...form } : s));
      showToast('変更を保存しました');
      if (window.API && window.API.update) {
        try { await window.API.update(editSake.id, form); } catch (e) {}
      }
    } else {
      // optimistic add — 後で API レスポンスで上書き
      const id = Math.max(0, ...data.map(s => s.id)) + 1;
      setData(d => [{ id, ...form }, ...d]);
      showToast('記録を追加しました 🍶');
      if (window.API && window.API.add) {
        try {
          const fresh = await window.API.add(form);
          if (Array.isArray(fresh)) setData(fresh);
        } catch (e) {}
      }
    }
    setAddOpen(false);
    setEditSake(null);
  };

  const handleDelete = async (sake) => {
    setData(d => d.filter(s => s.id !== sake.id));
    setDetail(null);
    showToast('削除しました');
    if (window.API && window.API.del) {
      try { await window.API.del(sake.id); } catch (e) {}
    }
  };

  const openAdd = () => { setEditSake(null); setAddOpen(true); };
  const startEdit = () => {
    const s = detail;
    setDetail(null);
    setTimeout(() => { setEditSake(s); setAddOpen(true); }, 220);
  };

  const applyPref = (p) => { setFilters(f => ({ ...f, pref: p })); setMood(null); setTab('home'); };
  const applyTag = (tg) => { setFilters(f => ({ ...f, tags: f.tags.includes(tg) ? f.tags : [...f.tags, tg] })); setMood(null); setTab('home'); };

  return (
    <div className="app" ref={appRef}>
      <div className="app-bg" />
      <div className="app-blob" />

      {tab === 'home' ? (
        <div className="app-scroll" data-screen-label="ホーム"
          onScroll={e => setScrolled(e.target.scrollTop > 56)}>
          <Header scrolled={scrolled} count={data.length} onSearch={() => setSearchOpen(true)} />
          <MoodSelector moods={window.MOOD_DEFS} selected={mood} onSelect={setMood} />
          <FilterBar filters={filters}
            onOpen={setFilterType}
            onClearPref={() => setFilters(f => ({ ...f, pref: '' }))}
            onClearTag={tg => setFilters(f => ({ ...f, tags: f.tags.filter(x => x !== tg) }))}
            onClearRating={() => setFilters(f => ({ ...f, rating: 0 }))} />
          <SortSegment value={sort} onChange={setSort} moodActive={!!moodDef} />

          {/* mood banner */}
          {moodDef && (
            <div style={{ padding: '0 20px 12px', animation: 'fadeUp .3s' }}>
              <div className="glass" style={{ borderRadius: 'var(--r-md)', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--emerald)' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0 }}>
                  <window.MoodGlyph mood={moodDef.key} size={34} stroke={1.55} color="var(--emerald-deep)" />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{moodDef.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>{moodDef.desc}</div>
                </div>
              </div>
            </div>
          )}

          {/* main area */}
          {isLoading ? <LoadingView /> :
            isError ? (
              <CenterState emoji="📡" title="読み込めませんでした"
                body="データの取得に失敗しました。通信環境を確認してもう一度お試しください。"
                action={<Button variant="soft" leftIcon="search" onClick={() => location.reload()}>再読み込み</Button>} />
            ) : list.length === 0 ? (
              <CenterState emoji={moodDef ? '🍶' : '🔍'}
                title={moodDef ? 'この気分に合う一本がまだ' : '該当する記録がありません'}
                body={moodDef ? 'まだ記録が少ないようです。条件を変えるか、新しい一本を記録しましょう。' : 'フィルタ条件を見直すか、検索してみてください。'}
                action={activeFilterCount > 0
                  ? <Button variant="soft" onClick={() => { setFilters({ pref: '', tags: [], rating: 0 }); setMood(null); }}>フィルタをクリア</Button>
                  : <Button leftIcon="plus" onClick={openAdd}>記録する</Button>} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '2px 20px 130px' }}>
                {list.map((s, i) => (
                  <SakeCard key={s.id} sake={s} index={i}
                    score={moodDef ? (s._score) : null}
                    onOpen={() => setDetail(s)} />
                ))}
              </div>
            )}
        </div>
      ) : (
        <window.BrowseView data={data} onApplyPref={applyPref} onApplyTag={applyTag} onOpenSake={setDetail} />
      )}

      {/* ── Tab bar + FAB ── */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="glass-strong" style={{
          margin: '0 14px 12px', borderRadius: 'var(--r-xl)', height: 64,
          display: 'flex', alignItems: 'center', position: 'relative',
          boxShadow: '0 10px 30px rgba(27,44,42,.14)',
        }}>
          <TabItem icon="home" label="ホーム" active={tab === 'home'} onClick={() => setTab('home')} />
          <div style={{ width: 74 }} />
          <TabItem icon="browse" label="ブラウズ" active={tab === 'browse'} onClick={() => setTab('browse')} />
          {/* FAB */}
          <button onClick={openAdd} aria-label="記録する" style={{
            position: 'absolute', left: '50%', top: -18, transform: 'translateX(-50%)',
            width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(247,251,250,.7)',
            background: 'linear-gradient(160deg, #F7DA78, #F2CD5C)', boxShadow: 'var(--shadow-fab)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onPointerDown={e => e.currentTarget.style.transform = 'translateX(-50%) scale(.93)'}
            onPointerUp={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
            onPointerLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}>
            <Icon name="plus" size={28} color="#5a4410" stroke={2.6} />
          </button>
        </div>
      </div>

      {/* ── Sheets ── */}
      <FilterSheet type={filterType || 'pref'} open={!!filterType} onClose={() => setFilterType(null)}
        data={data} filters={filters} setFilters={setFilters} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} data={data}
        onOpenSake={s => { setSearchOpen(false); setTimeout(() => setDetail(s), 200); }} />
      <window.DetailSheet sake={detail} mood={moodDef} onClose={() => setDetail(null)}
        onEdit={startEdit} onDelete={handleDelete} />
      <window.AddSheet open={addOpen} onClose={() => { setAddOpen(false); setEditSake(null); }}
        onSave={handleSave} editSake={editSake} prefectures={window.PREFECTURES} />
      <Toast toast={toast} />
    </div>
  );
}

function TabItem({ icon, label, active, onClick }) {
  const paths = {
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" /></>,
    browse: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  };
  const c = active ? 'var(--emerald-deep)' : 'var(--ink-3)';
  return (
    <button onClick={onClick} style={{
      flex: 1, height: '100%', border: 'none', background: 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
    }}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: c }}>{label}</span>
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
