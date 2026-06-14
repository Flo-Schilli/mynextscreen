// content.jsx — Content Library: filters, storage (original + transcoded), clear / delete with usage awareness
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { Card, Badge, Btn, Thumb, Empty, Bar, PageHeader, Overlay } = window;

  let CONTENT_CACHE = null;
  function buildItems(content) { return content.map((c) => ({ ...c, cleared: false })); }

  const fmt = (mb) => mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : (Number.isInteger(mb) ? mb : mb.toFixed(1)) + ' MB';
  const transSize = (c) => c.renditions.reduce((s, r) => s + r.size, 0);

  const MENU_ITEM = { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px',
    borderRadius: 9, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 };

  // ---------- per-card actions menu ----------
  function CardMenu({ item, open, setOpen, onClear, onRetranscode, onDelete, onDetails }) {
    const cleared = item.cleared;
    return (
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(open ? null : item.id)} title="Actions"
          style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8,
            border: '1px solid var(--border)', background: open ? 'var(--surface-3)' : 'transparent', color: 'var(--text-muted)' }}>
          <Icon.Dots s={17} />
        </button>
        {open && (
          <React.Fragment>
            <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', right: 0, minWidth: 236,
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', padding: 6, animation: 'fadeUp .15s ease both' }}>
              <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--text)' }} onClick={() => { onDetails(); setOpen(null); }}>
                <Icon.Layers s={17} style={{ color: 'var(--text-muted)' }} /> Storage details
              </button>
              {cleared && (
                <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--accent)' }} onClick={() => { onRetranscode(); setOpen(null); }}>
                  <Icon.Refresh s={17} /> Re-transcode now
                </button>
              )}
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
              <button className="wall-menu-item" style={{ ...MENU_ITEM, color: cleared ? 'var(--text-faint)' : 'var(--warn)', cursor: cleared ? 'not-allowed' : 'pointer' }}
                onClick={() => { if (!cleared) { onClear(); setOpen(null); } }}>
                <Icon.Refresh s={17} /> Clear transcoded files
              </button>
              <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--offline)' }} onClick={() => { onDelete(); setOpen(null); }}>
                <Icon.Trash s={16} /> Delete original &amp; transcoded
              </button>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  // ---------- storage details modal ----------
  function DetailsModal({ item, onClose }) {
    const trans = transSize(item);
    const rows = [{ label: 'Original master', size: item.orig, kind: 'orig' },
      ...item.renditions.map((r) => ({ label: r.label, size: r.size, kind: 'rend', wall: /wall/i.test(r.label) }))];
    const max = Math.max(item.orig, ...item.renditions.map((r) => r.size), 1);
    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 46, height: 32, borderRadius: 7, background: item.thumb, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Original {fmt(item.orig)} · Transcoded {item.cleared ? '—' : fmt(trans)}</div>
            </div>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ opacity: (r.kind === 'rend' && item.cleared) ? .4 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                    {r.kind === 'orig' ? <Icon.Storage s={15} style={{ color: 'var(--text-muted)' }} />
                      : r.wall ? <Icon.Grid s={15} style={{ color: 'var(--accent)' }} />
                      : <Icon.Layers s={15} style={{ color: 'var(--text-muted)' }} />}
                    {r.label}{r.kind === 'orig' && <Badge tone="neutral">kept</Badge>}
                  </span>
                  <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{(r.kind === 'rend' && item.cleared) ? 'cleared' : fmt(r.size)}</span>
                </div>
                <Bar value={(r.size / max) * 100} h={6} color={r.kind === 'orig' ? 'var(--text-faint)' : (r.wall ? 'var(--accent-2)' : 'var(--accent)')} />
              </div>
            ))}
            <div style={{ marginTop: 4, padding: 14, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Transcoded renditions are generated automatically per target resolution. <b style={{ color: 'var(--text)' }}>Video wall</b> entries are split into one tile per panel so each display only fetches its own region.
            </div>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------- confirm (clear / delete) ----------
  function ConfirmModal({ item, mode, onClose, onConfirm }) {
    const trans = transSize(item);
    const used = item.usedPlaylists.length > 0 || item.screens > 0;
    const isDelete = mode === 'delete';
    const pl = item.usedPlaylists;
    const plText = pl.length ? pl.map((p) => `“${p}”`).join(', ') : '';

    const tone = isDelete ? 'var(--offline)' : 'var(--warn)';
    const toneDim = isDelete ? 'var(--offline-dim)' : 'var(--warn-dim)';
    const title = isDelete ? 'Delete original & transcoded?' : 'Clear transcoded files?';
    const freed = isDelete ? item.orig + trans : trans;

    return (
      <Overlay onClose={onClose}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxWidth: 480 }}>
          <div style={{ padding: '24px 24px 0', display: 'flex', gap: 14 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: toneDim, color: tone }}>
              {isDelete ? <Icon.Trash s={21} /> : <Icon.Refresh s={21} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3 }}>“{item.name}”</div>
            </div>
          </div>

          <div style={{ padding: '18px 24px 4px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {isDelete
              ? <span>This permanently removes the original master and <b style={{ color: 'var(--text)' }}>all {item.renditions.length} transcoded renditions</b> — freeing <b style={{ color: 'var(--text)' }}>{fmt(freed)}</b>. This can’t be undone.</span>
              : <span>This deletes the transcoded renditions only and frees <b style={{ color: 'var(--text)' }}>{fmt(freed)}</b>. The original master is kept, so you can re-transcode anytime.</span>}
          </div>

          {used && (
            <div style={{ margin: '14px 24px 0', padding: 14, borderRadius: 12, background: toneDim, border: `1px solid ${tone}33`, display: 'flex', gap: 11 }}>
              <Icon.Alert s={18} style={{ color: tone, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                {isDelete ? (
                  <span>Currently in use{pl.length ? <> in {plText}</> : ''}{item.screens ? <> and playing on <b>{item.screens} screen{item.screens !== 1 ? 's' : ''}</b></> : ''}. It will be removed from {pl.length ? 'those playlists' : 'use'} and stop playing immediately.</span>
                ) : (
                  <span>{pl.length ? <>Used in {plText}. </> : ''}{pl.length > 1 ? 'Those playlists' : 'That playlist'} will fall back to a holding slate on {item.screens || 'their'} screen{item.screens !== 1 ? 's' : ''} until the media is re-transcoded.</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, padding: 24 }}>
            <Btn variant="outline" onClick={onClose} full>Cancel</Btn>
            <Btn variant={isDelete ? 'danger' : 'primary'} onClick={onConfirm} full
              icon={isDelete ? <Icon.Trash s={16} /> : <Icon.Refresh s={16} />}
              style={isDelete ? { background: 'var(--offline)', color: '#fff' } : {}}>
              {isDelete ? 'Delete permanently' : 'Clear transcoded'}
            </Btn>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------- card ----------
  function ContentCard({ item, openMenu, setOpenMenu, onClear, onRetranscode, onDelete, onDetails }) {
    const trans = transSize(item);
    const max = Math.max(item.orig, trans, 1);
    return (
      <Card pad={false} style={{ overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <Thumb bg={item.thumb} h={134} type={item.type} radius={0}
            badge={<Badge tone="neutral" icon={item.type === 'video' ? <Icon.Video s={12} /> : <Icon.Image s={12} />}>{item.type}</Badge>} />
          {item.cleared && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <Badge tone="warning" icon={<Icon.Alert s={12} />}>Needs transcoding</Badge>
            </div>
          )}
        </div>
        <div style={{ padding: '13px 15px 15px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{item.type === 'video' ? item.dur : 'still image'}</div>
            </div>
            <CardMenu item={item} open={openMenu === item.id} setOpen={setOpenMenu}
              onClear={onClear} onRetranscode={onRetranscode} onDelete={onDelete} onDetails={onDetails} />
          </div>

          {/* storage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Original</span>
                <span className="mono" style={{ color: 'var(--text)' }}>{fmt(item.orig)}</span>
              </div>
              <Bar value={(item.orig / max) * 100} h={5} color="var(--text-faint)" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Transcoded · {item.renditions.length}</span>
                <span className="mono" style={{ color: item.cleared ? 'var(--warn)' : 'var(--accent)' }}>{item.cleared ? 'cleared' : fmt(trans)}</span>
              </div>
              <Bar value={item.cleared ? 0 : (trans / max) * 100} h={5} color="var(--accent)" />
            </div>
          </div>

          {/* usage */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
            {item.usedPlaylists.map((p) => <Badge key={p} tone="accent" icon={<Icon.Playlists s={11} />}>{p}</Badge>)}
            {item.screens > 0 && <Badge tone="neutral" icon={<Icon.Screens s={11} />}>{item.screens}</Badge>}
            {item.usedPlaylists.length === 0 && item.screens === 0 && <Badge tone="neutral">Not in use</Badge>}
          </div>
        </div>
      </Card>
    );
  }

  // ---------- page ----------
  function ContentPage({ content, onLoadSample, notify }) {
    if (!content.length) return (
      <div>
        <PageHeader title="Content Library" sub="Images, video and live feeds" />
        <Card animate style={{ padding: '64px 24px' }}>
          <Empty icon={<Icon.Content s={26} />} title="Your library is empty" desc="Upload images and video. We transcode and optimise them for every screen automatically."
            action={<Btn variant="primary" icon={<Icon.Upload s={17} />} onClick={onLoadSample}>Upload media</Btn>} />
        </Card>
      </div>
    );

    const [items, setItems] = useState(() => { if (!CONTENT_CACHE) CONTENT_CACHE = buildItems(content); return CONTENT_CACHE; });
    const [type, setType] = useState('all');
    const [status, setStatus] = useState('all');
    const [openMenu, setOpenMenu] = useState(null);
    const [details, setDetails] = useState(null);
    const [confirm, setConfirm] = useState(null); // { item, mode }
    useEffect(() => { CONTENT_CACHE = items; }, [items]);

    const setItem = (id, p) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, ...p } : x));

    const doClear = (item) => { setItem(item.id, { cleared: true }); notify && notify({ title: 'Transcoded files cleared', desc: `Freed ${fmt(transSize(item))} · re-transcode before playback`, tone: 'warn', icon: 'Refresh' }); };
    const doRetranscode = (item) => { setItem(item.id, { cleared: false }); notify && notify({ title: 'Re-transcoding started', desc: `“${item.name}” will be ready shortly`, tone: 'accent', icon: 'Refresh' }); };
    const doDelete = (item) => { setItems((xs) => xs.filter((x) => x.id !== item.id)); notify && notify({ title: 'Media deleted', desc: `“${item.name}” and all renditions removed`, tone: 'offline', icon: 'Trash' }); };

    const counts = {
      all: items.length,
      image: items.filter((i) => i.type === 'image').length,
      video: items.filter((i) => i.type === 'video').length,
      ready: items.filter((i) => !i.cleared).length,
      needs: items.filter((i) => i.cleared).length,
    };
    const shown = items.filter((i) => (type === 'all' || i.type === type) && (status === 'all' || (status === 'ready' ? !i.cleared : i.cleared)));

    const totalOrig = items.reduce((s, i) => s + i.orig, 0);
    const totalTrans = items.reduce((s, i) => s + (i.cleared ? 0 : transSize(i)), 0);

    const typeTabs = [['all', 'All'], ['image', 'Images'], ['video', 'Videos']];
    const statusTabs = [['all', 'Any status'], ['ready', 'Transcoded'], ['needs', 'Needs transcoding']];
    const Chip = ({ active, onClick, children, dot }) => (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 99, fontSize: 13.5, fontWeight: 600,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-soft)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
        {dot}{children}
      </button>
    );

    return (
      <div>
        <PageHeader title="Content Library" sub={`${items.length} items · ${fmt(totalOrig)} original · ${fmt(totalTrans)} transcoded`}
          actions={<Btn variant="primary" size="md" icon={<Icon.Upload s={17} />}>Upload</Btn>} />

        {/* filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 'var(--gap)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {typeTabs.map(([v, l]) => (
              <Chip key={v} active={type === v} onClick={() => setType(v)}
                dot={v === 'image' ? <Icon.Image s={14} /> : v === 'video' ? <Icon.Video s={14} /> : null}>
                {l} <span className="mono" style={{ opacity: .7 }}>{counts[v]}</span>
              </Chip>
            ))}
          </div>
          <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusTabs.map(([v, l]) => (
              <Chip key={v} active={status === v} onClick={() => setStatus(v)}
                dot={v === 'ready' ? <Icon.Check s={14} /> : v === 'needs' ? <Icon.Alert s={14} /> : null}>
                {l}{v !== 'all' && <span className="mono" style={{ opacity: .7 }}>{counts[v === 'ready' ? 'ready' : 'needs']}</span>}
              </Chip>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <Card style={{ padding: '54px 24px' }}>
            <Empty icon={<Icon.Filter s={24} />} title="No matching media" desc="Try a different filter combination." />
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))', gap: 'var(--gap)' }}>
            {shown.map((item) => (
              <ContentCard key={item.id} item={item} openMenu={openMenu} setOpenMenu={setOpenMenu}
                onClear={() => setConfirm({ item, mode: 'clear' })}
                onDelete={() => setConfirm({ item, mode: 'delete' })}
                onRetranscode={() => doRetranscode(item)}
                onDetails={() => setDetails(item)} />
            ))}
          </div>
        )}

        {details && <DetailsModal item={items.find((i) => i.id === details.id) || details} onClose={() => setDetails(null)} />}
        {confirm && <ConfirmModal item={confirm.item} mode={confirm.mode} onClose={() => setConfirm(null)}
          onConfirm={() => { confirm.mode === 'delete' ? doDelete(confirm.item) : doClear(confirm.item); setConfirm(null); }} />}
      </div>
    );
  }

  Object.assign(window, { ContentPage });
})();
