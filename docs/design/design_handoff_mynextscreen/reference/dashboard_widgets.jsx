// dashboard_widgets.jsx — populated-state widgets
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Bar, Ring, Thumb, Count, STATUS } = window;

  // ---- KPI stat card ----
  function Stat({ label, value, suffix, sub, tone = 'accent', icon, spark, delay }) {
    const c = tone === 'accent' ? 'var(--accent)' : `var(--${tone})`;
    const dim = tone === 'accent' ? 'var(--accent-soft)' : `var(--${tone}-dim)`;
    const IconC = Icon[icon];
    return (
      <Card animate delay={delay} hover style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: dim, color: c }}>
            <IconC s={18} />
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <span className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>
            <Count to={value} />{suffix}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{sub}</span>
          {spark && <Sparkline color={c} data={spark} />}
        </div>
      </Card>
    );
  }

  function Sparkline({ data, color, w = 76, h = 26 }) {
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
      return [x, y];
    });
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = `${path} L${w} ${h} L0 ${h} Z`;
    const id = 'sg' + color.replace(/\W/g, '');
    return (
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient></defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // ---- mini screen card for the live grid ----
  function ScreenTile({ s, onClick }) {
    const st = STATUS[s.status];
    return (
      <Card pad={false} hover onClick={onClick} style={{ overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <Thumb bg={s.thumb} orient={s.orient === 'portrait' ? 'landscape' : 'landscape'} h={132}
            type={s.status === 'offline' ? null : 'video'} radius={0} dim={s.status === 'offline'} />
          <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 9px', borderRadius: 99, background: 'rgba(8,11,18,.55)', backdropFilter: 'blur(6px)' }}>
            <StatusDot status={s.status} pulse size={7} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fff' }}>{st.label}</span>
          </div>
          <div style={{ position: 'absolute', top: 9, right: 9, padding: '3px 8px', borderRadius: 7,
            background: 'rgba(8,11,18,.55)', backdropFilter: 'blur(6px)', fontSize: 11, fontWeight: 600, color: '#fff' }} className="mono">{s.res2}</div>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
            <Icon.MapPin s={13} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.loc}</span>
          </div>
          <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            {s.status === 'offline'
              ? <span style={{ color: 'var(--text-faint)' }}>Last seen {s.lastSeen}</span>
              : <><Icon.Play s={11} style={{ color: 'var(--accent)' }} /><span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.playing}</span></>}
          </div>
        </div>
      </Card>
    );
  }

  function ScreensLive({ screens, onAll }) {
    return (
      <Card>
        <CardHead title="Screens" sub={`${screens.filter(s=>s.status!=='offline').length} of ${screens.length} active`} icon={<Icon.Screens s={18} />}
          right={<Btn variant="ghost" size="sm" iconRight={<Icon.Arrow s={15} />} onClick={onAll}>View all</Btn>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 'var(--gap)' }}>
          {screens.slice(0, 6).map((s) => <ScreenTile key={s.id} s={s} onClick={onAll} />)}
        </div>
      </Card>
    );
  }

  // ---- storage donut ----
  function Storage() {
    const orig = 3.2, origMax = 5.0, trans = 1.6, transMax = 5.0;
    return (
      <Card>
        <CardHead title="Storage" sub="Media library usage" icon={<Icon.Storage s={18} />} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Ring value={(orig / origMax) * 100} size={104} sw={11} color="var(--accent)">
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>64<span style={{ fontSize: 13 }}>%</span></div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>used</div>
            </div>
          </Ring>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Originals</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>{orig} / {origMax} GB</span>
              </div>
              <Bar value={(orig/origMax)*100} color="var(--accent)" glow />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Transcoded</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>{trans} / {transMax} GB</span>
              </div>
              <Bar value={(trans/transMax)*100} color="var(--accent-2)" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ---- alerts ----
  function Alerts({ alerts }) {
    const ICONS = { offline: 'WifiOff', warn: 'Alert', info: 'Bell' };
    return (
      <Card>
        <CardHead title="Alerts" sub={`${alerts.length} need attention`} icon={<Icon.Alert s={18} />}
          right={<Badge tone="offline">{alerts.length}</Badge>} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((a) => {
            const IconC = Icon[ICONS[a.tone] || 'Alert'];
            const tone = a.tone === 'offline' ? 'offline' : 'warn';
            return (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '12px 13px', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: `var(--${tone}-dim)`, color: `var(--${tone})` }}><IconC s={17} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{a.desc}</div>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{a.t}</span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // ---- upcoming schedules ----
  function Schedules({ schedules }) {
    return (
      <Card>
        <CardHead title="Upcoming Schedule" sub="Next 24 hours" icon={<Icon.Schedules s={18} />}
          right={<Badge tone="neutral">{schedules.length} events</Badge>} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {schedules.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0',
              borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ textAlign: 'center', width: 52, flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{s.time}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.day}</div>
              </div>
              <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  <span style={{ color: 'var(--accent)' }}>{s.playlist}</span> → {s.target}
                </div>
              </div>
              <Badge tone="neutral">{s.in}</Badge>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ---- activity timeline ----
  function Activity({ activity }) {
    return (
      <Card>
        <CardHead title="Recent Activity" sub="Team & system events" icon={<Icon.Audit s={18} />} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activity.map((a, i) => {
            const IconC = Icon[a.icon] || Icon.Dots;
            const tone = a.tone === 'accent' ? 'accent' : a.tone;
            const c = tone === 'accent' ? 'var(--accent)' : `var(--${tone})`;
            const dim = tone === 'accent' ? 'var(--accent-soft)' : `var(--${tone}-dim)`;
            return (
              <div key={a.id} style={{ display: 'flex', gap: 14, paddingBottom: i === activity.length-1 ? 0 : 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9,
                    background: dim, color: c, flexShrink: 0 }}><IconC s={16} /></span>
                  {i !== activity.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 6, borderRadius: 99 }} />}
                </div>
                <div style={{ paddingTop: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5 }}>
                    <span style={{ fontWeight: 700 }}>{a.who}</span>
                    <span style={{ color: 'var(--text-muted)' }}> {a.action} </span>
                    <span style={{ fontWeight: 600 }}>{a.target}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{a.t}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  Object.assign(window, { Stat, Sparkline, ScreenTile, ScreensLive, Storage, Alerts, Schedules, Activity });
})();
