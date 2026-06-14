// playlists.jsx — Playlists: list, detail editor (reorder / durations / transitions /
// add content / loop / shuffle / screen assignment) and a live loop preview.
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Empty, PageHeader, Overlay } = window;

  const COLORS = ['#6d6cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];
  const TRANSITIONS = [
    ['cut', 'Cut'], ['fade', 'Fade'], ['dissolve', 'Dissolve'], ['slide', 'Slide'], ['zoom', 'Zoom'],
  ];
  const TRANS_LABEL = Object.fromEntries(TRANSITIONS);

  // ---- duration helpers ----
  const secFromStr = (s) => {
    if (!s || s === '—') return null;
    const [m, sec] = s.split(':').map(Number);
    return (m || 0) * 60 + (sec || 0);
  };
  const fmtDur = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const uid = () => Math.random().toString(36).slice(2, 8);

  // ---- module-scope cache so edits survive page remounts within a session ----
  let PL_CACHE = null;

  function buildSeed(content) {
    const byId = (id) => content.find((c) => c.id === id);
    const item = (cid, transition = 'fade', imgDur = 10) => {
      const c = byId(cid);
      if (!c) return null;
      const vid = c.type === 'video';
      return { uid: uid(), contentId: cid, transition, dur: vid ? (secFromStr(c.dur) || 12) : imgDur };
    };
    const clean = (arr) => arr.filter(Boolean);
    return [
      { id: 'p1', name: 'HQ Lobby Mix', color: '#6d6cf6', loop: true, shuffle: false,
        screenIds: ['s1', 's2'],
        items: clean([item('c1', 'fade'), item('c2', 'dissolve'), item('c6', 'slide', 8), item('c3', 'cut', 8), item('c4', 'zoom', 10)]) },
      { id: 'p2', name: 'Retail Promotions', color: '#ec4899', loop: true, shuffle: true,
        screenIds: ['s4', 's7'],
        items: clean([item('c4', 'zoom', 8), item('c8', 'fade'), item('c1', 'dissolve'), item('c6', 'slide', 7)]) },
      { id: 'p3', name: 'Cafeteria Daily', color: '#f59e0b', loop: true, shuffle: false,
        screenIds: ['s3'],
        items: clean([item('c3', 'fade', 12), item('c6', 'cut', 8)]) },
      { id: 'p4', name: 'Warehouse Ops', color: '#14b8a6', loop: true, shuffle: false,
        screenIds: ['s6'],
        items: clean([item('c5', 'cut'), item('c6', 'fade', 8), item('c3', 'slide', 8)]) },
    ];
  }

  const totalDur = (pl) => pl.items.reduce((s, it) => s + it.dur, 0);

  // ============================================================
  //  small shared monitor frame (mirrors the groups video-wall look)
  // ============================================================
  function Screen({ bg, type, label, style, sheen = true, children }) {
    return (
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', containerType: 'size',
        background: bg || '#05070c', border: '1px solid rgba(255,255,255,.13)',
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.45), 0 14px 30px -20px rgba(0,0,0,.9)', ...style }}>
        {sheen && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,.14), transparent 44%, rgba(0,0,0,.26))' }} />}
        {type === 'video' && (
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            display: 'grid', placeItems: 'center', width: '22cqh', height: '22cqh', borderRadius: 99,
            background: 'rgba(0,0,0,.32)', backdropFilter: 'blur(3px)', color: '#fff' }}><Icon.Play s={13} /></span>
        )}
        {label && (
          <div style={{ position: 'absolute', left: 8, bottom: 7, display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 9px', borderRadius: 99, background: 'rgba(4,6,11,.6)', backdropFilter: 'blur(4px)',
            fontSize: 11, fontWeight: 600, color: '#fff', maxWidth: 'calc(100% - 16px)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        )}
        {children}
      </div>
    );
  }

  // ============================================================
  //  loop player hook — advances through items at an accelerated, watchable speed
  // ============================================================
  const PREVIEW_SPEED = 3; // 3 playlist-seconds per real second

  function useLoopPlayer(items, loop) {
    const [idx, setIdx] = useState(0);
    const [elapsed, setElapsed] = useState(0); // seconds into current item
    const [playing, setPlaying] = useState(false);
    const raf = useRef(0);
    const last = useRef(0);
    const order = useRef([]);

    // keep idx in range when items change
    useEffect(() => { if (idx >= items.length) { setIdx(0); setElapsed(0); } }, [items.length]);

    const tick = useCallback((now) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setElapsed((e) => {
        const cur = items[idx];
        if (!cur) return 0;
        const ne = e + dt * PREVIEW_SPEED;
        if (ne >= cur.dur) {
          const next = idx + 1;
          if (next >= items.length) {
            if (loop) { setIdx(0); return 0; }
            setPlaying(false); return cur.dur;
          }
          setIdx(next); return 0;
        }
        return ne;
      });
      raf.current = requestAnimationFrame(tick);
    }, [idx, items, loop]);

    useEffect(() => {
      if (!playing) return;
      last.current = performance.now();
      raf.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf.current);
    }, [playing, tick]);

    const seek = (i) => { setIdx(i); setElapsed(0); };
    const toggle = () => { if (!items.length) return; if (idx >= items.length) setIdx(0); setPlaying((p) => !p); };
    const cur = items[idx];
    const progress = cur ? Math.min(1, elapsed / cur.dur) : 0;
    return { idx, progress, playing, toggle, seek, setPlaying };
  }

  // ============================================================
  //  inline compact stepper for image durations
  // ============================================================
  function DurStepper({ value, onChange, min = 3, max = 60 }) {
    const btn = { display: 'grid', placeItems: 'center', width: 26, height: 26, border: 'none',
      background: 'transparent', color: 'var(--text-muted)', fontSize: 16, fontWeight: 700, lineHeight: 1 };
    return (
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 9, overflow: 'hidden', background: 'var(--surface)' }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={btn}>−</button>
        <span className="mono" style={{ minWidth: 42, textAlign: 'center', fontWeight: 700, fontSize: 12.5 }}>{value}s</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={btn}>+</button>
      </div>
    );
  }

  function TransPicker({ value, onChange }) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <Icon.Refresh s={13} style={{ position: 'absolute', left: 9, color: 'var(--text-faint)', pointerEvents: 'none' }} />
        <select value={value} onChange={(e) => onChange(e.target.value)}
          style={{ appearance: 'none', WebkitAppearance: 'none', padding: '7px 26px 7px 28px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' }}>
          {TRANSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Icon.Chevron s={13} style={{ position: 'absolute', right: 8, transform: 'rotate(90deg)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
      </div>
    );
  }

  // ============================================================
  //  item row (draggable)
  // ============================================================
  function ItemRow({ item, content, index, active, dragging, over, onDrag, onPatch, onRemove }) {
    const c = content.find((x) => x.id === item.contentId);
    if (!c) return null;
    const vid = c.type === 'video';
    return (
      <div draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDrag('start', index); }}
        onDragEnter={() => onDrag('enter', index)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={() => onDrag('end', index)}
        onDrop={(e) => { e.preventDefault(); onDrag('drop', index); }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12,
          background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
          border: `1px solid ${active ? 'var(--accent)' : over ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: over ? '0 0 0 3px var(--accent-soft)' : 'none',
          opacity: dragging ? 0.4 : 1, cursor: 'default', transition: 'box-shadow .12s, border-color .12s, background .12s' }}>
        <span title="Drag to reorder" style={{ display: 'grid', placeItems: 'center', width: 22, height: 30, color: 'var(--text-faint)', cursor: 'grab', flexShrink: 0 }}>
          <svg width="13" height="18" viewBox="0 0 13 18" fill="currentColor"><circle cx="3.5" cy="3" r="1.4"/><circle cx="9.5" cy="3" r="1.4"/><circle cx="3.5" cy="9" r="1.4"/><circle cx="9.5" cy="9" r="1.4"/><circle cx="3.5" cy="15" r="1.4"/><circle cx="9.5" cy="15" r="1.4"/></svg>
        </span>
        <span className="mono" style={{ width: 20, textAlign: 'center', fontSize: 12, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0 }}>{index + 1}</span>
        <div style={{ position: 'relative', width: 56, height: 34, borderRadius: 6, background: c.thumb, flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.12), transparent 55%, rgba(0,0,0,.2))' }} />
          {vid && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><Icon.Play s={11} /></span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
              {vid ? <Icon.Video s={12} /> : <Icon.Image s={12} />}{vid ? 'video' : 'image'}
            </span>
          </div>
        </div>
        {/* duration */}
        {vid ? (
          <span title="Plays the full video length" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 9,
            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>
            <Icon.Clock s={13} /><span className="mono">{fmtDur(item.dur)}</span>
          </span>
        ) : (
          <DurStepper value={item.dur} onChange={(v) => onPatch({ dur: v })} />
        )}
        <TransPicker value={item.transition} onChange={(v) => onPatch({ transition: v })} />
        <button onClick={onRemove} title="Remove from playlist" style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)' }}><Icon.Trash s={14} /></button>
      </div>
    );
  }

  // ============================================================
  //  add-content picker (popover button)
  // ============================================================
  function AddContent({ content, playlistItemIds, onAdd }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const searchRef = useRef(null);
    useEffect(() => { if (open) { setQ(''); setTimeout(() => searchRef.current && searchRef.current.focus(), 30); } }, [open]);
    const filtered = content.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
    return (
      <div style={{ position: 'relative' }}>
        <Btn variant="soft" size="md" icon={<Icon.Plus s={16} />} onClick={() => setOpen((o) => !o)}>Add content</Btn>
        {open && (
          <React.Fragment>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 8px)', right: 0, width: 320,
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14,
              boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'fadeUp .15s ease both' }}>
              <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}><Icon.Search s={15} /></span>
                  <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…"
                    style={{ width: '100%', padding: '8px 30px 8px 34px', borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
                      background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' }} />
                  {q && <button onClick={() => { setQ(''); searchRef.current && searchRef.current.focus(); }} title="Clear"
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', width: 18, height: 18,
                      borderRadius: 99, border: 'none', background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>✕</button>}
                </div>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', padding: 6 }}>
                {filtered.map((c) => {
                  const vid = c.type === 'video';
                  return (
                    <button key={c.id} className="wall-menu-item" onClick={() => onAdd(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', borderRadius: 10,
                        border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ position: 'relative', width: 44, height: 28, borderRadius: 5, background: c.thumb, flexShrink: 0, overflow: 'hidden' }}>
                        {vid && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><Icon.Play s={10} /></span>}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{vid ? `video · ${c.dur}` : 'image'}</span>
                      </span>
                      <Icon.Plus s={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    </button>
                  );
                })}
                {content.length === 0 && <div style={{ padding: '14px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Your library is empty.</div>}
                {content.length > 0 && filtered.length === 0 && <div style={{ padding: '14px 10px', fontSize: 13, color: 'var(--text-muted)' }}>No content matches “{q}”.</div>}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  // ============================================================
  //  live loop preview card
  // ============================================================
  function PreviewCard({ pl, content }) {
    const player = useLoopPlayer(pl.items, pl.loop);
    const { idx, progress, playing, toggle, seek } = player;
    const total = totalDur(pl);
    const cur = pl.items[idx];
    const c = cur && content.find((x) => x.id === cur.contentId);

    if (!pl.items.length) {
      return (
        <Card>
          <CardHead title="Loop preview" sub="Add content to preview the loop" icon={<Icon.Eye s={18} />} />
          <div style={{ padding: '40px 20px', display: 'grid', placeItems: 'center', borderRadius: 12, border: '1.5px dashed var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-faint)', gap: 8 }}>
            <Icon.Playlists s={26} /><span style={{ fontSize: 13, fontWeight: 600 }}>Empty playlist</span>
          </div>
        </Card>
      );
    }

    return (
      <Card>
        <CardHead title="Loop preview" sub={`${pl.items.length} items · ${fmtDur(total)} total${pl.loop ? ' · loops' : ''}`} icon={<Icon.Eye s={18} />}
          right={<Badge tone={playing ? 'online' : 'neutral'} icon={playing ? <StatusDot status="online" size={6} /> : null}>{playing ? 'Playing' : 'Paused'}</Badge>} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 1fr', gap: 16, alignItems: 'center' }} className="main-grid">
          {/* monitor */}
          <div style={{ padding: 14, borderRadius: 16, border: '1px solid var(--border)', background: 'radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d)' }}>
            <Screen bg={c ? c.thumb : '#05070c'} type={c && c.type} label={c && c.name} style={{ aspectRatio: '16 / 9', width: '100%' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 9px', borderRadius: 99, background: 'rgba(4,6,11,.6)', backdropFilter: 'blur(4px)',
                fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '.03em' }}>{cur ? TRANS_LABEL[cur.transition] : ''}</div>
            </Screen>
          </div>

          {/* controls + up next */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => seek(idx === 0 ? pl.items.length - 1 : idx - 1)} title="Previous"
                style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                <Icon.Chevron s={17} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button onClick={toggle} title={playing ? 'Pause' : 'Play'}
                style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 99, border: 'none', color: '#fff',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 10px 24px -10px var(--accent-ring)' }}>
                {playing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                ) : <Icon.Play s={20} />}
              </button>
              <button onClick={() => seek(idx === pl.items.length - 1 ? 0 : idx + 1)} title="Next"
                style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
                <Icon.Chevron s={17} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>Now playing · item {idx + 1}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c ? c.name : '—'}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                {fmtDur((cur ? cur.dur : 0) * progress)} / {fmtDur(cur ? cur.dur : 0)}
              </div>
            </div>
          </div>
        </div>

        {/* segmented timeline */}
        <div style={{ display: 'flex', gap: 3, marginTop: 16 }}>
          {pl.items.map((it, i) => {
            const fill = i < idx ? 1 : i === idx ? progress : 0;
            return (
              <button key={it.uid} onClick={() => seek(i)} title={`Jump to item ${i + 1}`}
                style={{ position: 'relative', flex: it.dur, height: 7, borderRadius: 99, border: 'none', padding: 0, cursor: 'pointer',
                  background: 'var(--track)', overflow: 'hidden', minWidth: 8 }}>
                <span style={{ position: 'absolute', inset: 0, transformOrigin: 'left', transform: `scaleX(${fill})`,
                  background: i === idx ? 'var(--accent)' : 'var(--accent-2)', opacity: i === idx ? 1 : .65,
                  transition: i === idx ? 'none' : 'transform .2s' }} />
              </button>
            );
          })}
        </div>
      </Card>
    );
  }

  // ============================================================
  //  playlist detail / editor
  // ============================================================
  function PlaylistDetail({ pl, content, screens, screenById, onBack, patch, onDelete, notify }) {
    const [name, setName] = useState(pl.name);
    const [drag, setDrag] = useState({ from: null, over: null });
    useEffect(() => setName(pl.name), [pl.id]);

    const total = totalDur(pl);
    const assigned = pl.screenIds.map((id) => screenById.get(id)).filter(Boolean);
    const available = screens.filter((s) => !pl.screenIds.includes(s.id));

    const patchItem = (i, p) => patch({ items: pl.items.map((it, j) => j === i ? { ...it, ...p } : it) });
    const removeItem = (i) => patch({ items: pl.items.filter((_, j) => j !== i) });
    const addItem = (c) => {
      const vid = c.type === 'video';
      patch({ items: [...pl.items, { uid: uid(), contentId: c.id, transition: 'fade', dur: vid ? (secFromStr(c.dur) || 12) : 10 }] });
      notify && notify({ title: 'Added to playlist', desc: `“${c.name}” appended to ${pl.name}`, tone: 'accent', icon: 'Plus' });
    };

    const onDrag = (phase, index) => {
      if (phase === 'start') setDrag({ from: index, over: index });
      else if (phase === 'enter') setDrag((d) => d.from === null ? d : { ...d, over: index });
      else if (phase === 'drop' || phase === 'end') {
        setDrag((d) => {
          if (d.from !== null && d.over !== null && d.from !== d.over) {
            const arr = pl.items.slice();
            const [moved] = arr.splice(d.from, 1);
            arr.splice(d.over, 0, moved);
            patch({ items: arr });
          }
          return { from: null, over: null };
        });
      }
    };

    const toggleScreen = (id, on) => {
      patch({ screenIds: on ? [...pl.screenIds, id] : pl.screenIds.filter((x) => x !== id) });
    };

    const commitName = () => {
      const n = name.trim();
      if (n && n !== pl.name) { patch({ name: n }); notify && notify({ title: 'Playlist renamed', desc: `Now “${n}”`, tone: 'accent', icon: 'Pencil' }); }
      else setName(pl.name);
    };

    return (
      <div>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16,
          padding: '7px 13px 7px 9px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 600 }}>
          <Icon.ChevronLeft s={17} /> All playlists
        </button>

        {/* header */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--gap)' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, color: '#fff', flexShrink: 0,
            background: `linear-gradient(135deg, ${pl.color}, color-mix(in srgb, ${pl.color} 55%, #fff))` }}><Icon.Playlists s={25} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setName(pl.name); e.target.blur(); } }}
              style={{ width: '100%', fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--text)', background: 'transparent',
                border: '1px solid transparent', borderRadius: 8, padding: '2px 6px', margin: '-2px -6px', fontFamily: 'inherit', outline: 'none' }}
              onFocus={(e) => { e.target.style.background = 'var(--surface-2)'; e.target.style.borderColor = 'var(--border-strong)'; }}
              onMouseDown={(e) => { e.target.style.background = 'var(--surface-2)'; }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7, flexWrap: 'wrap' }}>
              <Badge tone="accent" icon={<Icon.Playlists s={12} />}>{pl.items.length} item{pl.items.length !== 1 ? 's' : ''}</Badge>
              <Badge tone="neutral" icon={<Icon.Clock s={12} />}>{fmtDur(total)}</Badge>
              <Badge tone="neutral" icon={<Icon.Screens s={12} />}>{assigned.length} screen{assigned.length !== 1 ? 's' : ''}</Badge>
              {pl.shuffle && <Badge tone="info" icon={<Icon.Refresh s={12} />}>Shuffle</Badge>}
            </div>
          </div>
          <Btn variant="danger" size="sm" icon={<Icon.Trash s={15} />} onClick={onDelete}>Delete</Btn>
        </Card>

        {/* live preview */}
        <div style={{ marginBottom: 'var(--gap)' }}>
          <PreviewCard pl={pl} content={content} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gap)', alignItems: 'start' }} className="main-grid">
          {/* builder */}
          <Card>
            <CardHead title="Sequence" sub="Drag to reorder · set duration & transition per item" icon={<Icon.List s={18} />}
              right={<AddContent content={content} playlistItemIds={pl.items.map((i) => i.contentId)} onAdd={addItem} />} />
            {pl.items.length === 0 ? (
              <div style={{ padding: '36px 20px', display: 'grid', placeItems: 'center', borderRadius: 12, border: '1.5px dashed var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-faint)', gap: 8 }}>
                <Icon.Plus s={22} /><span style={{ fontSize: 13, fontWeight: 600 }}>No items yet — add content to build the loop</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pl.items.map((it, i) => (
                  <ItemRow key={it.uid} item={it} content={content} index={i}
                    dragging={drag.from === i} over={drag.over === i && drag.from !== null && drag.from !== i}
                    onDrag={onDrag} onPatch={(p) => patchItem(i, p)} onRemove={() => removeItem(i)} />
                ))}
              </div>
            )}
          </Card>

          {/* settings + screens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            <Card>
              <CardHead title="Playback" sub="How this playlist behaves on screen" icon={<Icon.Settings s={18} />} />
              <Toggle label="Loop continuously" desc="Restart from the top when the loop ends" value={pl.loop} onChange={(v) => patch({ loop: v })} icon="Refresh" />
              <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
              <Toggle label="Shuffle order" desc="Randomise item order on each pass" value={pl.shuffle} onChange={(v) => patch({ shuffle: v })} icon="Sparkle" />
              <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>Accent colour</div>
                <div style={{ display: 'flex', gap: 9 }}>
                  {COLORS.map((cc) => (
                    <button key={cc} type="button" onClick={() => patch({ color: cc })} style={{ width: 26, height: 26, borderRadius: 8, cursor: 'pointer',
                      background: cc, border: pl.color === cc ? '2px solid #fff' : '2px solid transparent', boxShadow: pl.color === cc ? `0 0 0 2px ${cc}` : 'none' }} />
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Assigned screens" sub={assigned.length ? `Playing on ${assigned.length} screen${assigned.length !== 1 ? 's' : ''}` : 'Not assigned yet'} icon={<Icon.Screens s={18} />} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {assigned.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 30, height: 19, borderRadius: 4, flexShrink: 0, background: s.thumb }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.res2} · {s.loc}</div>
                    </div>
                    <StatusDot status={s.status} size={7} />
                    <button onClick={() => toggleScreen(s.id, false)} title="Unassign" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8,
                      border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)' }}><Icon.Trash s={14} /></button>
                  </div>
                ))}
                {assigned.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>No screens assigned.</div>}
              </div>
              {available.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <select value="" onChange={(e) => e.target.value && toggleScreen(e.target.value, true)}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
                      background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)', outline: 'none' }}>
                    <option value="">+ Assign a screen…</option>
                    {available.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.loc}</option>)}
                  </select>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  function Toggle({ label, desc, value, onChange, icon }) {
    const IconC = Icon[icon] || Icon.Check;
    return (
      <button type="button" onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: value ? 'var(--accent-soft)' : 'var(--surface-3)', color: value ? 'var(--accent)' : 'var(--text-faint)' }}><IconC s={18} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</span>
        </span>
        <span style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, flexShrink: 0, transition: 'background .18s',
          background: value ? 'var(--accent)' : 'var(--surface-3)', border: '1px solid var(--border-strong)' }}>
          <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 2px 5px rgba(0,0,0,.3)' }} />
        </span>
      </button>
    );
  }

  // ============================================================
  //  new playlist modal
  // ============================================================
  function NewPlaylistModal({ content, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [sel, setSel] = useState([]);
    const [q, setQ] = useState('');
    const valid = name.trim().length > 1;
    const toggle = (id) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    const filtered = content.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

    const create = () => {
      if (!valid) return;
      const items = sel.map((id) => {
        const c = content.find((x) => x.id === id);
        const vid = c.type === 'video';
        return { uid: uid(), contentId: id, transition: 'fade', dur: vid ? (secFromStr(c.dur) || 12) : 10 };
      });
      onCreate({ id: 'p' + Date.now(), name: name.trim(), color, loop: true, shuffle: false, screenIds: [], items });
    };

    const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
      background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' };

    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}><Icon.Playlists s={21} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>New playlist</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sequence content into a loop</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Playlist name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lobby Welcome Loop" autoFocus style={inp} />
            </label>

            <div>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>Accent colour</span>
              <div style={{ display: 'flex', gap: 9 }}>
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                    background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }} />
                ))}
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>
                Add content {sel.length > 0 && <span style={{ color: 'var(--accent)' }}>· {sel.length} selected</span>}
              </span>
              {content.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0' }}>Your library is empty.</div>
              ) : (
                <React.Fragment>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}><Icon.Search s={16} /></span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content library…"
                      style={{ ...inp, padding: '10px 34px 10px 36px', fontSize: 13.5 }} />
                    {q && <button onClick={() => setQ('')} title="Clear"
                      style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', width: 20, height: 20,
                        borderRadius: 99, border: 'none', background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>✕</button>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 230, overflowY: 'auto' }}>
                    {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 2px' }}>No content matches “{q}”.</div>}
                    {filtered.map((c) => {
                    const on = sel.includes(c.id);
                    const vid = c.type === 'video';
                    return (
                      <button key={c.id} type="button" onClick={() => toggle(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 11px', borderRadius: 11, textAlign: 'left',
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff' }}>
                          {on && <Icon.Check s={12} sw={3} />}
                        </span>
                        <span style={{ position: 'relative', width: 44, height: 28, borderRadius: 5, background: c.thumb, flexShrink: 0, overflow: 'hidden' }}>
                          {vid && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><Icon.Play s={10} /></span>}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{vid ? `video · ${c.dur}` : 'image'}</span>
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, padding: 24, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
            <Btn variant={valid ? 'primary' : 'ghost'} onClick={valid ? create : undefined} full
              icon={<Icon.Plus s={17} />} style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Create playlist</Btn>
          </div>
        </div>
      </Overlay>
    );
  }

  // ============================================================
  //  list card
  // ============================================================
  function PlaylistCard({ pl, content, screenById, onOpen, onDuplicate, onDelete }) {
    const [menu, setMenu] = useState(false);
    const total = totalDur(pl);
    const screens = pl.screenIds.filter((id) => screenById.has(id)).length;
    const strip = pl.items.slice(0, 6);
    const MENU_ITEM = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px',
      borderRadius: 9, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 };
    return (
      <Card hover style={{ overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, color: '#fff', flexShrink: 0,
            background: `linear-gradient(135deg, ${pl.color}, color-mix(in srgb, ${pl.color} 55%, #fff))` }}><Icon.Playlists s={22} /></span>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
            <div style={{ fontWeight: 700, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{pl.items.length} items · {fmtDur(total)}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu((m) => !m)} title="Actions" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: menu ? 'var(--surface-3)' : 'transparent', color: 'var(--text-muted)' }}><Icon.Dots s={18} /></button>
            {menu && (
              <React.Fragment>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', right: 0, minWidth: 190,
                  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', padding: 6, animation: 'fadeUp .15s ease both' }}>
                  <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--text)' }} onClick={() => { onOpen(); setMenu(false); }}>
                    <Icon.Pencil s={16} style={{ color: 'var(--text-muted)' }} /> Open editor
                  </button>
                  <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--text)' }} onClick={() => { onDuplicate(); setMenu(false); }}>
                    <Icon.Copy s={16} style={{ color: 'var(--text-muted)' }} /> Duplicate
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                  <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--offline)' }} onClick={() => { onDelete(); setMenu(false); }}>
                    <Icon.Trash s={15} /> Delete
                  </button>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
        {/* thumbnail strip */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14, cursor: 'pointer' }} onClick={onOpen}>
          {strip.length ? strip.map((it, i) => {
            const c = content.find((x) => x.id === it.contentId);
            return (
              <div key={it.uid} style={{ position: 'relative', flex: 1, height: 40, borderRadius: 6, overflow: 'hidden',
                background: c ? c.thumb : 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.1), transparent 55%, rgba(0,0,0,.2))' }} />
                {c && c.type === 'video' && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><Icon.Play s={10} /></span>}
              </div>
            );
          }) : <div style={{ flex: 1, height: 40, borderRadius: 6, border: '1.5px dashed var(--border-strong)', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 11.5, fontWeight: 600 }}>Empty</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 7 }}>
            <Badge tone={screens ? 'accent' : 'neutral'} icon={<Icon.Screens s={13} />}>{screens} screen{screens !== 1 ? 's' : ''}</Badge>
            {pl.shuffle && <Badge tone="info" icon={<Icon.Refresh s={12} />}>Shuffle</Badge>}
          </div>
          <Btn variant="ghost" size="sm" iconRight={<Icon.Arrow s={14} />} onClick={onOpen}>Open</Btn>
        </div>
      </Card>
    );
  }

  // ============================================================
  //  page
  // ============================================================
  function PlaylistsPage({ playlists, content, screens, seeded, onLoadSample, notify }) {
    if (!seeded) return (
      <div>
        <PageHeader title="Playlists" sub="Sequence content into loops" />
        <Card animate style={{ padding: '64px 24px' }}>
          <Empty icon={<Icon.Playlists s={26} />} title="No playlists yet" desc="Group content into ordered loops with per-item durations and transitions, then assign them to screens."
            action={<Btn variant="primary" icon={<Icon.Sparkle s={16} />} onClick={onLoadSample}>Load sample data</Btn>} />
        </Card>
      </div>
    );

    const screenById = new Map(screens.map((s) => [s.id, s]));
    const [lists, setLists] = useState(() => { if (!PL_CACHE) PL_CACHE = buildSeed(content); return PL_CACHE; });
    const [selId, setSelId] = useState(null);
    const [modal, setModal] = useState(false);
    useEffect(() => { PL_CACHE = lists; }, [lists]);

    const patch = (id, p) => setLists((ls) => ls.map((l) => l.id === id ? { ...l, ...p } : l));
    const selected = lists.find((l) => l.id === selId);

    const duplicate = (pl) => {
      const copy = { ...pl, id: 'p' + Date.now(), name: pl.name + ' (copy)', screenIds: [],
        items: pl.items.map((it) => ({ ...it, uid: uid() })) };
      setLists((ls) => [...ls, copy]);
      notify && notify({ title: 'Playlist duplicated', desc: `“${copy.name}” created`, tone: 'accent', icon: 'Copy' });
    };
    const remove = (pl) => {
      setLists((ls) => ls.filter((l) => l.id !== pl.id));
      notify && notify({ title: 'Playlist deleted', desc: `“${pl.name}” removed`, tone: 'offline', icon: 'Trash' });
    };

    if (selected) return (
      <PlaylistDetail pl={selected} content={content} screens={screens} screenById={screenById}
        onBack={() => setSelId(null)} patch={(p) => patch(selected.id, p)} notify={notify}
        onDelete={() => { remove(selected); setSelId(null); }} />
    );

    return (
      <div>
        <PageHeader title="Playlists" sub={`${lists.length} playlist${lists.length !== 1 ? 's' : ''}`}
          actions={<Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setModal(true)}>New playlist</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--gap)' }}>
          {lists.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} content={content} screenById={screenById}
              onOpen={() => setSelId(pl.id)} onDuplicate={() => duplicate(pl)} onDelete={() => remove(pl)} />
          ))}
        </div>
        {modal && <NewPlaylistModal content={content} onClose={() => setModal(false)}
          onCreate={(pl) => { setLists((ls) => [...ls, pl]); setModal(false); setSelId(pl.id);
            notify && notify({ title: 'Playlist created', desc: `“${pl.name}” is ready to edit`, tone: 'accent', icon: 'Playlists' }); }} />}
      </div>
    );
  }

  Object.assign(window, { PlaylistsPage });
})();
