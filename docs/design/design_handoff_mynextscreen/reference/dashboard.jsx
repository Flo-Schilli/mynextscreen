// dashboard.jsx — onboarding empty state + populated dashboard
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Card, CardHead, Badge, Btn, Ring, StatusDot, Stat, ScreensLive, Storage, Alerts, Schedules, Activity, ScreenTile, Thumb, Count } = window;

  function PageHeader({ title, sub, actions }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.025em' }}>{title}</h1>
          {sub && <div style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 5 }}>{sub}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
      </div>
    );
  }

  // ===================== ONBOARDING =====================
  const STEPS = [
    { key: 'screen', icon: 'Screens', title: 'Add your first screen', desc: 'Pair a display with a one-time code. Takes about 30 seconds.', cta: 'Add screen' },
    { key: 'content', icon: 'Upload', title: 'Upload content', desc: 'Bring in images and video. We transcode and optimise automatically.', cta: 'Upload media' },
    { key: 'playlist', icon: 'Playlists', title: 'Build a playlist', desc: 'Sequence your content and set durations and transitions.', cta: 'Create playlist' },
    { key: 'schedule', icon: 'Schedules', title: 'Schedule & publish', desc: 'Choose when and where it plays, then push it live.', cta: 'Schedule' },
  ];

  function StepCard({ step, idx, done, active, onAction }) {
    const IconC = Icon[step.icon];
    return (
      <Card animate delay={idx * 0.06} hover={!done}
        style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: !active && !done ? 0.62 : 1,
          borderColor: active ? 'var(--accent)' : 'var(--border)',
          boxShadow: active ? '0 0 0 1px var(--accent), var(--shadow)' : 'var(--shadow)' }}>
        <div style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: done ? 'var(--online-dim)' : active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--surface-3)',
          color: done ? 'var(--online)' : active ? '#fff' : 'var(--text-faint)' }}>
          {done ? <Icon.Check s={24} sw={2.4} /> : <IconC s={22} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="mono" style={{ fontSize: 12, color: done ? 'var(--online)' : 'var(--text-faint)', fontWeight: 600 }}>
              {done ? 'DONE' : `STEP ${idx + 1}`}
            </span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 2 }}>{step.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{step.desc}</div>
        </div>
        {done
          ? <Badge tone="online" icon={<Icon.Check s={13} />}>Complete</Badge>
          : <Btn variant={active ? 'primary' : 'soft'} size="sm" onClick={onAction} iconRight={<Icon.Arrow s={15} />}>{step.cta}</Btn>}
      </Card>
    );
  }

  function Onboarding({ steps, screens, onStep, onLoadSample }) {
    const done = STEPS.filter((s) => steps[s.key]).length;
    const firstIncomplete = STEPS.findIndex((s) => !steps[s.key]);
    return (
      <div>
        <PageHeader title="Welcome to myNextScreen"
          sub="Let's get your first display live. Four quick steps."
          actions={<Btn variant="outline" icon={<Icon.Sparkle s={16} />} onClick={onLoadSample}>Load sample data</Btn>} />

        {/* progress banner */}
        <Card animate style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 'var(--gap)',
          background: 'linear-gradient(120deg, var(--surface), var(--surface))', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(420px 160px at 88% 20%, var(--accent-soft), transparent 70%)', pointerEvents: 'none' }} />
          <Ring value={(done / 4) * 100} size={92} sw={9}>
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{done}<span style={{ color: 'var(--text-faint)', fontSize: 15 }}>/4</span></div>
            </div>
          </Ring>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{done === 0 ? 'Set up your network' : done === 4 ? "You're all set!" : 'Nice progress — keep going'}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {done === 4 ? 'Loading your live dashboard…' : `${4 - done} step${4-done>1?'s':''} left to publish your first content.`}
            </div>
          </div>
          {screens.length > 0 && (
            <Badge tone="online" icon={<StatusDot status="online" pulse size={7} />}>{screens.length} screen{screens.length>1?'s':''} online</Badge>
          )}
        </Card>

        {/* steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {STEPS.map((s, i) => (
            <StepCard key={s.key} step={s} idx={i} done={steps[s.key]} active={i === firstIncomplete} onAction={() => onStep(s.key)} />
          ))}
        </div>

        {/* live preview once a screen exists */}
        {screens.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              <Icon.Eye s={16} /> Your screen, live now
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--gap)', maxWidth: 480 }}>
              {screens.map((s) => <ScreenTile key={s.id} s={s} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== POPULATED =====================
  function PopulatedDashboard({ screens, content, playlists, schedules, activity, alerts, onAddScreen, setRoute }) {
    const online = screens.filter((s) => s.status === 'online').length;
    const offline = screens.filter((s) => s.status === 'offline').length;
    const warning = screens.filter((s) => s.status === 'warning').length;
    const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <div>
        <PageHeader title="Dashboard" sub={`${greeting}, Admin · ${today}`}
          actions={<>
            <Btn variant="outline" size="md" icon={<Icon.Refresh s={16} />}>Refresh</Btn>
            <Btn variant="primary" size="md" icon={<Icon.Plus s={17} />} onClick={onAddScreen}>Add screen</Btn>
          </>} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)', marginBottom: 'var(--gap)' }} className="kpi-row">
          <Stat label="Screens online" value={online} sub={`${offline} offline · ${warning} warning`} tone="online" icon="Power" spark={[6,6,7,7,8,7,online]} delay={0} />
          <Stat label="Content items" value={content.length} sub="4.8 GB in library" tone="accent" icon="Content" spark={[2,3,3,5,6,7,content.length]} delay={0.05} />
          <Stat label="Active playlists" value={playlists.length} sub={`${schedules.length} scheduled events`} tone="info" icon="Playlists" spark={[1,1,2,2,3,3,playlists.length]} delay={0.1} />
          <Stat label="Open alerts" value={alerts.length} sub="2 critical · 1 warning" tone="offline" icon="Alert" spark={[0,1,1,2,3,2,alerts.length]} delay={0.15} />
        </div>

        {/* main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1fr)', gap: 'var(--gap)', marginBottom: 'var(--gap)', alignItems: 'start' }} className="main-grid">
          <ScreensLive screens={screens} onAll={() => setRoute('screens')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
            <Storage />
            <Alerts alerts={alerts} />
          </div>
        </div>

        {/* bottom grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)', alignItems: 'start' }} className="main-grid">
          <Schedules schedules={schedules} />
          <Activity activity={activity} />
        </div>
      </div>
    );
  }

  function Dashboard(props) {
    const { seeded } = props;
    return seeded
      ? <PopulatedDashboard {...props} />
      : <Onboarding steps={props.steps} screens={props.screens} onStep={props.onStep} onLoadSample={props.onLoadSample} />;
  }

  Object.assign(window, { Dashboard, PageHeader });
})();
