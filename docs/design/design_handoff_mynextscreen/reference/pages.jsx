// pages.jsx — Screens, Content, Playlists, Schedules, and light stubs
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, StatusDot, Thumb, Empty, ScreenTile, PageHeader, Activity: ActivityWidget, STATUS } = window;

  function EmptyPage({ icon, title, desc, cta, onCta, secondary, onSecondary }) {
    return (
      <Card animate style={{ padding: '64px 24px' }}>
        <Empty icon={icon} title={title} desc={desc}
          action={<div style={{ display: 'flex', gap: 10 }}>
            {cta && <Btn variant="primary" icon={<Icon.Plus s={17} />} onClick={onCta}>{cta}</Btn>}
            {secondary && <Btn variant="outline" icon={<Icon.Sparkle s={16} />} onClick={onSecondary}>{secondary}</Btn>}
          </div>} />
      </Card>
    );
  }

  // ---------- SCREENS ----------
  function ScreensPage({ screens, seeded, onAddScreen, onLoadSample }) {
    const [filter, setFilter] = useState('all');
    if (!screens.length) return (
      <div>
        <PageHeader title="Screens" sub="Pair and manage every display in your network"
          actions={<Btn variant="primary" icon={<Icon.Plus s={17} />} onClick={onAddScreen}>Add screen</Btn>} />
        <EmptyPage icon={<Icon.Screens s={26} />} title="No screens yet" desc="Pair your first display with a one-time code to start broadcasting content."
          cta="Add your first screen" onCta={onAddScreen} secondary="Load sample data" onSecondary={onLoadSample} />
      </div>
    );
    const counts = { all: screens.length, online: 0, warning: 0, offline: 0 };
    screens.forEach((s) => counts[s.status]++);
    const shown = filter === 'all' ? screens : screens.filter((s) => s.status === filter);
    const tabs = [['all', 'All'], ['online', 'Online'], ['warning', 'Warning'], ['offline', 'Offline']];
    return (
      <div>
        <PageHeader title="Screens" sub={`${counts.online} online · ${counts.warning} warning · ${counts.offline} offline`}
          actions={<><Btn variant="outline" size="md" icon={<Icon.Filter s={16} />}>Filter</Btn>
            <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={onAddScreen}>Add screen</Btn></>} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--gap)', flexWrap: 'wrap' }}>
          {tabs.map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, fontSize: 13.5, fontWeight: 600,
              border: `1px solid ${filter===v?'var(--accent)':'var(--border)'}`, background: filter===v?'var(--accent-soft)':'var(--surface)', color: filter===v?'var(--accent)':'var(--text-muted)' }}>
              {v !== 'all' && <StatusDot status={v} size={7} />}{l}
              <span className="mono" style={{ opacity: .7 }}>{counts[v]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 'var(--gap)' }}>
          {shown.map((s) => <ScreenTile key={s.id} s={s} />)}
        </div>
      </div>
    );
  }

  // AuditPage lives in audit.jsx (full implementation)
  // StreamsPage lives in streams.jsx (full implementation)
  // SettingsPage lives in settings.jsx (full implementation)

  Object.assign(window, { ScreensPage });
})();
