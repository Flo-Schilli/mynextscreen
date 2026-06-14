// groups.jsx — Screen Groups: list, detail (mirror / split video-wall), new-group modal
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Empty, PageHeader, Overlay } = window;
  const grad = window.MOCK.grad;

  const COLORS = ['#6d6cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6'];
  const MODES = [
    ['mirror', 'Mirror', 'Same content on every screen at once', 'Copy'],
    ['split', 'Split', 'One image or video spread across a video wall', 'Grid'],
  ];

  // module-scope cache so created/edited groups survive page remounts within a session
  let GROUPS_CACHE = null;

  function buildSeed(screens) {
    const ids = new Set(screens.map((s) => s.id));
    const keep = (arr) => arr.filter((id) => ids.has(id));
    return (window.MOCK.GROUPS || []).map((g) => ({ ...g, screenIds: keep(g.screenIds) }));
  }

  // ---------------- video-wall preview ----------------
  function MonitorFrame({ content, slice, label, status, empty, style, children }) {
    return (
      <div style={{ position: 'relative', borderRadius: 9, overflow: 'hidden', containerType: 'size',
        background: '#05070c', border: '1px solid rgba(255,255,255,.13)',
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.5), 0 12px 28px -18px rgba(0,0,0,.9)', ...style }}>
        {empty ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', gap: 4,
            border: '1.5px dashed rgba(255,255,255,.15)', borderRadius: 9, background: 'rgba(255,255,255,.02)', color: 'var(--text-faint)' }}>
            <Icon.Plus s={16} />
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em' }}>Empty</span>
          </div>
        ) : (
          <React.Fragment>
            <div style={{ position: 'absolute', background: content.bg, display: 'grid', placeItems: 'center',
              ...(slice
                ? { width: `${slice.cols * 100}%`, height: `${slice.rows * 100}%`, left: `${-slice.c * 100}%`, top: `${-slice.r * 100}%` }
                : { inset: 0 }) }}>
              <div style={{ fontWeight: 900, letterSpacing: '-.04em', color: 'rgba(255,255,255,.96)', lineHeight: .85,
                whiteSpace: 'nowrap', textShadow: '0 2px 18px rgba(0,0,0,.28)',
                fontSize: slice ? `${slice.rows * 30}cqh` : '30cqh' }}>{content.label}</div>
            </div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(255,255,255,.14), transparent 42%, rgba(0,0,0,.28))' }} />
            {content.type === 'video' && !slice && (
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                display: 'grid', placeItems: 'center', width: '26cqh', height: '26cqh', borderRadius: 99,
                background: 'rgba(0,0,0,.34)', backdropFilter: 'blur(3px)', color: '#fff' }}><Icon.Play s={14} /></span>
            )}
            {label && (
              <div style={{ position: 'absolute', left: 7, bottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', borderRadius: 99, background: 'rgba(4,6,11,.62)', backdropFilter: 'blur(4px)',
                fontSize: 10.5, fontWeight: 600, color: '#fff', maxWidth: 'calc(100% - 14px)' }}>
                <StatusDot status={status || 'online'} size={6} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              </div>
            )}
          </React.Fragment>
        )}
        {children}
      </div>
    );
  }

  function WallMount({ children }) {
    return (
      <div style={{ padding: 16, borderRadius: 16, border: '1px solid var(--border)',
        background: 'radial-gradient(130% 130% at 50% -10%, #0d1320, #06080d)' }}>
        {children}
      </div>
    );
  }

  const MENU_ITEM = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px',
    borderRadius: 9, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' };

  function WallCell({ idx, r, c, rows, cols, content, screen, placeable, onAssign, open, setOpen }) {
    const [hover, setHover] = useState(false);
    const active = hover || open;
    const upward = r >= rows - 1 && rows > 1;
    return (
      <div style={{ position: 'relative', zIndex: open ? 20 : 1 }}>
        <MonitorFrame content={content} slice={{ r, c, rows, cols }} label={screen ? screen.name : undefined}
          status={screen && screen.status} empty={!screen} style={{ height: '100%' }}>
          <button onClick={() => setOpen(open ? null : idx)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            title="Assign a screen to this panel"
            style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 9,
              boxShadow: active ? 'inset 0 0 0 2px var(--accent)' : 'none', transition: 'box-shadow .15s' }} />
          <span style={{ position: 'absolute', top: 6, right: 6, pointerEvents: 'none', display: 'grid', placeItems: 'center',
            width: 22, height: 22, borderRadius: 7, color: '#fff', transition: 'background .15s',
            background: active ? 'var(--accent)' : 'rgba(4,6,11,.62)', backdropFilter: 'blur(4px)' }}>
            <Icon.Pencil s={12} />
          </span>
        </MonitorFrame>
        {open && (
          <React.Fragment>
            <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', zIndex: 30, left: 0, minWidth: 'min(264px, 80vw)', maxWidth: 300,
              ...(upward ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14,
              boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'fadeUp .16s ease both' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700,
                letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Panel {idx + 1} · Row {r + 1} · Col {c + 1}
              </div>
              <div style={{ maxHeight: 244, overflowY: 'auto', padding: 6 }}>
                {screen && (
                  <button className="wall-menu-item" style={MENU_ITEM} onClick={() => { onAssign(idx, ''); setOpen(null); }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 22, borderRadius: 5, flexShrink: 0,
                      background: 'var(--surface-3)', color: 'var(--text-faint)' }}><Icon.Trash s={13} /></span>
                    <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>Leave empty</span>
                  </button>
                )}
                {placeable.map((s) => {
                  const sel = screen && screen.id === s.id;
                  return (
                    <button key={s.id} className="wall-menu-item" onClick={() => { onAssign(idx, s.id); setOpen(null); }}
                      style={{ ...MENU_ITEM, background: sel ? 'var(--accent-soft)' : 'transparent' }}>
                      <span style={{ width: 30, height: 22, borderRadius: 5, flexShrink: 0, background: s.thumb }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          color: sel ? 'var(--accent)' : 'var(--text)' }}>{s.name}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{s.loc}</span>
                      </span>
                      <StatusDot status={s.status} size={7} />
                      {sel && <Icon.Check s={15} style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
                {placeable.length === 0 && !screen && (
                  <div style={{ padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>All screens are already placed.</div>
                )}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  function WallPreview({ group, screenById, screens, onAssign }) {
    const [openCell, setOpenCell] = useState(null);
    if (group.mode === 'mirror') {
      const mons = group.screenIds.map((id) => screenById.get(id)).filter(Boolean);
      const show = mons.length ? mons : [null];
      return (
        <WallMount>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {show.map((s, i) => (
              <MonitorFrame key={i} content={group.content} label={s ? s.name : 'No screens yet'} status={s && s.status}
                style={{ flex: '1 1 200px', maxWidth: 240, aspectRatio: '16 / 9' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 13, fontSize: 12.5, color: 'var(--text-faint)' }}>
            Every screen mirrors the same content, perfectly in sync.
          </div>
        </WallMount>
      );
    }
    // split
    const { rows, cols } = group;
    const cells = Array.from({ length: rows * cols });
    return (
      <WallMount>
        <div style={{ maxWidth: cols >= rows ? 680 : 420, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: 8, aspectRatio: `${cols * 16} / ${rows * 9}`, width: '100%' }}>
            {cells.map((_, idx) => {
              const r = Math.floor(idx / cols), c = idx % cols;
              const s = screenById.get(group.screenIds[idx]);
              if (!onAssign) return <MonitorFrame key={idx} content={group.content} slice={{ r, c, rows, cols }}
                label={s ? s.name : undefined} status={s && s.status} empty={!s} style={{ height: '100%' }} />;
              const placeable = screens.filter((sc) => !group.screenIds.includes(sc.id) || (s && s.id === sc.id));
              return <WallCell key={idx} idx={idx} r={r} c={c} rows={rows} cols={cols} content={group.content}
                screen={s} placeable={placeable} onAssign={onAssign} open={openCell === idx} setOpen={setOpenCell} />;
            })}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 13, fontSize: 12.5, color: 'var(--text-faint)' }}>
          One source split across a {cols}×{rows} wall — {onAssign ? 'click any panel to place its screen.' : 'each panel renders its own region.'}
        </div>
      </WallMount>
    );
  }

  // ---------------- small controls ----------------
  function ModeToggle({ value, onChange }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {MODES.map(([k, title, desc, icon]) => {
          const active = value === k;
          const IconC = Icon[icon];
          return (
            <button key={k} type="button" onClick={() => onChange(k)}
              style={{ textAlign: 'left', padding: 14, borderRadius: 13, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: active ? 'var(--accent-soft)' : 'transparent',
                boxShadow: active ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, marginBottom: 10,
                background: active ? 'var(--accent)' : 'var(--surface-3)', color: active ? '#fff' : 'var(--text-muted)' }}><IconC s={18} /></span>
              <div style={{ fontWeight: 700, fontSize: 14, color: active ? 'var(--accent)' : 'var(--text)' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
            </button>
          );
        })}
      </div>
    );
  }

  function Stepper({ label, value, min = 1, max = 4, onChange }) {
    const btn = { display: 'grid', placeItems: 'center', width: 32, height: 32, border: 'none', background: 'transparent',
      color: 'var(--text-muted)', fontSize: 18, fontWeight: 700 };
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
          <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={btn}>−</button>
          <span className="mono" style={{ width: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{value}</span>
          <button type="button" onClick={() => onChange(Math.min(max, value + 1))} style={btn}>+</button>
        </div>
      </div>
    );
  }

  // ---------------- group detail ----------------
  function GroupDetail({ group, screens, screenById, onBack, patch, onDelete }) {
    const isSplit = group.mode === 'split';
    const cellsNeeded = group.rows * group.cols;
    const available = screens.filter((s) => !group.screenIds.includes(s.id));
    const IconC = Icon[group.icon] || Icon.Groups;

    // monitors actually placed (split keeps positions; mirror is a flat list)
    const placed = [];
    if (isSplit) { for (let i = 0; i < cellsNeeded; i++) { const s = screenById.get(group.screenIds[i]); if (s) placed.push({ s, cell: i }); } }
    else { group.screenIds.forEach((id) => { const s = screenById.get(id); if (s) placed.push({ s }); }); }
    const assignedCount = placed.length;

    const assignCell = (idx, id) => {
      const arr = group.screenIds.slice();
      while (arr.length <= idx) arr.push(null);
      for (let i = 0; i < arr.length; i++) if (arr[i] === id && i !== idx) arr[i] = null;
      arr[idx] = id || null;
      patch({ screenIds: arr });
    };
    const addScreen = (id) => {
      if (!id) return;
      if (isSplit) {
        const arr = group.screenIds.slice();
        for (let i = 0; i < cellsNeeded; i++) { if (!screenById.get(arr[i])) { while (arr.length <= i) arr.push(null); arr[i] = id; break; } }
        patch({ screenIds: arr });
      } else patch({ screenIds: [...group.screenIds, id] });
    };
    const removeScreen = (id) => {
      if (isSplit) patch({ screenIds: group.screenIds.map((x) => x === id ? null : x) });
      else patch({ screenIds: group.screenIds.filter((x) => x !== id) });
    };

    return (
      <div>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16,
          padding: '7px 13px 7px 9px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 600 }}>
          <Icon.ChevronLeft s={17} /> All groups
        </button>

        {/* header */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--gap)' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, color: '#fff', flexShrink: 0,
            background: `linear-gradient(135deg, ${group.color}, color-mix(in srgb, ${group.color} 55%, #fff))` }}><IconC s={25} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em' }}>{group.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
              <Badge tone="accent" icon={group.mode === 'split' ? <Icon.Grid s={12} /> : <Icon.Copy s={12} />}>
                {group.mode === 'split' ? `Split · ${group.cols}×${group.rows}` : 'Mirror'}
              </Badge>
              <Badge tone="neutral" icon={<Icon.Screens s={12} />}>{assignedCount} screen{assignedCount !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
          <Btn variant="danger" size="sm" icon={<Icon.Trash s={15} />} onClick={onDelete}>Delete</Btn>
        </Card>

        {/* live preview */}
        <Card style={{ marginBottom: 'var(--gap)' }}>
          <CardHead title="Live preview" sub={group.mode === 'split' ? `Video wall · ${group.cols} columns × ${group.rows} rows` : `Mirrored to ${assignedCount} screen${assignedCount !== 1 ? 's' : ''}`}
            icon={<Icon.Cast s={18} />}
            right={<Badge tone="neutral" icon={group.content.type === 'video' ? <Icon.Video s={12} /> : <Icon.Image s={12} />}>{group.content.label}</Badge>} />
          <WallPreview group={group} screenById={screenById} screens={screens} onAssign={assignCell} />
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)', alignItems: 'start' }} className="main-grid">
          {/* mode + layout */}
          <Card>
            <CardHead title="Display mode" sub="How content is distributed across the group" icon={<Icon.Layers s={18} />} />
            <ModeToggle value={group.mode} onChange={(m) => patch({ mode: m })} />
            {group.mode === 'split' && (
              <div style={{ marginTop: 18, padding: 16, borderRadius: 13, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Wall layout</div>
                <Stepper label="Columns" value={group.cols} onChange={(v) => patch({ cols: v })} />
                <Stepper label="Rows" value={group.rows} onChange={(v) => patch({ rows: v })} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
                  color: assignedCount >= cellsNeeded ? 'var(--online)' : 'var(--warn)' }}>
                  {assignedCount >= cellsNeeded ? <Icon.CheckCircle s={15} /> : <Icon.Alert s={15} />}
                  {assignedCount} of {cellsNeeded} panels assigned
                </div>
              </div>
            )}
          </Card>

          {/* screens */}
          <Card>
            <CardHead title="Group screens" sub={group.mode === 'split' ? 'Click a wall panel to place a screen' : 'All mirror the same output'} icon={<Icon.Screens s={18} />} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {assignedCount === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 0 4px' }}>No screens assigned yet.</div>
              )}
              {placed.map(({ s, cell }) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11,
                  background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {isSplit && (
                    <span className="mono" style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'var(--surface-3)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{cell + 1}</span>
                  )}
                  <div style={{ width: 30, height: 19, borderRadius: 4, flexShrink: 0, background: s.thumb }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }} className="mono">{s.res} · {s.res2}</div>
                  </div>
                  <StatusDot status={s.status} size={7} />
                  <button onClick={() => removeScreen(s.id)} title="Remove" style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)' }}><Icon.Trash s={14} /></button>
                </div>
              ))}
            </div>
            {available.length > 0 && (
              <div style={{ marginTop: 13, position: 'relative' }}>
                <select value="" onChange={(e) => addScreen(e.target.value)}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
                    background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)', outline: 'none' }}>
                  <option value="">+ Add a screen to this group…</option>
                  {available.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.loc}</option>)}
                </select>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ---------------- new group modal ----------------
  function NewGroupModal({ screens, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [mode, setMode] = useState('mirror');
    const [rows, setRows] = useState(1);
    const [cols, setCols] = useState(2);
    const [sel, setSel] = useState([]);
    const valid = name.trim().length > 1;

    const toggle = (id) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

    const create = () => {
      if (!valid) return;
      onCreate({
        id: 'g' + Date.now(), name: name.trim(), color, icon: 'Groups', mode,
        rows: mode === 'split' ? rows : 1, cols: mode === 'split' ? cols : 1, screenIds: sel,
        content: { label: name.trim().split(' ')[0].toUpperCase().slice(0, 9), type: 'image',
          bg: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 50%, #fff))` },
      });
    };

    const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
      background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' };

    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}><Icon.Groups s={21} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>New screen group</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mirror content or build a video wall</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Group name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HQ Lobby Wall" autoFocus style={inp} />
            </label>

            <div>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>Colour</span>
              <div style={{ display: 'flex', gap: 9 }}>
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                    background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }} />
                ))}
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>Display mode</span>
              <ModeToggle value={mode} onChange={setMode} />
            </div>

            {mode === 'split' && (
              <div style={{ padding: 16, borderRadius: 13, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Stepper label="Columns" value={cols} onChange={setCols} />
                <Stepper label="Rows" value={rows} onChange={setRows} />
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Creates a {cols}×{rows} wall ({cols * rows} panels).</div>
              </div>
            )}

            <div>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>
                Add screens {sel.length > 0 && <span style={{ color: 'var(--accent)' }}>· {sel.length} selected</span>}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 188, overflowY: 'auto' }}>
                {screens.map((s) => {
                  const on = sel.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggle(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, textAlign: 'left',
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff' }}>
                        {on && <Icon.Check s={12} sw={3} />}
                      </span>
                      <div style={{ width: 30, height: 19, borderRadius: 4, flexShrink: 0, background: s.thumb }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.loc}</div>
                      </div>
                      <StatusDot status={s.status} size={7} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, padding: 24, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
            <Btn variant={valid ? 'primary' : 'ghost'} onClick={valid ? create : undefined} full
              icon={<Icon.Plus s={17} />} style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>Create group</Btn>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------------- page ----------------
  function GroupsPage({ screens, onLoadSample }) {
    if (!screens.length) return (
      <div>
        <PageHeader title="Screen Groups" sub="Organise screens by site, role or campaign" />
        <Card animate style={{ padding: '64px 24px' }}>
          <Empty icon={<Icon.Groups s={26} />} title="No groups yet" desc="Group screens to mirror content everywhere or split one image across a video wall."
            action={<Btn variant="primary" icon={<Icon.Sparkle s={16} />} onClick={onLoadSample}>Load sample data</Btn>} />
        </Card>
      </div>
    );

    const screenById = new Map(screens.map((s) => [s.id, s]));
    const [groups, setGroups] = useState(() => { if (!GROUPS_CACHE) GROUPS_CACHE = buildSeed(screens); return GROUPS_CACHE; });
    const [selId, setSelId] = useState(null);
    const [modal, setModal] = useState(false);
    useEffect(() => { GROUPS_CACHE = groups; window.__GROUPS = groups; }, [groups]);

    const patch = (id, p) => setGroups((gs) => gs.map((g) => g.id === id ? { ...g, ...p } : g));
    const selected = groups.find((g) => g.id === selId);

    if (selected) return (
      <GroupDetail group={selected} screens={screens} screenById={screenById}
        onBack={() => setSelId(null)} patch={(p) => patch(selected.id, p)}
        onDelete={() => { setGroups((gs) => gs.filter((g) => g.id !== selected.id)); setSelId(null); }} />
    );

    return (
      <div>
        <PageHeader title="Screen Groups" sub={`${groups.length} group${groups.length !== 1 ? 's' : ''}`}
          actions={<Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setModal(true)}>New group</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 'var(--gap)' }}>
          {groups.map((g) => {
            const IconC = Icon[g.icon] || Icon.Groups;
            const n = g.screenIds.filter((id) => screenById.has(id)).length;
            const mons = g.screenIds.map((id) => screenById.get(id)).filter(Boolean).slice(0, 4);
            return (
              <Card key={g.id} hover onClick={() => setSelId(g.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, color: '#fff', flexShrink: 0,
                    background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #fff))` }}><IconC s={22} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5 }}>{g.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{n} screen{n !== 1 ? 's' : ''}</div>
                  </div>
                  <Badge tone={g.mode === 'split' ? 'accent' : 'neutral'} icon={g.mode === 'split' ? <Icon.Grid s={12} /> : <Icon.Copy s={12} />}>
                    {g.mode === 'split' ? `${g.cols}×${g.rows}` : 'Mirror'}
                  </Badge>
                </div>
                {/* mini preview strip */}
                <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                  {(mons.length ? mons : [null, null]).map((s, i) => (
                    <div key={i} style={{ flex: '1 1 0', maxWidth: 92, height: 50, borderRadius: 6, overflow: 'hidden',
                      background: s ? g.content.bg : 'var(--surface-3)', border: '1px solid var(--border)', position: 'relative' }}>
                      {s && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.12), transparent 50%, rgba(0,0,0,.2))' }} />}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {g.content.type === 'video' ? <Icon.Video s={14} /> : <Icon.Image s={14} />}{g.content.label}
                  </span>
                  <Btn variant="ghost" size="sm" iconRight={<Icon.Arrow s={14} />}>Open</Btn>
                </div>
              </Card>
            );
          })}
        </div>
        {modal && <NewGroupModal screens={screens} onClose={() => setModal(false)}
          onCreate={(g) => { setGroups((gs) => [...gs, g]); setModal(false); setSelId(g.id); }} />}
      </div>
    );
  }

  Object.assign(window, { GroupsPage });
})();
