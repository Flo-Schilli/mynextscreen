// audit.jsx — Audit Log: filter bar (search + action/user/type/date), grouped
// table with colour-coded action badges, expandable detail rows, pagination.
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const Icon = window.Icon;
  const M = window.MOCK;
  const { Card, Badge, Btn, Avatar, Empty, PageHeader } = window;

  const PAGE_SIZE = 12;

  // ---- action taxonomy: label, tone, icon ----
  const ACTION_META = {
    'content.upload':    { label: 'Content uploaded',    tone: 'info',    icon: 'Upload' },
    'content.delete':    { label: 'Content deleted',     tone: 'offline', icon: 'Trash' },
    'content.transcode': { label: 'Transcode finished',  tone: 'online',  icon: 'Refresh' },
    'playlist.create':   { label: 'Playlist created',    tone: 'accent',  icon: 'Playlists' },
    'playlist.update':   { label: 'Playlist updated',    tone: 'info',    icon: 'Pencil' },
    'schedule.publish':  { label: 'Schedule published',  tone: 'accent',  icon: 'Schedules' },
    'schedule.update':   { label: 'Schedule updated',    tone: 'info',    icon: 'Pencil' },
    'screen.register':   { label: 'Screen registered',   tone: 'warning', icon: 'Screens' },
    'screen.pair':       { label: 'Screen paired',       tone: 'online',  icon: 'Screens' },
    'screen.offline':    { label: 'Screen offline',      tone: 'offline', icon: 'WifiOff' },
    'screen.update':     { label: 'Screen updated',      tone: 'info',    icon: 'Pencil' },
    'stream.start':      { label: 'Live stream started', tone: 'online',  icon: 'Stream' },
    'stream.stop':       { label: 'Live stream stopped', tone: 'neutral', icon: 'Stream' },
    'group.update':      { label: 'Group updated',       tone: 'info',    icon: 'Groups' },
    'user.invite':       { label: 'User invited',        tone: 'accent',  icon: 'Mail' },
    'user.role':         { label: 'Role changed',        tone: 'warning', icon: 'User' },
    'user.login':        { label: 'Signed in',           tone: 'neutral', icon: 'Lock' },
    'org.update':        { label: 'Organisation updated',tone: 'info',    icon: 'Building' },
    'settings.update':   { label: 'Settings changed',    tone: 'info',    icon: 'Settings' },
  };

  const toneC = (t) => t === 'accent' ? 'var(--accent)' : t === 'neutral' ? 'var(--text-muted)'
    : `var(--${t === 'warning' ? 'warn' : t})`;

  // ---- time helpers ----
  const NOW = M.A_NOW;
  function rel(ts) {
    const s = Math.round((NOW - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }
  const timeStr = (ts) => ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  function dayLabel(ts) {
    const a = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
    const b = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
    const diff = Math.round((b - a) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return ts.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  const fullStamp = (ts) => ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + timeStr(ts);
  const detailText = (d) => d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('  ·  ') : null;

  const GRID = '32px 184px 176px 212px 138px minmax(180px,1.3fr) minmax(150px,1.2fr)';

  // ---------- custom dropdown ----------
  function Select({ value, onChange, options, width }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();
    useEffect(() => {
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, []);
    const cur = options.find((o) => o.value === value) || options[0];
    return (
      <div ref={ref} style={{ position: 'relative', width: width || 200 }}>
        <button type="button" onClick={() => setOpen((o) => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
            borderRadius: 'var(--r-md)', fontSize: 13.5, fontWeight: 600, textAlign: 'left',
            border: `1px solid ${open ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: 'var(--surface-2)', color: cur.value === 'all' ? 'var(--text-muted)' : 'var(--text)',
            boxShadow: open ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
          {cur.color && <span style={{ width: 8, height: 8, borderRadius: 99, background: cur.color, flexShrink: 0 }} />}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur.label}</span>
          <Icon.Chevron s={15} style={{ color: 'var(--text-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40,
            background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)', padding: 6, maxHeight: 290, overflowY: 'auto', animation: 'fadeUp .14s ease both' }}>
            {options.map((o) => {
              const sel = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 8, fontSize: 13.5, fontWeight: sel ? 700 : 500, textAlign: 'left', border: 'none',
                    background: sel ? 'var(--accent-soft)' : 'transparent', color: sel ? 'var(--accent)' : 'var(--text)' }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                  {o.color && <span style={{ width: 8, height: 8, borderRadius: 99, background: o.color, flexShrink: 0 }} />}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  {sel && <Icon.Check s={15} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function Field({ label, children }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{label}</span>
        {children}
      </div>
    );
  }

  function DateField({ value, onChange }) {
    return (
      <div style={{ position: 'relative', width: 150 }}>
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)', fontSize: 13.5, fontWeight: 600,
            fontFamily: 'var(--font-sans)', border: '1px solid var(--border-strong)', background: 'var(--surface-2)',
            color: value ? 'var(--text)' : 'var(--text-faint)', colorScheme: 'inherit' }} />
      </div>
    );
  }

  // ---------- a single log row + its expansion ----------
  function Row({ ev, open, onToggle }) {
    const meta = ACTION_META[ev.action] || { label: ev.action, tone: 'neutral', icon: 'Dots' };
    const u = M.AUDIT_USERS[ev.actorKey];
    const IconC = Icon[meta.icon] || Icon.Dots;
    const c = toneC(meta.tone);
    const det = detailText(ev.details);
    const [hov, setHov] = useState(false);

    const cell = { display: 'flex', alignItems: 'center', minWidth: 0, fontSize: 13.5 };
    return (
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div onClick={onToggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', gap: 16,
            padding: '0 20px 0 0', height: 60, cursor: 'pointer', position: 'relative',
            background: open ? 'var(--surface-2)' : hov ? 'var(--hover)' : 'transparent' }}>
          {/* tone accent bar */}
          <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 99,
            background: c, opacity: open || hov ? 1 : 0, transition: 'opacity .15s' }} />
          {/* expand chevron */}
          <div style={{ display: 'grid', placeItems: 'center', paddingLeft: 8, color: 'var(--text-faint)' }}>
            <Icon.Chevron s={15} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
          </div>
          {/* timestamp */}
          <div style={{ ...cell, flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{timeStr(ev.ts)}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{rel(ev.ts)}</span>
          </div>
          {/* user */}
          <div style={{ ...cell, gap: 10 }}>
            {u.system
              ? <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--surface-3)', color: 'var(--text-muted)', flexShrink: 0 }}><Icon.Settings s={15} /></span>
              : <Avatar name={u.initials} grad={u.grad} size={28} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{u.role}</div>
            </div>
          </div>
          {/* action badge */}
          <div style={cell}>
            <Badge tone={meta.tone} icon={<IconC s={12} />}>{meta.label}</Badge>
          </div>
          {/* resource type */}
          <div style={{ ...cell, color: 'var(--text-muted)', fontSize: 13 }}>{ev.rtype}</div>
          {/* resource */}
          <div style={cell}>
            <span className={ev.mono ? 'mono' : ''} title={ev.resource}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: ev.mono ? 12.5 : 13.5, fontWeight: 600, color: ev.mono ? 'var(--info)' : 'var(--accent)' }}>
              {ev.resource}
            </span>
          </div>
          {/* details */}
          <div style={{ ...cell, color: det ? 'var(--text-muted)' : 'var(--text-faint)', fontSize: 12.5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{det || '—'}</span>
          </div>
        </div>

        {open && (
          <div style={{ background: 'var(--surface-2)', padding: '4px 20px 20px 51px', animation: 'fadeIn .18s ease both' }}>
            <div style={{ borderTop: '1px dashed var(--border-strong)', paddingTop: 16, display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px 28px' }}>
              <Meta label="Event ID" value={ev.eid} mono />
              <Meta label="Resource ID" value={ev.resourceId || '—'} mono />
              <Meta label="IP address" value={ev.ip} mono />
              <Meta label="Timestamp" value={fullStamp(ev.ts)} />
              <Meta label="Actor" value={`${M.AUDIT_USERS[ev.actorKey].name} · ${M.AUDIT_USERS[ev.actorKey].role}`} />
              <Meta label="Resource type" value={ev.rtype} />
              {ev.details && Object.entries(ev.details).map(([k, v]) => (
                <Meta key={k} label={k} value={String(v)} accent />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function Meta({ label, value, mono, accent }) {
    return (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 3 }}>{label}</div>
        <div className={mono ? 'mono' : ''} style={{ fontSize: mono ? 12.5 : 13.5, fontWeight: 600,
          color: accent ? 'var(--accent)' : 'var(--text)', wordBreak: 'break-word' }}>{value}</div>
      </div>
    );
  }

  // ---------- the page ----------
  function AuditPage({ seeded, notify }) {
    const all = seeded ? M.AUDIT : [];
    const [q, setQ] = useState('');
    const [fAction, setFAction] = useState('all');
    const [fUser, setFUser] = useState('all');
    const [fType, setFType] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState(null);

    // distinct option lists
    const actionOpts = useMemo(() => {
      const keys = [...new Set(all.map((e) => e.action))];
      keys.sort((a, b) => ACTION_META[a].label.localeCompare(ACTION_META[b].label));
      return [{ value: 'all', label: 'All actions' },
        ...keys.map((k) => ({ value: k, label: ACTION_META[k].label, color: toneC(ACTION_META[k].tone) }))];
    }, [all]);
    const userOpts = useMemo(() => {
      const keys = [...new Set(all.map((e) => e.actorKey))];
      return [{ value: 'all', label: 'All users' },
        ...keys.map((k) => ({ value: k, label: M.AUDIT_USERS[k].name }))];
    }, [all]);
    const typeOpts = useMemo(() => {
      const ks = [...new Set(all.map((e) => e.rtype))].sort();
      return [{ value: 'all', label: 'All types' }, ...ks.map((k) => ({ value: k, label: k }))];
    }, [all]);

    const active = q || fAction !== 'all' || fUser !== 'all' || fType !== 'all' || from || to;
    useEffect(() => { setPage(1); }, [q, fAction, fUser, fType, from, to]);

    const filtered = useMemo(() => {
      const ql = q.trim().toLowerCase();
      return all.filter((e) => {
        if (fAction !== 'all' && e.action !== fAction) return false;
        if (fUser !== 'all' && e.actorKey !== fUser) return false;
        if (fType !== 'all' && e.rtype !== fType) return false;
        if (from && e.ts < new Date(from + 'T00:00:00')) return false;
        if (to && e.ts > new Date(to + 'T23:59:59')) return false;
        if (ql) {
          const hay = [e.resource, ACTION_META[e.action].label, M.AUDIT_USERS[e.actorKey].name,
            detailText(e.details) || ''].join(' ').toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        return true;
      });
    }, [all, q, fAction, fUser, fType, from, to]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const reset = () => { setQ(''); setFAction('all'); setFUser('all'); setFType('all'); setFrom(''); setTo(''); };
    const onExport = () => notify && notify({ title: 'Export started', desc: `${filtered.length} events queued as CSV`, tone: 'accent', icon: 'Download' });

    if (!seeded) return (
      <div>
        <PageHeader title="Audit Log" sub="Every action across your account" />
        <Card animate style={{ padding: '64px 24px' }}>
          <Empty icon={<Icon.Audit s={26} />} title="No activity logged yet"
            desc="Once you start managing screens and content, every action shows up here." />
        </Card>
      </div>
    );

    // build rows with day dividers
    const rows = [];
    let lastDay = null;
    pageItems.forEach((e) => {
      const dl = dayLabel(e.ts);
      if (dl !== lastDay) { rows.push({ divider: dl, key: 'd-' + dl }); lastDay = dl; }
      rows.push({ ev: e, key: e.id });
    });

    return (
      <div>
        <PageHeader title="Audit Log" sub="Every action across screens, content, people and settings"
          actions={<>
            <Btn variant="outline" size="md" icon={<Icon.Refresh s={16} />}
              onClick={() => notify && notify({ title: 'Log refreshed', desc: 'Showing the latest events', tone: 'info', icon: 'Refresh' })}>Refresh</Btn>
            <Btn variant="primary" size="md" icon={<Icon.Download s={16} />} onClick={onExport}>Export CSV</Btn>
          </>} />

        {/* filter bar */}
        <Card style={{ marginBottom: 'var(--gap)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', marginBottom: 16 }}>
            <Icon.Search s={17} style={{ position: 'absolute', left: 14, color: 'var(--text-faint)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources, people, details…"
              style={{ flex: 1, padding: '11px 14px 11px 40px', borderRadius: 'var(--r-md)', fontSize: 14,
                fontFamily: 'var(--font-sans)', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text)' }} />
            {active && <Btn variant="ghost" size="md" icon={<Icon.Plus s={15} style={{ transform: 'rotate(45deg)' }} />} onClick={reset}>Reset</Btn>}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Action"><Select value={fAction} onChange={setFAction} options={actionOpts} width={210} /></Field>
            <Field label="User"><Select value={fUser} onChange={setFUser} options={userOpts} width={185} /></Field>
            <Field label="Resource type"><Select value={fType} onChange={setFType} options={typeOpts} width={175} /></Field>
            <Field label="From"><DateField value={from} onChange={setFrom} /></Field>
            <Field label="To"><DateField value={to} onChange={setTo} /></Field>
          </div>
        </Card>

        {/* result count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {filtered.length === all.length
              ? <><span style={{ fontWeight: 700, color: 'var(--text)' }}>{all.length}</span> events</>
              : <><span style={{ fontWeight: 700, color: 'var(--text)' }}>{filtered.length}</span> of {all.length} events</>}
          </div>
        </div>

        {/* table */}
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 980 }}>
              {/* header */}
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 16, padding: '0 20px 0 0', height: 46,
                alignItems: 'center', background: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 5 }}>
                {['', 'Timestamp', 'User', 'Action', 'Type', 'Resource', 'Details'].map((h, i) => (
                  <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
                    color: 'var(--text-faint)', paddingLeft: i === 0 ? 8 : 0 }}>{h}</div>
                ))}
              </div>
              {/* body */}
              {filtered.length === 0 ? (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <Empty icon={<Icon.Search s={24} />} title="No matching events"
                    desc="Try clearing a filter or widening the date range." />
                </div>
              ) : rows.map((r) => r.divider ? (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px 9px 23px',
                  background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                  <Icon.Calendar s={13} style={{ color: 'var(--text-faint)' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-muted)' }}>{r.divider}</span>
                </div>
              ) : (
                <Row key={r.key} ev={r.ev} open={openId === r.ev.id} onToggle={() => setOpenId((id) => id === r.ev.id ? null : r.ev.id)} />
              ))}
            </div>
          </div>

          {/* pagination footer */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Btn variant="outline" size="sm" icon={<Icon.ChevronLeft s={15} />} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ opacity: page === 1 ? .45 : 1, pointerEvents: page === 1 ? 'none' : 'auto' }}>Prev</Btn>
                <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 54, textAlign: 'center' }}>{page} / {totalPages}</span>
                <Btn variant="outline" size="sm" iconRight={<Icon.Chevron s={15} />} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ opacity: page === totalPages ? .45 : 1, pointerEvents: page === totalPages ? 'none' : 'auto' }}>Next</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  Object.assign(window, { AuditPage });
})();
