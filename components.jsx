/* ───────────────────────────────────────────────────────────
   日本酒DB — shared UI components
   Exported to window for use across script files.
   ─────────────────────────────────────────────────────────── */

// Hooks declared once here (first-loaded babel file) → shared across all scripts
const { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } = React;

// ── Icons (simple single-path glyphs) ────────────────────────
function Icon({ name, size = 20, color = 'currentColor', stroke = 2, style }) {
  const p = {
    search:  <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    plus:    <><path d="M12 5v14M5 12h14"/></>,
    x:       <><path d="M6 6l12 12M18 6L6 18"/></>,
    chevDown:<><path d="M6 9l6 6 6-6"/></>,
    chevLeft:<><path d="M15 6l-6 6 6 6"/></>,
    chevRight:<><path d="M9 6l6 6-6 6"/></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.4" fill="#fff"/><circle cx="15" cy="12" r="2.4" fill="#fff"/><circle cx="8" cy="18" r="2.4" fill="#fff"/></>,
    trash:   <><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/></>,
    edit:    <><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
    check:   <><path d="M5 12l5 5L20 6"/></>,
    location:<><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5" fill="#fff"/></>,
    bottle:  <><path d="M10 2h4M11 2v3.5c0 .6-.2 1-.6 1.5C9.4 8.2 9 9.2 9 11v9a1 1 0 001 1h4a1 1 0 001-1v-9c0-1.8-.4-2.8-1.4-4-.4-.5-.6-.9-.6-1.5V2"/></>,
    camera:  <><path d="M3 9a2 2 0 012-2h1.5l1.2-2h6.6l1.2 2H20a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.4"/></>,
    image:   <><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 15.5l-4.5-4.5L8 19.5"/></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style}>{p}</svg>
  );
}

// ── Photo placeholder (deterministic tint + serif initial) ────
const PH_TINTS = [
  ['#D1E3E6', '#3f6f74'],
  ['#B4D9D5', '#3a6e67'],
  ['#F2E6A7', '#9a7d27'],
  ['#dfeee9', '#4d8579'],
  ['#e8eef0', '#4a6b70'],
];
function hashStr(s) { let h = 0; for (let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }

function PhotoPlaceholder({ name, size = 'card' }) {
  const [bg, fg] = PH_TINTS[hashStr(name) % PH_TINTS.length];
  const initial = (name || '酒').trim()[0];
  const big = size === 'detail';
  return (
    <div style={{
      width:'100%', height:'100%', position:'relative', overflow:'hidden',
      background:`linear-gradient(150deg, ${bg}, ${bg}ee)`,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div className="ph-stripes" style={{ position:'absolute', inset:0, opacity:.5 }} />
      <span style={{
        fontFamily:'var(--jp)', fontWeight:300, color:fg,
        fontSize: big ? 92 : 36, opacity:.9, lineHeight:1,
        position:'relative', zIndex:1, letterSpacing:'-.02em',
      }}>{initial}</span>
      {big && (
        <span style={{
          position:'absolute', bottom:10, left:0, right:0, textAlign:'center',
          fontFamily:'ui-monospace, monospace', fontSize:10, letterSpacing:1.5,
          color:fg, opacity:.7, textTransform:'uppercase', zIndex:1,
        }}>drive photo</span>
      )}
    </div>
  );
}

// ── Star rating ──────────────────────────────────────────────
function Star({ filled, half, size = 16, onClick }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', flexShrink:0 }}>
      <defs>
        {half && <linearGradient id="halfg"><stop offset="50%" stopColor="var(--gold)"/><stop offset="50%" stopColor="#e4ebe9"/></linearGradient>}
      </defs>
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
        fill={filled ? 'var(--gold)' : half ? 'url(#halfg)' : '#e4ebe9'}
        stroke={filled||half ? 'var(--gold)' : '#d3dddb'} strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  );
}
function Stars({ value = 0, size = 16, interactive = false, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, alignItems:'center' }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} filled={value >= n} size={size}
          onClick={interactive ? () => onChange && onChange(n) : undefined} />
      ))}
    </div>
  );
}

// ── Chip ─────────────────────────────────────────────────────
// variant: prefecture | kind | flavor | neutral | mood
function tagVariant(tag) {
  if (window.PREFECTURES && window.PREFECTURES.includes(tag)) return 'prefecture';
  if (window.KINDS && window.KINDS.includes(tag)) return 'kind';
  return 'flavor';
}
const CHIP_STYLE = {
  prefecture: { background:'var(--mint-grey)', color:'#2c5650', border:'1px solid transparent' },
  kind:       { background:'transparent', color:'var(--emerald-deep)', border:'1.5px solid var(--emerald)' },
  flavor:     { background:'var(--pale-yellow)', color:'#8a6d1e', border:'1px solid transparent' },
  neutral:    { background:'#eef3f3', color:'var(--ink-2)', border:'1px solid var(--line)' },
};
function Chip({ label, tag, variant, size = 'md', onRemove, onClick, active, style }) {
  const v = variant || (tag ? tagVariant(tag) : 'neutral');
  const base = CHIP_STYLE[v] || CHIP_STYLE.neutral;
  const pad = size === 'sm' ? '3px 9px' : '5px 12px';
  const fs = size === 'sm' ? 11.5 : 13;
  return (
    <span onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding: onRemove ? `${pad.split(' ')[0]} 7px ${pad.split(' ')[0]} 12px` : pad,
      borderRadius:'var(--r-pill)', fontSize:fs, fontWeight:600,
      lineHeight:1.3, whiteSpace:'nowrap', userSelect:'none',
      cursor: onClick ? 'pointer' : 'default',
      ...(active ? { background:'var(--emerald)', color:'#fff', border:'1px solid var(--emerald)' } : base),
      ...style,
    }}>
      {label || tag}
      {onRemove && (
        <span onClick={(e)=>{e.stopPropagation();onRemove();}} style={{
          display:'inline-flex', width:16, height:16, borderRadius:'50%',
          alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,.08)',
        }}>
          <Icon name="x" size={10} stroke={2.6} />
        </span>
      )}
    </span>
  );
}

// ── Button ───────────────────────────────────────────────────
function Button({ children, variant = 'primary', size = 'md', full, onClick, style, disabled, leftIcon }) {
  const sizes = {
    sm: { padding:'8px 14px', fontSize:13.5, height:38 },
    md: { padding:'12px 20px', fontSize:15, height:48 },
    lg: { padding:'15px 24px', fontSize:16, height:54 },
  }[size];
  const variants = {
    primary:   { background:'var(--gold)', color:'#5a4410', boxShadow:'var(--shadow-fab)', border:'none' },
    emerald:   { background:'var(--emerald)', color:'#fff', boxShadow:'0 4px 12px rgba(104,166,155,.3)', border:'none' },
    ghost:     { background:'transparent', color:'var(--ink-2)', border:'1.5px solid var(--line)' },
    soft:      { background:'#fff', color:'var(--ink)', border:'1px solid var(--line)', boxShadow:'var(--shadow-card)' },
    danger:    { background:'#fff', color:'#c0492f', border:'1.5px solid #e9cdc5' },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
      borderRadius:'var(--r-pill)', fontWeight:700, fontFamily:'var(--jp)',
      width: full ? '100%' : undefined, letterSpacing:.3,
      opacity: disabled ? .45 : 1, transition:'transform .12s, box-shadow .2s',
      ...sizes, ...variants, ...style,
    }}
      onPointerDown={(e)=>{ if(!disabled) e.currentTarget.style.transform='scale(.97)'; }}
      onPointerUp={(e)=>{ e.currentTarget.style.transform='scale(1)'; }}
      onPointerLeave={(e)=>{ e.currentTarget.style.transform='scale(1)'; }}
    >
      {leftIcon && <Icon name={leftIcon} size={18} stroke={2.4} />}
      {children}
    </button>
  );
}

// ── Icon button (round, glassy) ──────────────────────────────
function IconButton({ name, onClick, size = 44, iconSize = 20, style, badge }) {
  return (
    <button onClick={onClick} style={{
      width:size, height:size, borderRadius:'50%', border:'1px solid var(--line)',
      background:'#fff', boxShadow:'var(--shadow-card)', position:'relative',
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      ...style,
    }}>
      <Icon name={name} size={iconSize} color="var(--ink)" stroke={2.2} />
      {badge != null && badge > 0 && (
        <span style={{
          position:'absolute', top:-2, right:-2, minWidth:18, height:18, padding:'0 5px',
          borderRadius:9, background:'var(--gold)', color:'#5a4410',
          fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
          border:'2px solid rgba(247,250,250,.9)',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ── Score badge (mood mode) ──────────────────────────────────
function ScoreBadge({ score, style }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:3,
      background:'var(--pale-yellow)', color:'#8a6d1e',
      padding:'3px 9px 3px 7px', borderRadius:'var(--r-pill)',
      fontWeight:800, fontSize:12.5, boxShadow:'inset 0 0 0 1px rgba(154,125,39,.18)',
      ...style,
    }}>
      <span style={{ fontSize:13, lineHeight:1 }}>★</span>
      <span className="num">{score}</span>
    </span>
  );
}

// ── Mood glyphs (custom line-icon set, replaces emoji) ───────
function MoodGlyph({ mood, size = 26, color = 'currentColor', stroke = 1.7 }) {
  const dot = { fill:color, stroke:'none' };
  const g = {
    // お祝い・贅沢 — sparkle burst (1 large + 2 small)
    celebrate: <>
      <path d="M11.5 2.3c.6 5.1 1.3 5.8 6.4 6.4-5.1.6-5.8 1.3-6.4 6.4-.6-5.1-1.3-5.8-6.4-6.4 5.1-.6 5.8-1.3 6.4-6.4z"/>
      <path d="M18.6 13.2c.3 2 .6 2.3 2.6 2.6-2 .3-2.3.6-2.6 2.6-.3-2-.6-2.3-2.6-2.6 2-.3 2.3-.6 2.6-2.6z"/>
      <circle cx="5" cy="18.4" r="1.15" {...dot}/>
    </>,
    // 乾杯・はじまり — two ochoko cups clinking
    kanpai: <>
      <g transform="rotate(-13 8.5 12)">
        <ellipse cx="7.6" cy="8" rx="3.2" ry="1.05"/>
        <path d="M4.4 8l.95 6.4a1.1 1.1 0 001.08.92h2.36a1.1 1.1 0 001.08-.92L10.8 8"/>
      </g>
      <g transform="rotate(13 15.5 12)">
        <ellipse cx="16.4" cy="8" rx="3.2" ry="1.05"/>
        <path d="M13.2 8l.95 6.4a1.1 1.1 0 001.08.92h2.36a1.1 1.1 0 001.08-.92L19.6 8"/>
      </g>
      <path d="M12 3.4v1.7M11.15 4.25h1.7"/>
    </>,
    // あっさり — fresh leaf with veins
    light: <>
      <path d="M4.5 19.5C4.5 11 11 4.5 19.5 4.5c0 8.5-6.5 15-15 15z"/>
      <path d="M4.5 19.5L19 5"/>
      <path d="M9 14.2l3.3.5M12.4 10.8l3.3.5"/>
    </>,
    // 濃い料理 — flame with inner core
    rich: <>
      <path d="M12 2.2c.5 4.6-4.1 5.3-4.1 10.1a4.1 4.1 0 008.2 0c0-2.5-1.5-3.3-1.5-5.3-1.1 1.2-2.6.8-2.6-4.8z"/>
      <path d="M11.9 12c-.95.9-1.35 1.6-1.35 2.5a1.85 1.85 0 003.7 0c0-1-.6-1.5-1.05-2.3-.35.6-1 .55-1.3-.2z"/>
    </>,
    // デザート — parfait: scoop + cherry + waffle cone
    dessert: <>
      <circle cx="12" cy="4" r="1.15" {...dot}/>
      <path d="M12 5.1v1.5"/>
      <path d="M6.9 9.4a5.1 5.1 0 0110.2 0z"/>
      <path d="M7.6 9.9L12 19l4.4-9.1"/>
      <path d="M9.2 12.2l5.1.7M9 14l5.4.75"/>
    </>,
    // ゆっくり夜酒 — crescent moon + star
    night: <>
      <path d="M21 12.4A8.6 8.6 0 1 1 11.5 3 6.7 6.7 0 0 0 21 12.4z"/>
      <path d="M16.6 5.1l.55 1.5 1.5.55-1.5.55-.55 1.5-.55-1.5-1.5-.55 1.5-.55z" {...dot}/>
    </>,
    // 暑い日キリッと — sun with rays
    hot: <>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6M5.1 5.1l1.85 1.85M17.05 17.05l1.85 1.85M18.9 5.1l-1.85 1.85M6.95 17.05l-1.85 1.85"/>
    </>,
    // 冒険・個性派 — flask with bubbles
    adventure: <>
      <path d="M9.6 2.6h4.8M10.7 2.6v6L5.9 17.4a1.3 1.3 0 001.12 1.95h9.96a1.3 1.3 0 001.12-1.95L13.3 8.6V2.6"/>
      <path d="M8 13.6h8"/>
      <circle cx="10.6" cy="15.7" r=".7"/>
      <circle cx="13.3" cy="16.8" r=".55"/>
      <circle cx="12" cy="14.6" r=".5"/>
    </>,
  }[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{g}</svg>
  );
}

// ── Sake image: real photo if present, else placeholder ──────
function SakeImage({ src, name, size }) {
  if (src) {
    return <img src={src} alt={name} loading="lazy" style={{
      width:'100%', height:'100%', objectFit:'cover', display:'block',
    }} />;
  }
  return <PhotoPlaceholder name={name} size={size} />;
}

Object.assign(window, {
  Icon, PhotoPlaceholder, MoodGlyph, SakeImage, Star, Stars, Chip, Button, IconButton, ScoreBadge, tagVariant,
});
