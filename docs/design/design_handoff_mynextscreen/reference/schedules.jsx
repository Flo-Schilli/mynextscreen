// schedules.jsx — Schedules: week calendar, recurring rules, create/edit editor,
// enable/disable, duplicate/delete, and live conflict detection.
(function () {
  const { useState, useEffect, useMemo, useCallback } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Empty, PageHeader } = window;

  // ---------------------------------------------------------------
  //  time helpers
  // ---------------------------------------------------------------
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtRange = (a, b) => `${a}–${b}`;
  const todayIdx = () => (new Date().getDay() + 6) % 7; // 0 = Monday
  const uid = () => Math.random().toString(36).slice(2, 8);

  // ---- date helpers (for one-off / specific-date schedules) ----
  const pad2 = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromDateStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekdayOfDate = (s) => (fromDateStr(s).getDay() + 6) % 7;
  const fmtDateMD = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtDateFull = (s) => fromDateStr(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const TODAY_STR = toDateStr(new Date());

  function daysLabel(days) {
    const s = [...days].sort((a, b) => a - b);
    if (s.length === 0) return 'No days';
    if (s.length === 7) return 'Every day';
    if (s.join() === '0,1,2,3,4') return 'Mon–Fri';
    if (s.join() === '0,1,2,3,4,5') return 'Mon–Sat';
    if (s.join() === '5,6') return 'Weekends';
    return s.map((d) => DAY_NAMES[d]).join(', ');
  }

  // duration of a window in minutes
  const winLen = (s) => mins(s.end) - mins(s.start);

  // which weekday indices a schedule occurs on (one-off → its single weekday)
  const occDays = (sc) => sc.mode === 'once' ? [weekdayOfDate(sc.date)] : sc.days;
  // human label for when a schedule runs
  const whenLabel = (sc) => sc.mode === 'once' ? fmtDateFull(sc.date) : daysLabel(sc.days);
  // shared occurrence days between two schedules (handles mixed recurring/one-off)
  function dayConflict(a, b) {
    if (a.mode === 'once' && b.mode === 'once') return a.date === b.date ? [weekdayOfDate(a.date)] : [];
    const da = occDays(a), db = occDays(b);
    return da.filter((d) => db.includes(d));
  }

  // ---------------------------------------------------------------
  //  module-scope cache so edits survive page remounts in a session
  // ---------------------------------------------------------------
  let SC_CACHE = null;

  function buildSeed(playlists, screens) {
    const pl = (id) => playlists.find((p) => p.id === id) || playlists[0] || { id: 'p?', name: 'Playlist', color: '#6d6cf6' };
    const sIds = (...ids) => ids.filter((id) => screens.some((s) => s.id === id));
    const mk = (o) => ({ id: 'sc' + uid(), enabled: true, priority: 'normal', mode: 'recurring', ...o });
    const monday = mondayOf(new Date());
    const thisWed = toDateStr(addDays(monday, 2));
    const thisFri = toDateStr(addDays(monday, 4));
    return [
      mk({ name: 'Morning Welcome', playlistId: 'p1', screenIds: sIds('s1', 's2'), days: [0, 1, 2, 3, 4], start: '07:00', end: '11:00' }),
      mk({ name: 'Lunch Menu Switch', playlistId: 'p3', screenIds: sIds('s3'), days: [0, 1, 2, 3, 4, 5], start: '11:00', end: '14:30' }),
      mk({ name: 'Spring Sale Push', playlistId: 'p2', screenIds: sIds('s4', 's7'), days: ALL_DAYS, start: '09:00', end: '18:00', priority: 'high' }),
      mk({ name: 'Evening Showreel', playlistId: 'p1', screenIds: sIds('s1'), days: ALL_DAYS, start: '17:00', end: '22:00' }),
      mk({ name: 'Warehouse Safety', playlistId: 'p4', screenIds: sIds('s6'), days: [0, 1, 2, 3, 4], start: '06:00', end: '15:00' }),
      // deliberately overlaps Morning Welcome on s1 (Mon–Fri 09:00–11:00) → conflict demo
      mk({ name: 'Lobby Promo Takeover', playlistId: 'p2', screenIds: sIds('s1'), days: [0, 1, 2, 3, 4], start: '09:00', end: '12:00', priority: 'high' }),
      // one-off, specific-date schedules
      mk({ name: 'Quarterly Town Hall', playlistId: 'p1', screenIds: sIds('s1', 's8'), mode: 'once', date: thisWed, start: '13:00', end: '14:30', priority: 'high' }),
      mk({ name: 'Black Friday Teaser', playlistId: 'p2', screenIds: sIds('s4'), mode: 'once', date: thisFri, start: '08:00', end: '20:00' }),
    ];
  }

  const colorOf = (sc, playlists) => (playlists.find((p) => p.id === sc.playlistId) || {}).color || '#6d6cf6';
  const playlistOf = (sc, playlists) => playlists.find((p) => p.id === sc.playlistId);

  // ---------------------------------------------------------------
  //  conflict detection — same screen, overlapping day, overlapping time
  // ---------------------------------------------------------------
  function findConflicts(list) {
    const conflicts = []; // { a, b, screenId, days:[], from, to }
    const enabled = list.filter((s) => s.enabled);
    for (let i = 0; i < enabled.length; i++) {
      for (let j = i + 1; j < enabled.length; j++) {
        const a = enabled[i], b = enabled[j];
        const screens = a.screenIds.filter((id) => b.screenIds.includes(id));
        if (!screens.length) continue;
        const days = dayConflict(a, b);
        if (!days.length) continue;
        const from = Math.max(mins(a.start), mins(b.start));
        const to = Math.min(mins(a.end), mins(b.end));
        if (from >= to) continue;
        const onceA = a.mode === 'once', onceB = b.mode === 'once';
        const whenText = (onceA || onceB) ? fmtDateFull((onceA ? a : b).date) : daysLabel(days);
        conflicts.push({ a, b, screenIds: screens, days, from, to, whenText });
      }
    }
    return conflicts;
  }

  // ===============================================================
  //  WEEK CALENDAR — the hero
  // ===============================================================
  const DAY_START = 6 * 60;   // 06:00
  const DAY_END = 23 * 60;    // 23:00
  const HOUR_PX = 46;
  const PX_PER_MIN = HOUR_PX / 60;
  const gridH = ((DAY_END - DAY_START) / 60) * HOUR_PX;

  // cluster overlapping blocks within a single day into side-by-side lanes
  function layoutDay(blocks) {
    const sorted = blocks.slice().sort((x, y) => mins(x.sc.start) - mins(y.sc.start) || winLen(y.sc) - winLen(x.sc));
    const out = [];
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      if (!cluster.length) return;
      const lanes = []; // each lane = end-minute
      cluster.forEach((blk) => {
        const st = mins(blk.sc.start);
        let lane = lanes.findIndex((end) => end <= st);
        if (lane === -1) { lane = lanes.length; lanes.push(0); }
        lanes[lane] = mins(blk.sc.end);
        blk.lane = lane;
      });
      const n = lanes.length;
      cluster.forEach((blk) => { blk.lanes = n; });
      out.push(...cluster);
      cluster = [];
      clusterEnd = -1;
    };
    sorted.forEach((blk) => {
      const st = mins(blk.sc.start);
      if (cluster.length && st >= clusterEnd) flush();
      cluster.push(blk);
      clusterEnd = Math.max(clusterEnd, mins(blk.sc.end));
    });
    flush();
    return out;
  }

  function WeekCalendar({ list, playlists, conflictKeys, overrides, onOpen }) {
    const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
    const hours = [];
    for (let h = DAY_START / 60; h <= DAY_END / 60; h++) hours.push(h);

    const colDates = ALL_DAYS.map((i) => addDays(weekStart, i));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowVisible = nowMin >= DAY_START && nowMin <= DAY_END;
    const nowTop = (nowMin - DAY_START) * PX_PER_MIN;
    const navBtn = { display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' };

    return (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--card-pad) var(--card-pad) 14px' }}>
          <CardHead title="Week schedule" sub={`${fmtDateMD(weekStart)} – ${fmtDateMD(addDays(weekStart, 6))} · click any block to edit`} icon={<Icon.Calendar s={18} />}
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" title="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))} style={navBtn}><Icon.Chevron s={16} style={{ transform: 'rotate(180deg)' }} /></button>
                <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>This week</button>
                <button type="button" title="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))} style={navBtn}><Icon.Chevron s={16} /></button>
              </div>
            } />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 760 }}>
            {/* day header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7, 1fr)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ borderRight: '1px solid var(--border)' }} />
              {ALL_DAYS.map((i) => {
                const isToday = toDateStr(colDates[i]) === TODAY_STR;
                return (
                  <div key={i} style={{ padding: '8px 6px', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                    background: isToday ? 'var(--accent-soft)' : 'transparent' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text)' }}>{DAY_NAMES[i]}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-faint)', marginTop: 2 }}>{colDates[i].getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* grid body */}
            <div style={{ display: 'grid', gridTemplateColumns: '54px repeat(7, 1fr)', position: 'relative' }}>
              {/* hour gutter */}
              <div style={{ position: 'relative', borderRight: '1px solid var(--border)', height: gridH }}>
                {hours.map((h, i) => (
                  <div key={h} className="mono" style={{ position: 'absolute', top: i * HOUR_PX - 7, right: 8, fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>
                    {String(h).padStart(2, '0') + ':00'}
                  </div>
                ))}
              </div>

              {/* day columns */}
              {ALL_DAYS.map((i) => {
                const colStr = toDateStr(colDates[i]);
                const isToday = colStr === TODAY_STR;
                const blocks = layoutDay(
                  list.filter((s) => s.mode === 'once' ? s.date === colStr : s.days.includes(i)).map((sc) => ({ sc }))
                );
                return (
                  <div key={i} style={{ position: 'relative', height: gridH, borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                    background: isToday ? 'color-mix(in srgb, var(--accent-soft) 45%, transparent)' : 'transparent' }}>
                    {/* hour gridlines */}
                    {hours.map((h, i) => (
                      <div key={h} style={{ position: 'absolute', top: i * HOUR_PX, left: 0, right: 0, height: 1,
                        background: 'var(--border)', opacity: i === 0 ? 0 : 0.6 }} />
                    ))}

                    {/* now line */}
                    {isToday && nowVisible && (
                      <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: 'var(--accent)', zIndex: 6, boxShadow: '0 0 8px -1px var(--accent)' }}>
                        <span style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, borderRadius: 99, background: 'var(--accent)' }} />
                      </div>
                    )}

                    {/* blocks */}
                    {blocks.map(({ sc, lane = 0, lanes = 1 }) => {
                      const top = Math.max(0, (mins(sc.start) - DAY_START) * PX_PER_MIN);
                      const height = Math.max(20, (Math.min(mins(sc.end), DAY_END) - Math.max(mins(sc.start), DAY_START)) * PX_PER_MIN);
                      const color = colorOf(sc, playlists);
                      const w = 100 / lanes;
                      const ck = conflictKeys.get(sc.id);
                      const conflict = !!ck && (ck.has('w' + i) || ck.has('d' + colStr));
                      const ov = overrides && sc.screenIds.some((id) => overrides.has(id));
                      const tall = height > 46;
                      const once = sc.mode === 'once';
                      return (
                        <button key={sc.id} onClick={() => onOpen(sc.id)} title={`${sc.name} · ${fmtRange(sc.start, sc.end)}${once ? ' · one-off' : ''}${ov ? ' · overridden by live stream' : ''}`}
                          style={{ position: 'absolute', top: top + 1.5, height: height - 3,
                            left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
                            display: 'flex', flexDirection: 'column', gap: 1, justifyContent: tall ? 'flex-start' : 'center',
                            textAlign: 'left', padding: tall ? '6px 8px' : '0 8px', borderRadius: 8, cursor: 'pointer', overflow: 'hidden',
                            border: `1px solid ${conflict ? 'var(--offline)' : ov ? 'var(--warn)' : 'color-mix(in srgb, ' + color + ' 60%, transparent)'}`,
                            borderLeft: `3px ${once ? 'dashed' : 'solid'} ${ov ? 'var(--warn)' : color}`,
                            background: !sc.enabled ? 'var(--surface-2)' : ov ? 'var(--warn-dim)' : `color-mix(in srgb, ${color} 20%, var(--surface))`,
                            opacity: !sc.enabled ? 0.55 : ov ? 0.78 : 1,
                            boxShadow: conflict ? '0 0 0 1px var(--offline)' : 'none' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
                            display: 'flex', alignItems: 'center', gap: 4 }}>
                            {conflict && <Icon.Alert s={11} style={{ color: 'var(--offline)', flexShrink: 0 }} />}
                            {ov && !conflict && <Icon.Stream s={11} style={{ color: 'var(--warn)', flexShrink: 0 }} />}
                            {once && !conflict && !ov && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: '.02em', color: color, border: `1px solid ${color}`, borderRadius: 4, padding: '0 3px', lineHeight: '13px' }}>1×</span>}
                            {!sc.enabled && <Icon.Power s={10} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.name}</span>
                          </span>
                          {tall && <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtRange(sc.start, sc.end)}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ===============================================================
  //  SCHEDULE CARD (list view)
  // ===============================================================
  function ScheduleCard({ sc, playlists, screenById, conflict, override, onEdit, onToggle, onDuplicate, onDelete }) {
    const [menu, setMenu] = useState(false);
    const pl = playlistOf(sc, playlists);
    const color = colorOf(sc, playlists);
    const screens = sc.screenIds.map((id) => screenById.get(id)).filter(Boolean);
    const MENU_ITEM = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px',
      borderRadius: 9, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 };

    return (
      <Card hover style={{ overflow: 'visible', display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 13 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, color: '#fff', flexShrink: 0,
            background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))` }}><Icon.Calendar s={21} /></span>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ flex: '0 1 auto', fontWeight: 700, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.name}</span>
              {override && <Badge tone="warning" icon={<Icon.Stream s={11} />}>Live override</Badge>}
              {conflict && !override && <Badge tone="offline" icon={<Icon.Alert s={11} />}>Conflict</Badge>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />
              {pl ? pl.name : 'No playlist'}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu((m) => !m)} title="Actions" style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: menu ? 'var(--surface-3)' : 'transparent', color: 'var(--text-muted)' }}><Icon.Dots s={18} /></button>
            {menu && (
              <React.Fragment>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', right: 0, minWidth: 190,
                  background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 13, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', padding: 6, animation: 'fadeUp .15s ease both' }}>
                  <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--text)' }} onClick={() => { onEdit(); setMenu(false); }}>
                    <Icon.Pencil s={16} style={{ color: 'var(--text-muted)' }} /> Edit schedule
                  </button>
                  <button className="wall-menu-item" style={{ ...MENU_ITEM, color: 'var(--text)' }} onClick={() => { onToggle(); setMenu(false); }}>
                    <Icon.Power s={16} style={{ color: 'var(--text-muted)' }} /> {sc.enabled ? 'Disable' : 'Enable'}
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

        {/* meta rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', rowGap: 6 }}>
            <Icon.Clock s={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <span className="mono" style={{ fontWeight: 700 }}>{fmtRange(sc.start, sc.end)}</span>
            <span style={{ color: 'var(--text-faint)' }}>·</span>
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{whenLabel(sc)}</span>
            {sc.mode === 'once' && <Badge tone="info" icon={<Icon.Calendar s={11} />}>One-off</Badge>}
            {sc.priority === 'high' && <Badge tone="warning" icon={<Icon.Layers s={11} />}>High priority</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon.Screens s={15} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 0 }}>
              {screens.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No screens</span>}
              {screens.slice(0, 3).map((s) => (
                <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99,
                  background: 'var(--surface-3)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                  <StatusDot status={s.status} size={6} />{s.name}
                </span>
              ))}
              {screens.length > 3 && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', alignSelf: 'center' }}>+{screens.length - 3}</span>}
            </div>
          </div>
        </div>

        {/* footer: enable switch */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          {override ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--warn)' }}>
              <Icon.Stream s={14} /> Overridden by {override.label}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: sc.enabled ? 'var(--online)' : 'var(--text-faint)' }}>
              <StatusDot status={sc.enabled ? 'online' : 'offline'} size={7} pulse={sc.enabled} />{sc.enabled ? 'Active' : 'Paused'}
            </span>
          )}
          <Switch value={sc.enabled} onChange={onToggle} />
        </div>
      </Card>
    );
  }

  function Switch({ value, onChange }) {
    return (
      <button type="button" onClick={onChange} title={value ? 'Disable' : 'Enable'}
        style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, flexShrink: 0, cursor: 'pointer', transition: 'background .18s',
          background: value ? 'var(--accent)' : 'var(--surface-3)', border: '1px solid var(--border-strong)' }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 2px 5px rgba(0,0,0,.3)' }} />
      </button>
    );
  }

  // ===============================================================
  //  MODAL SHELL (wider than the shared Overlay)
  // ===============================================================
  function Modal({ title, sub, icon, onClose, children, footer, width = 660 }) {
    useEffect(() => {
      const k = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', k);
      return () => window.removeEventListener('keydown', k);
    }, []);
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 24,
        background: 'rgba(4,6,11,.55)', backdropFilter: 'blur(6px)', animation: 'fadeIn .2s ease both' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: width, animation: 'fadeUp .3s cubic-bezier(.22,.61,.36,1) both' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 11,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff' }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
              <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>{children}</div>
            {footer && <div style={{ display: 'flex', gap: 10, padding: 24, borderTop: '1px solid var(--border)', flexShrink: 0 }}>{footer}</div>}
          </div>
        </div>
      </div>
    );
  }

  const FieldLabel = ({ children, hint }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 9 }}>
      {children}{hint && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{hint}</span>}
    </span>
  );

  // ---- day-of-week toggle ----
  function DayToggle({ days, onChange }) {
    const set = new Set(days);
    const toggle = (d) => { const n = new Set(set); n.has(d) ? n.delete(d) : n.add(d); onChange([...n].sort((a, b) => a - b)); };
    const presets = [['Daily', ALL_DAYS], ['Mon–Fri', [0, 1, 2, 3, 4]], ['Weekends', [5, 6]]];
    const matches = (p) => p.length === days.length && p.every((d) => set.has(d));
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          {DAY_NAMES.map((d, i) => {
            const on = set.has(i);
            return (
              <button key={i} type="button" onClick={() => toggle(i)} title={DAY_FULL[i]}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent)' : 'var(--surface-2)',
                  color: on ? '#fff' : 'var(--text-muted)' }}>{d[0]}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {presets.map(([label, p]) => {
            const active = matches(p);
            return (
              <button key={label} type="button" onClick={() => onChange(p.slice())}
                style={{ padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- time range ----
  const timeInp = { padding: '10px 12px', borderRadius: 10, fontSize: 15, fontFamily: 'var(--mono, ui-monospace, monospace)',
    background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none', colorScheme: 'inherit' };

  function TimeRange({ start, end, onChange }) {
    const presets = [['Business 09–17', '09:00', '17:00'], ['Morning 06–12', '06:00', '12:00'], ['Evening 17–22', '17:00', '22:00'], ['All day', '06:00', '23:00']];
    const invalid = mins(end) <= mins(start);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="time" value={start} onChange={(e) => onChange({ start: e.target.value })} style={{ ...timeInp, flex: 1 }} />
          <span style={{ color: 'var(--text-faint)', fontWeight: 700 }}>→</span>
          <input type="time" value={end} onChange={(e) => onChange({ end: e.target.value })} style={{ ...timeInp, flex: 1, borderColor: invalid ? 'var(--offline)' : 'var(--border-strong)' }} />
        </div>
        {invalid && <div style={{ fontSize: 12, color: 'var(--offline)', marginTop: 7 }}>End time must be after the start time.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
          {presets.map(([label, s, e]) => {
            const active = start === s && end === e;
            return (
              <button key={label} type="button" onClick={() => onChange({ start: s, end: e })}
                style={{ padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</button>
            );
          })}
        </div>
      </div>
    );
  }

  // ===============================================================
  //  CREATE / EDIT MODAL
  // ===============================================================
  function ScheduleEditor({ initial, playlists, screens, onClose, onSave, onDelete }) {
    const editing = !!initial;
    const [name, setName] = useState(initial ? initial.name : '');
    const [playlistId, setPlaylistId] = useState(initial ? initial.playlistId : (playlists[0] && playlists[0].id) || '');
    const [screenIds, setScreenIds] = useState(initial ? initial.screenIds.slice() : []);
    const [days, setDays] = useState(initial ? initial.days.slice() : [0, 1, 2, 3, 4]);
    const [start, setStart] = useState(initial ? initial.start : '09:00');
    const [end, setEnd] = useState(initial ? initial.end : '17:00');
    const [priority, setPriority] = useState(initial ? initial.priority : 'normal');
    const [mode, setMode] = useState(initial ? (initial.mode || 'recurring') : 'recurring');
    const [date, setDate] = useState(initial && initial.date ? initial.date : TODAY_STR);
    const [q, setQ] = useState('');

    const whenValid = mode === 'recurring' ? days.length > 0 : !!date;
    const valid = name.trim().length > 1 && playlistId && screenIds.length > 0 && whenValid && mins(end) > mins(start);
    const toggleScreen = (id) => setScreenIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    const filtered = screens.filter((s) => (s.name + ' ' + s.loc).toLowerCase().includes(q.trim().toLowerCase()));

    const save = () => {
      if (!valid) return;
      onSave({
        id: editing ? initial.id : 'sc' + uid(),
        enabled: editing ? initial.enabled : true,
        name: name.trim(), playlistId, screenIds, start, end, priority, mode,
        days: mode === 'recurring' ? days.slice() : [weekdayOfDate(date)],
        date: mode === 'once' ? date : undefined,
      });
    };

    const inp = { width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
      background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none' };

    return (
      <Modal title={editing ? 'Edit schedule' : 'New schedule'} sub="Decide when a playlist plays — and where"
        icon={<Icon.Calendar s={21} />} onClose={onClose} width={680}
        footer={
          <React.Fragment>
            {editing && <Btn variant="danger" icon={<Icon.Trash s={15} />} onClick={onDelete}>Delete</Btn>}
            <div style={{ flex: 1 }} />
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant={valid ? 'primary' : 'ghost'} onClick={valid ? save : undefined}
              icon={<Icon.Check s={17} sw={2.4} />} style={!valid ? { opacity: .5, cursor: 'not-allowed' } : {}}>
              {editing ? 'Save changes' : 'Create schedule'}
            </Btn>
          </React.Fragment>
        }>
        <label style={{ display: 'block' }}>
          <FieldLabel>Schedule name</FieldLabel>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Welcome" autoFocus style={inp} />
        </label>

        {/* playlist */}
        <div>
          <FieldLabel>Playlist to play</FieldLabel>
          {playlists.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No playlists yet — create one first.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {playlists.map((p) => {
                const on = playlistId === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => setPlaylistId(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, flexShrink: 0, color: '#fff',
                      background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 55%, #fff))` }}><Icon.Playlists s={15} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{p.items} items</span>
                    </span>
                    {on && <Icon.Check s={16} sw={2.6} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* schedule type */}
        <div>
          <FieldLabel>When does it run?</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['recurring', 'Repeats weekly', 'Refresh'], ['once', 'One-off date', 'Calendar']].map(([v, l, ic]) => {
              const IconC = Icon[ic];
              const on = mode === v;
              return (
                <button key={v} type="button" onClick={() => setMode(v)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'transparent',
                    color: on ? 'var(--accent)' : 'var(--text-muted)' }}><IconC s={16} />{l}</button>
              );
            })}
          </div>
        </div>

        {/* day-or-date + time, two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="main-grid">
          <div>
            <FieldLabel>{mode === 'recurring' ? 'Repeat on' : 'Date'}</FieldLabel>
            {mode === 'recurring' ? (
              <DayToggle days={days} onChange={setDays} />
            ) : (
              <div>
                <input type="date" value={date} min={TODAY_STR} onChange={(e) => e.target.value && setDate(e.target.value)}
                  style={{ ...timeInp, width: '100%', fontSize: 14 }} />
                <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, marginTop: 9 }}>{fmtDateFull(date)}</div>
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Time window</FieldLabel>
            <TimeRange start={start} end={end} onChange={(p) => { if (p.start !== undefined) setStart(p.start); if (p.end !== undefined) setEnd(p.end); }} />
          </div>
        </div>

        {/* priority */}
        <div>
          <FieldLabel hint={priority === 'high' ? '· wins when schedules overlap' : null}>Priority</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['normal', 'Normal', 'Clock'], ['high', 'High', 'Layers']].map(([v, l, ic]) => {
              const IconC = Icon[ic];
              const on = priority === v;
              return (
                <button key={v} type="button" onClick={() => setPriority(v)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-soft)' : 'transparent',
                    color: on ? 'var(--accent)' : 'var(--text-muted)' }}><IconC s={16} />{l}</button>
              );
            })}
          </div>
        </div>

        {/* screens */}
        <div>
          <FieldLabel hint={screenIds.length ? `· ${screenIds.length} selected` : null}>Target screens</FieldLabel>
          {screens.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No screens paired yet.</div>
          ) : (
            <React.Fragment>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}><Icon.Search s={16} /></span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search screens…" style={{ ...inp, padding: '10px 34px 10px 36px', fontSize: 13.5 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 210, overflowY: 'auto' }}>
                {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 2px' }}>No screens match “{q}”.</div>}
                {filtered.map((s) => {
                  const on = screenIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleScreen(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 11px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, background: on ? 'var(--accent)' : 'transparent', color: '#fff' }}>
                        {on && <Icon.Check s={12} sw={3} />}
                      </span>
                      <span style={{ width: 34, height: 21, borderRadius: 5, flexShrink: 0, background: s.thumb }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                        <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{s.res2} · {s.loc}</span>
                      </span>
                      <StatusDot status={s.status} size={7} />
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          )}
        </div>
      </Modal>
    );
  }

  // ===============================================================
  //  CONFLICT BANNER
  // ===============================================================
  function ConflictBanner({ conflicts, screenById, onOpen }) {
    const [open, setOpen] = useState(false);
    if (!conflicts.length) return null;
    return (
      <div style={{ marginBottom: 'var(--gap)', border: '1px solid color-mix(in srgb, var(--offline) 45%, var(--border))', borderRadius: 'var(--r-lg)',
        background: 'var(--offline-dim)', overflow: 'hidden' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 18px', cursor: 'pointer',
          background: 'transparent', border: 'none', textAlign: 'left' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--offline) 22%, transparent)', color: 'var(--offline)', flexShrink: 0 }}>
            <Icon.Alert s={19} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {conflicts.length} scheduling conflict{conflicts.length !== 1 ? 's' : ''} detected
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Two schedules target the same screen at the same time. Higher priority wins.</div>
          </div>
          <Icon.Chevron s={18} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
        </button>
        {open && (
          <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {conflicts.map((c, i) => {
              const sNames = c.screenIds.map((id) => (screenById.get(id) || {}).name).filter(Boolean).join(', ');
              const fromT = `${String(Math.floor(c.from / 60)).padStart(2, '0')}:${String(c.from % 60).padStart(2, '0')}`;
              const toT = `${String(Math.floor(c.to / 60)).padStart(2, '0')}:${String(c.to % 60).padStart(2, '0')}`;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <button onClick={() => onOpen(c.a.id)} style={{ fontWeight: 700, color: 'var(--text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{c.a.name}</button>
                    <span style={{ color: 'var(--text-faint)' }}> ⟷ </span>
                    <button onClick={() => onOpen(c.b.id)} style={{ fontWeight: 700, color: 'var(--text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{c.b.name}</button>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span className="mono">{fromT}–{toT}</span> · {c.whenText} · {sNames}
                    </div>
                  </div>
                  <Badge tone="offline" icon={<Icon.Alert s={11} />}>Overlap</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===============================================================
  //  LIVE-STREAM OVERRIDE BANNER
  // ===============================================================
  function OverrideBanner({ items, overrideOf, onOpen }) {
    const [open, setOpen] = useState(false);
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 'var(--gap)', border: '1px solid color-mix(in srgb, var(--warn) 45%, var(--border))', borderRadius: 'var(--r-lg)', background: 'var(--warn-dim)', overflow: 'hidden' }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 18px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--warn) 22%, transparent)', color: 'var(--warn)', flexShrink: 0 }}>
            <Icon.Stream s={19} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {items.length} schedule{items.length !== 1 ? 's' : ''} overridden by a live stream
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Live streams take priority — these schedules are paused on the affected screens until the stream stops.</div>
          </div>
          <Icon.Chevron s={18} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
        </button>
        {open && (
          <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((sc) => {
              const o = overrideOf(sc);
              return (
                <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <button onClick={() => onOpen(sc.id)} style={{ fontWeight: 700, color: 'var(--text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{sc.name}</button>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Overridden on {o.count} screen{o.count !== 1 ? 's' : ''} by <span style={{ fontWeight: 600, color: 'var(--text)' }}>{o.label}</span></div>
                  </div>
                  <Badge tone="warning" icon={<Icon.Stream s={11} />}>Live override</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ===============================================================
  //  UPCOMING TODAY (right rail in list view)
  // ===============================================================
  function UpcomingToday({ list, playlists, screenById, overrideOf, onOpen }) {
    const ti = todayIdx();
    const todays = list.filter((s) => s.enabled && (s.mode === 'once' ? s.date === TODAY_STR : s.days.includes(ti))).sort((a, b) => mins(a.start) - mins(b.start));
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return (
      <Card>
        <CardHead title="Today" sub={`${DAY_FULL[ti]} · ${todays.length} scheduled`} icon={<Icon.Clock s={18} />} />
        {todays.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Nothing scheduled for today.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {todays.map((s, i) => {
              const color = colorOf(s, playlists);
              const pl = playlistOf(s, playlists);
              const live = nowMin >= mins(s.start) && nowMin < mins(s.end);
              const past = nowMin >= mins(s.end);
              const ov = overrideOf ? overrideOf(s) : null;
              return (
                <button key={s.id} onClick={() => onOpen(s.id)} style={{ display: 'flex', gap: 14, padding: '12px 0', textAlign: 'left', cursor: 'pointer',
                  background: 'transparent', border: 'none', borderTop: i ? '1px solid var(--border)' : 'none', opacity: past ? 0.5 : 1 }}>
                  <div className="mono" style={{ width: 46, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{s.start}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                      {ov ? <Badge tone="warning" icon={<Icon.Stream s={11} />}>Override</Badge> : (live && <Badge tone="online" icon={<StatusDot status="online" size={6} pulse />}>Live</Badge>)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {pl ? pl.name : '—'} · until {s.end}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  // ===============================================================
  //  PAGE
  // ===============================================================
  function SchedulesPage({ playlists, screens, seeded, onLoadSample, notify }) {
    const [view, setView] = useState('week'); // week | list
    const [editor, setEditor] = useState(null); // { id } | { id: null } for new | null
    const [list, setList] = useState(() => {
      if (!seeded) return [];
      if (!SC_CACHE) SC_CACHE = buildSeed(playlists, screens);
      return SC_CACHE;
    });
    useEffect(() => { if (seeded) SC_CACHE = list; }, [list, seeded]);
    // re-seed when sample data arrives after mount
    useEffect(() => {
      if (seeded && list.length === 0) {
        if (!SC_CACHE || !SC_CACHE.length) SC_CACHE = buildSeed(playlists, screens);
        setList(SC_CACHE);
      }
    }, [seeded]);

    const screenById = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens]);
    const conflicts = useMemo(() => findConflicts(list), [list]);
    const conflictIds = useMemo(() => {
      const set = new Set();
      conflicts.forEach((c) => { set.add(c.a.id); set.add(c.b.id); });
      return set;
    }, [conflicts]);
    // per-occurrence conflict keys: 'w'+weekday for recurring overlaps, 'd'+date for one-off overlaps
    const conflictKeys = useMemo(() => {
      const map = new Map();
      const add = (id, key) => { if (!map.has(id)) map.set(id, new Set()); map.get(id).add(key); };
      conflicts.forEach((c) => {
        const onceDate = c.a.mode === 'once' ? c.a.date : (c.b.mode === 'once' ? c.b.date : null);
        if (onceDate) { add(c.a.id, 'd' + onceDate); add(c.b.id, 'd' + onceDate); }
        else { c.days.forEach((d) => { add(c.a.id, 'w' + d); add(c.b.id, 'w' + d); }); }
      });
      return map;
    }, [conflicts]);

    // live streams override scheduled playlists on the screens they target
    const overrides = useMemo(() => (window.streamOverrides ? window.streamOverrides(screens) : new Map()), [screens]);
    const overrideOf = useCallback((sc) => {
      const hit = sc.screenIds.filter((id) => overrides.has(id));
      if (!hit.length) return null;
      const streams = [...new Set(hit.map((id) => overrides.get(id)))];
      return { count: hit.length, label: streams.length === 1 ? streams[0] : `${streams.length} live streams` };
    }, [overrides]);
    const overridden = useMemo(() => list.filter((s) => s.enabled && overrideOf(s)), [list, overrideOf]);

    const upsert = (sc) => setList((ls) => ls.some((x) => x.id === sc.id) ? ls.map((x) => x.id === sc.id ? sc : x) : [...ls, sc]);
    const toggle = (id) => setList((ls) => ls.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x));
    const duplicate = (sc) => {
      const copy = { ...sc, id: 'sc' + uid(), name: sc.name + ' (copy)' };
      setList((ls) => [...ls, copy]);
      notify && notify({ title: 'Schedule duplicated', desc: `“${copy.name}” created`, tone: 'accent', icon: 'Copy' });
    };
    const remove = (sc) => {
      setList((ls) => ls.filter((x) => x.id !== sc.id));
      notify && notify({ title: 'Schedule deleted', desc: `“${sc.name}” removed`, tone: 'offline', icon: 'Trash' });
    };

    // ---- empty state ----
    if (!seeded || (list.length === 0 && !editor)) {
      return (
        <div>
          <PageHeader title="Schedules" sub="When and where content plays"
            actions={seeded ? <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setEditor({ id: null })}>New schedule</Btn> : null} />
          <Card animate style={{ padding: '64px 24px' }}>
            <Empty icon={<Icon.Schedules s={26} />} title="Nothing scheduled"
              desc="Decide when playlists go live on each screen — recurring weekly windows or one-off pushes, with automatic conflict detection."
              action={<div style={{ display: 'flex', gap: 10 }}>
                {seeded
                  ? <Btn variant="primary" icon={<Icon.Plus s={17} />} onClick={() => setEditor({ id: null })}>Create schedule</Btn>
                  : <Btn variant="primary" icon={<Icon.Sparkle s={16} />} onClick={onLoadSample}>Load sample data</Btn>}
              </div>} />
          </Card>
          {editor && (
            <ScheduleEditor initial={editor.id ? list.find((s) => s.id === editor.id) : null} playlists={playlists} screens={screens}
              onClose={() => setEditor(null)}
              onSave={(sc) => { upsert(sc); setEditor(null); notify && notify({ title: 'Schedule created', desc: `“${sc.name}” is live`, tone: 'accent', icon: 'Calendar' }); }}
              onDelete={() => { const sc = list.find((s) => s.id === editor.id); if (sc) remove(sc); setEditor(null); }} />
          )}
        </div>
      );
    }

    const active = list.filter((s) => s.enabled).length;

    return (
      <div>
        <PageHeader title="Schedules" sub={`${list.length} schedule${list.length !== 1 ? 's' : ''} · ${active} active${conflicts.length ? ` · ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''}` : ''}`}
          actions={
            <React.Fragment>
              <div style={{ display: 'flex', padding: 3, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {[['week', 'Week', 'Calendar'], ['list', 'List', 'List']].map(([v, l, ic]) => {
                  const IconC = Icon[ic];
                  const on = view === v;
                  return (
                    <button key={v} onClick={() => setView(v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: 'none', background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-muted)', boxShadow: on ? 'var(--shadow)' : 'none' }}>
                      <IconC s={15} />{l}
                    </button>
                  );
                })}
              </div>
              <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={() => setEditor({ id: null })}>New schedule</Btn>
            </React.Fragment>
          } />

        <ConflictBanner conflicts={conflicts} screenById={screenById} onOpen={(id) => setEditor({ id })} />
        <OverrideBanner items={overridden} overrideOf={overrideOf} onOpen={(id) => setEditor({ id })} />

        {view === 'week' ? (
          <WeekCalendar list={list} playlists={playlists} conflictKeys={conflictKeys} overrides={overrides} onOpen={(id) => setEditor({ id })} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--gap)', alignItems: 'start' }} className="main-grid">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--gap)' }}>
              {list.map((sc) => (
                <ScheduleCard key={sc.id} sc={sc} playlists={playlists} screenById={screenById} conflict={conflictIds.has(sc.id)} override={overrideOf(sc)}
                  onEdit={() => setEditor({ id: sc.id })} onToggle={() => toggle(sc.id)} onDuplicate={() => duplicate(sc)} onDelete={() => remove(sc)} />
              ))}
            </div>
            <UpcomingToday list={list} playlists={playlists} screenById={screenById} overrideOf={overrideOf} onOpen={(id) => setEditor({ id })} />
          </div>
        )}

        {editor && (
          <ScheduleEditor initial={editor.id ? list.find((s) => s.id === editor.id) : null} playlists={playlists} screens={screens}
            onClose={() => setEditor(null)}
            onSave={(sc) => { const exists = list.some((x) => x.id === sc.id); upsert(sc); setEditor(null);
              notify && notify({ title: exists ? 'Schedule updated' : 'Schedule created', desc: `“${sc.name}” saved`, tone: 'accent', icon: 'Calendar' }); }}
            onDelete={() => { const sc = list.find((s) => s.id === editor.id); if (sc) remove(sc); setEditor(null); }} />
        )}
      </div>
    );
  }

  Object.assign(window, { SchedulesPage });
})();
