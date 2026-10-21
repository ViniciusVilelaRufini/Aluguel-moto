function DeckPhone({ screen = 'home' }) {
  const noop = () => {};
  const M = {
    onb0: <Onboarding onDone={noop} />, onb3: <Onboarding onDone={noop} initialStep={3} />,
    home: <HomeScreen onReserve={noop} onScan={noop} onAccount={noop} onList={noop} />,
    homeSel: <HomeScreen onReserve={noop} onScan={noop} onAccount={noop} onList={noop} initialSel={1} />,
    pick: <PickScreen onBack={noop} onMap={noop} onReserve={noop} />,
    reserved: <ReservedScreen vehicle={VEHICLES[0]} onCancel={noop} onScan={noop} />,
    scan: <ScanScreen onBack={noop} onUnlocked={noop} />, plan: <PlanScreen onBack={noop} onConfirm={noop} />,
    ride: <RideScreen onEnd={noop} />, return: <ReturnScreen onBack={noop} onDone={noop} />,
    summary: <SummaryScreen onDone={noop} />, account: <AccountScreen onBack={noop} />,
  };
  return <div data-om-raster="" style={{ width: 402, height: 874 }}><IOSDevice><div style={{ position: 'relative', height: '100%', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>{M[screen]}</div></IOSDevice></div>;
}
window.DeckPhone = DeckPhone;
