/* @ds-bundle: {"format":4,"namespace":"VoltiDesignSystem_09a717","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"FLEET_STATUS","sourcePath":"components/data/FleetStatus.jsx"},{"name":"FleetStatus","sourcePath":"components/data/FleetStatus.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"BottomSheet","sourcePath":"components/feedback/BottomSheet.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"ProgressSteps","sourcePath":"components/feedback/ProgressSteps.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"OptionCard","sourcePath":"components/forms/OptionCard.jsx"},{"name":"OtpInput","sourcePath":"components/forms/OtpInput.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"BatteryPill","sourcePath":"components/mobility/BatteryPill.jsx"},{"name":"ListRow","sourcePath":"components/mobility/ListRow.jsx"},{"name":"LocationHeader","sourcePath":"components/mobility/LocationHeader.jsx"},{"name":"PassCard","sourcePath":"components/mobility/PassCard.jsx"},{"name":"PhotoCapture","sourcePath":"components/mobility/PhotoCapture.jsx"},{"name":"ReservationBanner","sourcePath":"components/mobility/ReservationBanner.jsx"},{"name":"RouteInfoPill","sourcePath":"components/mobility/RouteInfoPill.jsx"},{"name":"SwipeAction","sourcePath":"components/mobility/SwipeAction.jsx"},{"name":"VehicleMarker","sourcePath":"components/mobility/VehicleMarker.jsx"},{"name":"VehicleSummary","sourcePath":"components/mobility/VehicleSummary.jsx"},{"name":"SideNav","sourcePath":"components/navigation/SideNav.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"6a8bde5ab94f","components/core/Button.jsx":"9b9a5dd1621e","components/core/Card.jsx":"32577861a542","components/core/Chip.jsx":"63d76cf23d4d","components/core/Icon.jsx":"d78cbe537f30","components/core/IconButton.jsx":"1e888103dd55","components/data/DataTable.jsx":"7ecae1defc33","components/data/FleetStatus.jsx":"0243a9b7eacc","components/data/StatTile.jsx":"05d0b199b4d5","components/feedback/Alert.jsx":"8a8b635f301c","components/feedback/BottomSheet.jsx":"565476d4b8d6","components/feedback/Dialog.jsx":"2b61e4f31d10","components/feedback/ProgressSteps.jsx":"d09a2ab25e84","components/feedback/Toast.jsx":"eba4f862f380","components/forms/Checkbox.jsx":"0a611163df85","components/forms/Input.jsx":"6eb8322e2000","components/forms/OptionCard.jsx":"28bdcd5a65fe","components/forms/OtpInput.jsx":"f41921213a09","components/forms/SegmentedControl.jsx":"4c08a328a9f8","components/forms/Switch.jsx":"e3ae98262fc6","components/mobility/BatteryPill.jsx":"0b8d117f30d1","components/mobility/ListRow.jsx":"de2e623fe1b0","components/mobility/LocationHeader.jsx":"56fa953cb035","components/mobility/PassCard.jsx":"86280b27e502","components/mobility/PhotoCapture.jsx":"f82edab8d9a8","components/mobility/ReservationBanner.jsx":"6be67efcd11c","components/mobility/RouteInfoPill.jsx":"7e256e2cd87a","components/mobility/SwipeAction.jsx":"c0bbdf6251f8","components/mobility/VehicleMarker.jsx":"410cf9f2b076","components/mobility/VehicleSummary.jsx":"a5094285e484","components/navigation/SideNav.jsx":"e1acde8f0266","ui_kits/admin/AdminApp.jsx":"6dfc23887022","ui_kits/admin/AdminMap.jsx":"22342cd89b67","ui_kits/admin/AlertsView.jsx":"7f6af63f54ae","ui_kits/admin/CustomersView.jsx":"baf77842f1b8","ui_kits/admin/DocAdminShell.jsx":"c850c0acb77e","ui_kits/admin/FinanceView.jsx":"7725b4dfc914","ui_kits/admin/FleetView.jsx":"2fa0abb58321","ui_kits/admin/LoginView.jsx":"661634700b86","ui_kits/admin/OperationsView.jsx":"880b83490ad6","ui_kits/admin/PricingView.jsx":"ee86a4f4a41e","ui_kits/admin/TeamView.jsx":"5fc30e257730","ui_kits/admin/ZonesView.jsx":"afd5287f81a0","ui_kits/admin/deck-stage.js":"f3d3d0a662c0","ui_kits/admin/doc-page.js":"f52ae9c02fca","ui_kits/app/AccountScreen.jsx":"a2a5985a1ad7","ui_kits/app/ClientApp.jsx":"b0363b652dfa","ui_kits/app/DeckPhone.jsx":"47e316579117","ui_kits/app/HomeScreen.jsx":"292ce1041d3a","ui_kits/app/MapView.jsx":"54d7432dcde2","ui_kits/app/Onboarding.jsx":"b13529d83cbc","ui_kits/app/PickScreen.jsx":"d95ee293951b","ui_kits/app/PlanScreen.jsx":"035ed2260af2","ui_kits/app/ReservedScreen.jsx":"a255c367bedf","ui_kits/app/ReturnScreen.jsx":"1805f782f058","ui_kits/app/RideScreen.jsx":"58cbe5356018","ui_kits/app/ScanScreen.jsx":"8d0392a30065","ui_kits/app/SummaryScreen.jsx":"254f7bf36d36","ui_kits/app/deck-stage.js":"f3d3d0a662c0","ui_kits/app/doc-page.js":"f52ae9c02fca","ui_kits/app/ios-frame.jsx":"24642b887be3","ui_kits/operator/OperatorApp.jsx":"6dc03a6cd5ed","ui_kits/operator/TaskDetail.jsx":"29ce3f81abd8","ui_kits/operator/TaskList.jsx":"d36dff1832fd"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.VoltiDesignSystem_09a717 = window.VoltiDesignSystem_09a717 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Card.jsx
try { (() => {
const V = {
  elevated: {
    bg: 'var(--surface-card)',
    bd: 'transparent',
    sh: 'var(--shadow-1)'
  },
  outline: {
    bg: 'var(--surface-card)',
    bd: 'var(--border-subtle)',
    sh: 'none'
  },
  sunken: {
    bg: 'var(--surface-sunken)',
    bd: 'transparent',
    sh: 'none'
  },
  media: {
    bg: 'var(--surface-media)',
    bd: 'transparent',
    sh: 'none'
  }
};
function Card({
  children,
  variant = 'elevated',
  padding = 16,
  radius = 'var(--radius-lg)',
  onClick,
  style
}) {
  const v = V[variant] || V.elevated;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: v.bg,
      border: '1px solid ' + v.bd,
      boxShadow: v.sh,
      borderRadius: radius,
      padding,
      cursor: onClick ? 'pointer' : undefined,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function toPascal(n) {
  return String(n || '').replace(/(^|[-_ ])(\w)/g, (_, a, b) => b.toUpperCase());
}
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  style
}) {
  const lib = typeof window !== 'undefined' && window.lucide && window.lucide.icons;
  const node = lib && (lib[toPascal(name)] || lib[name]);
  const kids = node ? node[0] === 'svg' ? node[2] : node : [];
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    'aria-hidden': true
  }, kids.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const T = {
  success: ['var(--success-soft)', 'var(--success-ink)'],
  info: ['var(--info-soft)', 'var(--info-ink)'],
  warning: ['var(--warning-soft)', 'var(--warning-ink)'],
  danger: ['var(--danger-soft)', 'var(--danger-ink)'],
  neutral: ['var(--surface-sunken)', 'var(--ink-700)'],
  dark: ['var(--surface-inverse)', 'var(--white)']
};
function Badge({
  children,
  tone = 'success',
  icon,
  size = 'md',
  style
}) {
  const [bg, fg] = T[tone] || T.success;
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: sm ? 20 : 26,
      padding: sm ? '0 6px' : '0 8px',
      borderRadius: 'var(--radius-xs)',
      background: bg,
      color: fg,
      font: 'var(--fw-semibold) ' + (sm ? 11 : 12) + 'px/1 var(--font-sans)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sm ? 12 : 14
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 36,
    px: 16,
    fs: 14,
    ic: 16
  },
  md: {
    h: 48,
    px: 20,
    fs: 15,
    ic: 20
  },
  lg: {
    h: 56,
    px: 24,
    fs: 16,
    ic: 22
  }
};
const VARIANTS = {
  primary: {
    bg: 'var(--brand)',
    fg: 'var(--on-brand)',
    bd: 'transparent',
    sh: 'var(--shadow-brand)',
    rip: 'rgba(255,255,255,.38)'
  },
  secondary: {
    bg: 'var(--surface-card)',
    fg: 'var(--brand)',
    bd: 'var(--brand)',
    sh: 'none',
    rip: 'rgba(52,194,92,.2)'
  },
  ghost: {
    bg: 'transparent',
    fg: 'var(--text-primary)',
    bd: 'transparent',
    sh: 'none',
    rip: 'rgba(21,24,26,.08)'
  },
  dark: {
    bg: 'var(--surface-inverse)',
    fg: 'var(--text-on-inverse)',
    bd: 'transparent',
    sh: 'var(--shadow-2)',
    rip: 'rgba(255,255,255,.22)'
  },
  danger: {
    bg: 'var(--danger)',
    fg: 'var(--white)',
    bd: 'transparent',
    sh: 'var(--shadow-coral)',
    rip: 'rgba(255,255,255,.35)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  loading = false,
  shine = false,
  onClick,
  type = 'button',
  style
}) {
  const [p, setP] = React.useState(false);
  const [h, setH] = React.useState(false);
  const [rip, setRip] = React.useState([]);
  const s = SIZES[size] || SIZES.md,
    v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;
  const down = e => {
    if (off) return;
    setP(true);
    const el = e.currentTarget,
      r = el.getBoundingClientRect(),
      k = r.width / el.offsetWidth || 1;
    const d = Math.max(el.offsetWidth, el.offsetHeight) * 2.2,
      id = Date.now() + Math.random();
    setRip(a => [...a, {
      id,
      d,
      x: (e.clientX - r.left) / k - d / 2,
      y: (e.clientY - r.top) / k - d / 2
    }]);
    setTimeout(() => setRip(a => a.filter(q => q.id !== id)), 650);
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: off,
    onClick: onClick,
    onPointerDown: down,
    onPointerUp: () => setP(false),
    onPointerEnter: () => setH(true),
    onPointerLeave: () => {
      setP(false);
      setH(false);
    },
    style: {
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: s.h,
      padding: '0 ' + s.px + 'px',
      borderRadius: 'var(--radius-pill)',
      border: '1.5px solid ' + v.bd,
      background: v.bg,
      color: v.fg,
      font: 'var(--fw-semibold) ' + s.fs + 'px/1 var(--font-sans)',
      boxShadow: disabled ? 'none' : v.sh,
      cursor: disabled ? 'not-allowed' : loading ? 'progress' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transform: p && !off ? 'scale(var(--press-scale))' : h && !off ? 'translateY(-1px)' : 'none',
      filter: p && !off ? 'brightness(.94)' : h && !off ? 'brightness(1.04)' : 'none',
      transition: 'transform var(--dur-spring) var(--ease-spring), filter var(--dur-fast), opacity var(--dur-base), background var(--dur-base)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rip.map(q => /*#__PURE__*/React.createElement("span", {
    key: q.id,
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: q.x,
      top: q.y,
      width: q.d,
      height: q.d,
      borderRadius: '50%',
      background: v.rip,
      animation: 'vt-ripple 620ms var(--ease-out) forwards',
      pointerEvents: 'none',
      zIndex: -1
    }
  })), shine && !off && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '35%',
      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)',
      animation: 'vt-shine 3.8s var(--ease-in-out) 1.4s infinite',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "LoaderCircle",
    size: s.ic,
    style: {
      animation: 'vt-spin .9s linear infinite'
    }
  }) : icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.ic
  }), children, iconRight && !loading && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.ic
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function Chip({
  children,
  icon,
  selected = false,
  onClick,
  style
}) {
  const [p, setP] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onPointerDown: () => setP(true),
    onPointerUp: () => setP(false),
    onPointerLeave: () => setP(false),
    style: {
      transform: p ? 'scale(.94)' : 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 36,
      padding: '0 14px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid ' + (selected ? 'var(--brand)' : 'var(--border-subtle)'),
      background: selected ? 'var(--brand-soft)' : 'var(--surface-card)',
      color: selected ? 'var(--success-ink)' : 'var(--text-primary)',
      font: 'var(--fw-medium) 13px/1 var(--font-sans)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background var(--dur-base), border-color var(--dur-base), color var(--dur-base), transform var(--dur-spring) var(--ease-spring)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const V = {
  surface: {
    bg: 'var(--surface-card)',
    fg: 'var(--text-primary)',
    sh: 'var(--shadow-1)'
  },
  ghost: {
    bg: 'transparent',
    fg: 'var(--text-primary)',
    sh: 'none'
  },
  soft: {
    bg: 'var(--surface-sunken)',
    fg: 'var(--text-primary)',
    sh: 'none'
  },
  brand: {
    bg: 'var(--brand)',
    fg: 'var(--on-brand)',
    sh: 'var(--shadow-brand)'
  },
  dark: {
    bg: 'var(--surface-inverse)',
    fg: 'var(--white)',
    sh: 'none'
  }
};
function IconButton({
  icon,
  variant = 'surface',
  size = 44,
  dot = false,
  label,
  onClick,
  iconColor,
  style
}) {
  const [p, setP] = React.useState(false);
  const v = V[variant] || V.surface;
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    onClick: onClick,
    onPointerDown: () => setP(true),
    onPointerUp: () => setP(false),
    onPointerLeave: () => setP(false),
    style: {
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      border: 0,
      background: v.bg,
      color: iconColor || v.fg,
      boxShadow: v.sh,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
      transform: p ? 'scale(.88)' : 'none',
      transition: 'transform var(--dur-spring) var(--ease-spring), background var(--dur-base)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.46)
  }), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: size * 0.24,
      right: size * 0.26,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--warning)',
      border: '1.5px solid var(--surface-card)'
    }
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  selectedKey,
  rowKey = 'id',
  dense = false,
  style
}) {
  const pad = dense ? '8px 12px' : '12px 16px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: pad,
      font: 'var(--fw-semibold) 12px/1.3 var(--font-sans)',
      color: 'var(--text-secondary)',
      background: 'var(--ink-50)',
      borderBottom: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
      width: c.width
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => {
    const k = r[rowKey] ?? i,
      sel = k === selectedKey;
    return /*#__PURE__*/React.createElement("tr", {
      key: k,
      onClick: onRowClick ? () => onRowClick(r) : undefined,
      style: {
        cursor: onRowClick ? 'pointer' : 'default',
        background: sel ? 'var(--brand-soft)' : 'transparent'
      }
    }, columns.map(c => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      style: {
        padding: pad,
        textAlign: c.align || 'left',
        borderBottom: i < rows.length - 1 ? '1px solid var(--ink-100)' : 0,
        color: 'var(--text-primary)',
        font: c.mono ? 'var(--fw-medium) 13px/1.3 var(--font-mono)' : undefined,
        whiteSpace: 'nowrap'
      }
    }, c.render ? c.render(r) : r[c.key])));
  }))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/FleetStatus.jsx
try { (() => {
const FLEET_STATUS = {
  free: ['Livre', 'var(--status-free)'],
  rented: ['Alugada', 'var(--status-rented)'],
  reserved: ['Reservada', 'var(--status-reserved)'],
  paused: ['Pausada', 'var(--status-paused)'],
  blocked: ['Bloqueada', 'var(--status-blocked)'],
  maintenance: ['Manutenção', 'var(--status-maintenance)'],
  offline: ['Sem sinal', 'var(--status-offline)']
};
function FleetStatus({
  status = 'free',
  count,
  variant = 'pill',
  selected = false,
  onClick,
  style
}) {
  const [label, c] = FLEET_STATUS[status] || FLEET_STATUS.free;
  const dot = /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: c,
      flexShrink: 0
    }
  });
  if (variant === 'dot') return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-label)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot, label);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 30,
      padding: '0 10px',
      borderRadius: 'var(--radius-pill)',
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      border: '1px solid ' + (selected ? 'var(--ink-900)' : 'var(--border-subtle)'),
      background: selected ? 'var(--ink-900)' : 'var(--surface-card)',
      color: selected ? '#fff' : 'var(--text-primary)',
      font: 'var(--fw-medium) 12px/1 var(--font-sans)',
      ...style
    }
  }, dot, label, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-bold) 12px/1 var(--font-mono)',
      opacity: .7
    }
  }, count));
}
Object.assign(__ds_scope, { FLEET_STATUS, FleetStatus });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/FleetStatus.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
function StatTile({
  label,
  value,
  delta,
  trend = 'up',
  icon,
  style
}) {
  const up = trend === 'up';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      boxShadow: 'var(--shadow-1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }), label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) 26px/1.1 var(--font-sans)',
      letterSpacing: 'var(--ls-tight)',
      color: 'var(--text-primary)'
    }
  }, value), delta && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      font: 'var(--fw-semibold) 12px/1 var(--font-sans)',
      color: up ? 'var(--success-ink)' : 'var(--danger-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: up ? 'TrendingUp' : 'TrendingDown',
    size: 14
  }), delta));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
const T = {
  info: ['var(--info-soft)', 'var(--info-ink)', 'Info'],
  success: ['var(--success-soft)', 'var(--success-ink)', 'CircleCheck'],
  warning: ['var(--warning-soft)', 'var(--warning-ink)', 'TriangleAlert'],
  danger: ['var(--danger-soft)', 'var(--danger-ink)', 'OctagonAlert']
};
function Alert({
  tone = 'info',
  title,
  children,
  icon,
  action,
  onAction,
  solid = false,
  style
}) {
  const [bg, fg, ic] = T[tone] || T.info;
  const solidBg = {
    info: 'var(--info)',
    success: 'var(--brand)',
    warning: 'var(--warning)',
    danger: 'var(--danger)'
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    role: "alert",
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      background: solid ? solidBg : bg,
      color: solid ? '#fff' : fg,
      boxShadow: solid ? 'var(--shadow-2)' : 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || ic,
    size: 20,
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      marginTop: title ? 2 : 0,
      color: solid ? 'rgba(255,255,255,.9)' : 'var(--ink-700)',
      textWrap: 'pretty'
    }
  }, children)), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      border: 0,
      background: 'transparent',
      color: 'inherit',
      font: 'var(--type-label)',
      cursor: 'pointer',
      padding: '2px 4px',
      textDecoration: 'underline'
    }
  }, action));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/BottomSheet.jsx
try { (() => {
function BottomSheet({
  children,
  open = true,
  padding = '12px 20px 28px',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      boxShadow: 'var(--shadow-sheet)',
      padding,
      transform: open ? 'translateY(0)' : 'translateY(105%)',
      transition: 'transform var(--dur-screen) var(--ease-screen)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: 'var(--ink-200)',
      margin: '0 auto 14px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      animation: open ? 'vt-fade-up 420ms var(--ease-out) 120ms both' : 'none'
    }
  }, children));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  children,
  actions,
  onClose,
  icon
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 80,
      background: 'var(--surface-scrim)',
      animation: 'vt-fade-in 200ms var(--ease-out) both',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 340,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl)',
      padding: 24,
      boxShadow: 'var(--shadow-2)',
      animation: 'vt-pop-in 360ms var(--ease-spring) both',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      textAlign: 'center',
      alignItems: 'center'
    }
  }, icon, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)',
      color: 'var(--text-primary)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      textWrap: 'pretty'
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: '100%',
      marginTop: 8
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressSteps.jsx
try { (() => {
function ProgressSteps({
  total = 4,
  current = 0,
  label,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, Array.from({
    length: total
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      background: i <= current ? 'var(--brand)' : 'var(--ink-200)',
      transition: 'background var(--dur-base)'
    }
  }))), label && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, label));
}
Object.assign(__ds_scope, { ProgressSteps });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressSteps.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const I = {
  success: ['CircleCheck', 'var(--green-400)'],
  info: ['Info', 'var(--blue-500)'],
  warning: ['CircleAlert', 'var(--orange-500)'],
  danger: ['CircleAlert', 'var(--coral-400)']
};
function Toast({
  children,
  tone = 'success',
  action,
  onAction,
  style
}) {
  const [ic, c] = I[tone] || I.success;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      padding: '10px 10px 10px 14px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-inverse)',
      color: '#fff',
      boxShadow: 'var(--shadow-2)',
      font: 'var(--type-label)',
      animation: 'vt-toast-in 420ms var(--ease-spring) both',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic,
    size: 20,
    color: c
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      border: 0,
      background: 'transparent',
      color: 'var(--green-300)',
      font: 'var(--type-label)',
      cursor: 'pointer',
      padding: '6px 8px'
    }
  }, action));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false
}) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked ?? inner;
  const toggle = () => {
    if (disabled) return;
    setInner(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'flex-start',
      gap: 10,
      cursor: 'pointer',
      opacity: disabled ? .4 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 7,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: on ? 'var(--brand)' : 'var(--surface-card)',
      border: '1.5px solid ' + (on ? 'var(--brand)' : 'var(--border-strong)'),
      color: '#fff',
      transition: 'all var(--dur-fast)'
    }
  }, on && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "Check",
    size: 14,
    strokeWidth: 3
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-primary)',
      paddingTop: 1
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  value,
  defaultValue,
  placeholder,
  onChange,
  icon,
  hint,
  error,
  type = 'text',
  inputMode,
  style
}) {
  const [f, setF] = React.useState(false);
  const bd = error ? 'var(--danger)' : f ? 'var(--border-focus)' : 'transparent';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 52,
      padding: '0 16px',
      borderRadius: 'var(--radius-md)',
      background: f ? 'var(--surface-card)' : 'var(--surface-sunken)',
      border: '1.5px solid ' + bd,
      transition: 'border-color var(--dur-base), background var(--dur-base)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("input", {
    type: type,
    inputMode: inputMode,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      font: 'var(--type-body)',
      color: 'var(--text-primary)'
    }
  })), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: error ? 'var(--danger-ink)' : 'var(--text-secondary)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/OptionCard.jsx
try { (() => {
function OptionCard({
  title,
  description,
  price,
  priceNote,
  badge,
  icon,
  selected = false,
  disabled = false,
  onClick,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radio",
    "aria-checked": selected,
    onClick: disabled ? undefined : onClick,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      cursor: disabled ? 'default' : 'pointer',
      background: selected ? 'var(--brand-soft)' : 'var(--surface-card)',
      border: '1.5px solid ' + (selected ? 'var(--brand)' : 'var(--border-subtle)'),
      opacity: disabled ? .5 : 1,
      transition: 'background var(--dur-base), border-color var(--dur-base), transform var(--dur-spring) var(--ease-spring)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      flexShrink: 0,
      marginTop: 1,
      border: '1.5px solid ' + (selected ? 'var(--brand)' : 'var(--border-strong)'),
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, selected && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: 'var(--brand)',
      animation: 'vt-check-pop 320ms var(--ease-spring) both'
    }
  })), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 12,
      background: selected ? '#fff' : 'var(--surface-sunken)',
      color: 'var(--ink-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, title), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      height: 20,
      padding: '0 6px',
      borderRadius: 'var(--radius-xs)',
      background: selected ? '#fff' : 'var(--surface-sunken)',
      color: 'var(--ink-700)',
      font: 'var(--fw-semibold) 11px/20px var(--font-sans)'
    }
  }, badge)), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      marginTop: 3,
      textWrap: 'pretty'
    }
  }, description), children), price && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, price), priceNote && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, priceNote)));
}
Object.assign(__ds_scope, { OptionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/OptionCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/OtpInput.jsx
try { (() => {
function OtpInput({
  length = 6,
  value = '',
  onChange,
  error = false,
  style
}) {
  const ref = React.useRef(null);
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => ref.current && ref.current.focus(),
    style: {
      position: 'relative',
      display: 'flex',
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: ref,
    value: value,
    inputMode: "numeric",
    autoComplete: "one-time-code",
    maxLength: length,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    onChange: e => onChange && onChange(e.target.value.replace(/\D/g, '').slice(0, length)),
    style: {
      position: 'absolute',
      opacity: 0,
      inset: 0
    }
  }), Array.from({
    length
  }).map((_, i) => {
    const active = f && i === Math.min(value.length, length - 1);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        height: 56,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--surface-card)' : 'var(--surface-sunken)',
        border: '1.5px solid ' + (error ? 'var(--danger)' : active ? 'var(--border-focus)' : 'transparent'),
        font: 'var(--fw-bold) 22px/1 var(--font-mono)',
        color: 'var(--text-primary)'
      }
    }, value[i] || '');
  }));
}
Object.assign(__ds_scope, { OtpInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/OtpInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  options = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      ...style
    }
  }, options.map(o => {
    const val = typeof o === 'string' ? o : o.value,
      lab = typeof o === 'string' ? o : o.label,
      on = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange && onChange(val),
      style: {
        flex: 1,
        height: 36,
        border: 0,
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        background: on ? 'var(--surface-card)' : 'transparent',
        boxShadow: on ? 'var(--shadow-1)' : 'none',
        color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
        font: 'var(--fw-semibold) 13px/1 var(--font-sans)',
        transition: 'all var(--dur-base) var(--ease-out)'
      }
    }, lab);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label
}) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked ?? inner;
  const toggle = () => {
    if (disabled) return;
    setInner(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      opacity: disabled ? .4 : 1
    }
  }, /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": on,
    "aria-label": label,
    onClick: toggle,
    style: {
      width: 51,
      height: 31,
      borderRadius: 999,
      border: 0,
      padding: 2,
      cursor: 'pointer',
      background: on ? 'var(--brand)' : 'var(--ink-300)',
      transition: 'background var(--dur-base)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 27,
      height: 27,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,.18)',
      transform: on ? 'translateX(20px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-spring)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/mobility/BatteryPill.jsx
try { (() => {
function BatteryPill({
  level = 90,
  range = 20,
  style
}) {
  const c = level > 50 ? 'var(--battery-high)' : level > 20 ? 'var(--battery-mid)' : 'var(--battery-low)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 30,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      padding: '0 12px 0 4px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-inverse)',
      color: '#fff',
      font: 'var(--fw-semibold) 13px/1 var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      border: '1.5px solid ' + c,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: c
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "Zap",
    size: 12,
    strokeWidth: 2.5
  })), level, "%", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 14,
      background: 'rgba(255,255,255,.35)'
    }
  }), "~", range, " km");
}
Object.assign(__ds_scope, { BatteryPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/BatteryPill.jsx", error: String((e && e.message) || e) }); }

// components/mobility/ListRow.jsx
try { (() => {
function ListRow({
  icon,
  iconTone = 'neutral',
  title,
  subtitle,
  value,
  trailing = 'arrow',
  onClick,
  style
}) {
  const tones = {
    neutral: ['var(--surface-sunken)', 'var(--ink-700)'],
    brand: ['var(--green-50)', 'var(--green-700)'],
    info: ['var(--blue-50)', 'var(--blue-600)'],
    sun: ['#FFF3CC', 'var(--orange-600)'],
    danger: ['var(--coral-50)', 'var(--coral-600)']
  };
  const [bg, fg] = tones[iconTone] || tones.neutral;
  const t = trailing === 'arrow' ? 'ArrowRight' : trailing === 'chevron' ? 'ChevronRight' : null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      padding: '10px 14px',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      cursor: onClick ? 'pointer' : undefined,
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 12,
      background: bg,
      color: fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, subtitle)), value && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-secondary)'
    }
  }, value), t && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t,
    size: 20,
    color: "var(--text-primary)"
  }));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/mobility/LocationHeader.jsx
try { (() => {
function LocationHeader({
  initials = 'AL',
  label = 'Sua localização',
  address = 'Av. Paulista, 1578',
  hasNotification = true,
  onAvatar,
  onBell,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onAvatar,
    "aria-label": "Perfil",
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '2px solid #fff',
      background: 'var(--sun-300)',
      color: 'var(--ink-900)',
      font: 'var(--fw-bold) 15px/1 var(--font-sans)',
      boxShadow: 'var(--shadow-1)',
      cursor: 'pointer',
      flexShrink: 0
    }
  }, initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      minWidth: 0,
      maxWidth: '100%',
      padding: '6px 16px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-1)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "Navigation",
    size: 12,
    color: "var(--brand)",
    style: {
      fill: 'var(--brand)'
    }
  }), label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, address))), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "Bell",
    dot: hasNotification,
    label: "Notifica\xE7\xF5es",
    onClick: onBell
  }));
}
Object.assign(__ds_scope, { LocationHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/LocationHeader.jsx", error: String((e && e.message) || e) }); }

// components/mobility/PassCard.jsx
try { (() => {
const TONES = {
  brand: ['var(--green-100)', 'var(--green-700)'],
  sun: ['#FFF3CC', 'var(--orange-600)'],
  sky: ['var(--sky-100)', 'var(--blue-600)'],
  coral: ['var(--coral-50)', 'var(--coral-600)']
};
function PassCard({
  title,
  subtitle,
  icon = 'Ticket',
  tone = 'sun',
  onClick,
  style
}) {
  const [bg, fg] = TONES[tone] || TONES.sun;
  const [p, setP] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onPointerDown: () => setP(true),
    onPointerUp: () => setP(false),
    onPointerLeave: () => setP(false),
    style: {
      transform: p ? 'scale(.96)' : 'none',
      transition: 'transform var(--dur-spring) var(--ease-spring)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 18px 8px 8px',
      borderRadius: 'var(--radius-lg)',
      border: 0,
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-1)',
      textAlign: 'left',
      cursor: 'pointer',
      flexShrink: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 14,
      background: bg,
      color: fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, subtitle)));
}
Object.assign(__ds_scope, { PassCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/PassCard.jsx", error: String((e && e.message) || e) }); }

// components/mobility/PhotoCapture.jsx
try { (() => {
function PhotoCapture({
  label = 'Tirar foto',
  hint,
  done = false,
  icon = 'Camera',
  height = 160,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      width: '100%',
      height,
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      background: done ? 'var(--brand-soft)' : 'var(--surface-sunken)',
      border: '1.5px dashed ' + (done ? 'var(--brand)' : 'var(--border-strong)'),
      color: done ? 'var(--success-ink)' : 'var(--ink-700)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: done ? 'var(--brand)' : '#fff',
      color: done ? '#fff' : 'var(--ink-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: done ? 'Check' : icon,
    size: 22,
    strokeWidth: done ? 3 : 2
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)'
    }
  }, done ? 'Foto enviada' : label), hint && !done && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, hint));
}
Object.assign(__ds_scope, { PhotoCapture });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/PhotoCapture.jsx", error: String((e && e.message) || e) }); }

// components/mobility/RouteInfoPill.jsx
try { (() => {
function RouteInfoPill({
  minutes = 5,
  distance = '310 m',
  style
}) {
  const dot = n => /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: 'var(--green-900)',
      color: 'var(--green-300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: n,
    size: 13,
    strokeWidth: 2.5
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 32,
      padding: '0 12px 0 5px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-inverse)',
      color: '#fff',
      font: 'var(--fw-semibold) 12px/1 var(--font-sans)',
      boxShadow: 'var(--shadow-2)',
      ...style
    }
  }, dot('Clock'), minutes, " min", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6
    }
  }), dot('Route'), distance);
}
Object.assign(__ds_scope, { RouteInfoPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/RouteInfoPill.jsx", error: String((e && e.message) || e) }); }

// components/mobility/SwipeAction.jsx
try { (() => {
function SwipeAction({
  label = 'Deslize para cancelar',
  tone = 'danger',
  onComplete,
  style
}) {
  const track = React.useRef(null);
  const [x, setX] = React.useState(0);
  const [drag, setDrag] = React.useState(null);
  const H = 52,
    K = 40;
  const max = () => track.current ? track.current.offsetWidth - K - 12 : 200;
  const c = tone === 'brand' ? 'var(--brand)' : 'var(--danger)';
  const down = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(e.clientX - x);
  };
  const move = e => {
    if (drag === null) return;
    setX(Math.max(0, Math.min(max(), e.clientX - drag)));
  };
  const up = () => {
    if (drag === null) return;
    setDrag(null);
    if (x > max() * 0.85) {
      setX(max());
      onComplete && onComplete();
      setTimeout(() => setX(0), 400);
    } else setX(0);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: track,
    style: {
      position: 'relative',
      height: H,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      touchAction: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-bold) 16px/1 var(--font-sans)',
      color: 'var(--text-primary)',
      opacity: 1 - x / (max() * 1.2)
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    onPointerDown: down,
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: up,
    style: {
      position: 'absolute',
      left: 6,
      top: 6,
      width: K,
      height: K,
      borderRadius: '50%',
      background: c,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'grab',
      transform: 'translateX(' + x + 'px)',
      transition: drag === null ? 'transform var(--dur-slow) var(--ease-spring)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "ChevronsRight",
    size: 20
  })));
}
Object.assign(__ds_scope, { SwipeAction });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/SwipeAction.jsx", error: String((e && e.message) || e) }); }

// components/mobility/ReservationBanner.jsx
try { (() => {
function ReservationBanner({
  seconds = 383,
  label = 'Tempo de reserva restante',
  swipeLabel = 'Deslize para cancelar',
  onCancel,
  style
}) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0'),
    s = String(seconds % 60).padStart(2, '0');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--danger)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px 6px 6px',
      boxShadow: 'var(--shadow-coral)',
      color: '#fff',
      textAlign: 'center',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      opacity: .92
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) 22px/1.2 var(--font-mono)',
      margin: '2px 0 10px',
      letterSpacing: '.02em'
    }
  }, m, " : ", s, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-semibold) 15px/1 var(--font-sans)'
    }
  }, "min")), /*#__PURE__*/React.createElement(__ds_scope.SwipeAction, {
    label: swipeLabel,
    onComplete: onCancel
  }));
}
Object.assign(__ds_scope, { ReservationBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/ReservationBanner.jsx", error: String((e && e.message) || e) }); }

// components/mobility/VehicleMarker.jsx
try { (() => {
function VehicleMarker({
  level = 80,
  selected = false,
  delay = 0,
  onClick,
  style
}) {
  const c = level > 50 ? 'var(--battery-high)' : level > 20 ? 'var(--battery-mid)' : 'var(--battery-low)';
  const s = selected ? 44 : 34;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": 'Moto, bateria ' + level + '%',
    style: {
      position: 'relative',
      width: s,
      height: s + 6,
      padding: 0,
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      animation: 'vt-marker-in 560ms var(--ease-spring) ' + delay + 'ms both',
      transition: 'width var(--dur-spring) var(--ease-spring), height var(--dur-spring) var(--ease-spring)',
      ...style
    }
  }, selected && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: s,
      height: s,
      borderRadius: '50%',
      background: 'var(--brand)',
      animation: 'vt-pulse-ring 1.8s var(--ease-out) infinite'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: s,
      height: s,
      borderRadius: '50%',
      background: selected ? 'var(--brand)' : 'var(--surface-inverse)',
      color: '#fff',
      border: '2.5px solid #fff',
      boxShadow: selected ? 'var(--shadow-brand)' : 'var(--shadow-1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      transition: 'all var(--dur-spring) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "Bike",
    size: selected ? 22 : 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 16,
      height: 4,
      borderRadius: 2,
      background: c,
      border: '1.5px solid #fff'
    }
  }));
}
Object.assign(__ds_scope, { VehicleMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/VehicleMarker.jsx", error: String((e && e.message) || e) }); }

// components/mobility/VehicleSummary.jsx
try { (() => {
function VehicleSummary({
  category = 'Moto elétrica',
  name = 'Volti Flash',
  level = 90,
  range = 20,
  price = 'R$ 0,79/min + taxa',
  promo = 'Grátis na 1ª corrida',
  image,
  onView3d,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      alignItems: 'stretch',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 132,
      minHeight: 132,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-media)',
      overflow: 'hidden',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--blue-600)',
      textAlign: 'center',
      padding: 12
    }
  }, "foto da moto", /*#__PURE__*/React.createElement("br", null), "(PNG recortado)"), onView3d && /*#__PURE__*/React.createElement("button", {
    onClick: onView3d,
    style: {
      position: 'absolute',
      top: 8,
      left: 8,
      height: 28,
      padding: '0 10px',
      borderRadius: 999,
      border: 0,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      font: 'var(--fw-semibold) 11px/1 var(--font-sans)',
      color: 'var(--text-primary)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "Box",
    size: 13
  }), "Ver em 3D")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      justifyContent: 'center',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-semibold) 13px/1 var(--font-sans)',
      color: 'var(--warning)'
    }
  }, category), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      color: 'var(--text-primary)',
      letterSpacing: 'var(--ls-tight)'
    }
  }, name), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.BatteryPill, {
    level: level,
    range: range
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 4
    }
  }, promo && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "success"
  }, promo), price && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "info"
  }, price))));
}
Object.assign(__ds_scope, { VehicleSummary });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mobility/VehicleSummary.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SideNav.jsx
try { (() => {
function SideNav({
  items = [],
  value,
  onChange,
  footer,
  brand = 'volti',
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: 232,
      flexShrink: 0,
      background: 'var(--ink-900)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      gap: 4,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 24px/1 var(--font-sans)',
      letterSpacing: '-.04em',
      color: 'var(--green-400)',
      padding: '4px 12px 20px'
    }
  }, brand), items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange && onChange(it.value),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 42,
        padding: '0 12px',
        borderRadius: 'var(--radius-sm)',
        border: 0,
        cursor: 'pointer',
        textAlign: 'left',
        background: on ? 'rgba(255,255,255,.08)' : 'transparent',
        color: on ? '#fff' : 'rgba(255,255,255,.62)',
        font: 'var(--fw-semibold) 14px/1 var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 18,
      color: on ? 'var(--green-400)' : 'currentColor'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.label), it.badge != null && /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 20,
        height: 20,
        padding: '0 6px',
        borderRadius: 10,
        background: 'var(--danger)',
        color: '#fff',
        font: 'var(--fw-bold) 11px/20px var(--font-sans)',
        textAlign: 'center'
      }
    }, it.badge));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), footer);
}
Object.assign(__ds_scope, { SideNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SideNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminApp.jsx
try { (() => {
const NAV = [{
  value: 'fleet',
  label: 'Frota ao vivo',
  icon: 'Map'
}, {
  value: 'alerts',
  label: 'Alertas',
  icon: 'Siren',
  badge: 6
}, {
  value: 'zones',
  label: 'Cercas e regras',
  icon: 'Hexagon'
}, {
  value: 'customers',
  label: 'Clientes',
  icon: 'Users'
}, {
  value: 'tasks',
  label: 'Operação',
  icon: 'ClipboardList'
}, {
  value: 'finance',
  label: 'Financeiro',
  icon: 'ChartColumn'
}, {
  value: 'settings',
  label: 'Preços e planos',
  icon: 'SlidersHorizontal'
}, {
  value: 'team',
  label: 'Equipe e acessos',
  icon: 'KeyRound'
}];
function AdminApp() {
  const [auth, setAuth] = React.useState(() => localStorage.getItem('volti-admin-auth') !== '0');
  const [v, setV] = React.useState(() => localStorage.getItem('volti-admin-view') || 'fleet');
  const go = x => {
    setV(x);
    localStorage.setItem('volti-admin-view', x);
  };
  const login = x => {
    setAuth(x);
    localStorage.setItem('volti-admin-auth', x ? '1' : '0');
  };
  if (!auth) return /*#__PURE__*/React.createElement(LoginView, {
    onDone: () => login(true)
  });
  const V = {
    fleet: FleetView,
    alerts: AlertsView,
    zones: ZonesView,
    customers: CustomersView,
    tasks: OperationsView,
    finance: FinanceView,
    settings: PricingView,
    team: TeamView
  }[v] || FleetView;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(VDS.SideNav, {
    items: NAV,
    value: v,
    onChange: go,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        background: 'rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--sun-300)',
        color: 'var(--ink-900)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'var(--fw-bold) 12px/1 var(--font-sans)'
      }
    }, "CM"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-label)'
      }
    }, "Carla M."), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-caption)',
        color: 'rgba(255,255,255,.55)'
      }
    }, "Opera\xE7\xE3o \xB7 2FA")), /*#__PURE__*/React.createElement("button", {
      onClick: () => login(false),
      "aria-label": "Sair",
      style: {
        border: 0,
        background: 'transparent',
        color: 'rgba(255,255,255,.6)',
        cursor: 'pointer',
        padding: 6
      }
    }, /*#__PURE__*/React.createElement(VDS.Icon, {
      name: "LogOut",
      size: 16
    })))
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)',
      flex: 1
    }
  }, NAV.find(n => n.value === v).label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 40,
      padding: '0 14px',
      borderRadius: 999,
      background: 'var(--surface-sunken)',
      width: 280,
      color: 'var(--text-tertiary)',
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(VDS.Icon, {
    name: "Search",
    size: 16
  }), "Buscar moto, cliente ou aluguel"), /*#__PURE__*/React.createElement(VDS.Badge, {
    tone: "success",
    icon: "Wifi"
  }, "108 motos \xB7 2 sem sinal")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(V, null))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminMap.jsx
try { (() => {
function AdminMap({
  children,
  zoom = 15,
  cx = 12137.1,
  cy = 18592.6
}) {
  const ref = React.useRef(null);
  const [sz, setSz] = React.useState({
    w: 900,
    h: 700
  });
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSz({
      w: e.contentRect.width,
      h: e.contentRect.height
    }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const tiles = [],
    px = cx * 256,
    py = cy * 256;
  for (let x = Math.floor(cx - sz.w / 512) - 1; x <= Math.ceil(cx + sz.w / 512); x++) for (let y = Math.floor(cy - sz.h / 512) - 1; y <= Math.ceil(cy + sz.h / 512); y++) tiles.push(/*#__PURE__*/React.createElement("img", {
    key: x + '-' + y,
    src: 'https://tile.openstreetmap.org/' + zoom + '/' + x + '/' + y + '.png',
    width: "256",
    height: "256",
    draggable: "false",
    style: {
      position: 'absolute',
      left: x * 256 - px + sz.w / 2,
      top: y * 256 - py + sz.h / 2,
      filter: 'saturate(.45) brightness(1.06) contrast(.9)'
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: 'var(--map-land)'
    }
  }, tiles, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, children(sz)));
}
const FLEET = [{
  id: 'VT-4821',
  st: 'rented',
  bat: 84,
  spd: 22,
  x: -.12,
  y: -.18,
  last: 'agora',
  sig: '4G forte',
  user: 'Ana Lima'
}, {
  id: 'VT-1077',
  st: 'blocked',
  bat: 52,
  spd: 0,
  x: .18,
  y: .1,
  last: '2 min',
  sig: '4G fraco'
}, {
  id: 'VT-3310',
  st: 'offline',
  bat: 12,
  spd: 0,
  x: -.3,
  y: .22,
  last: '38 min',
  sig: 'sem sinal'
}, {
  id: 'VT-2209',
  st: 'maintenance',
  bat: 70,
  spd: 0,
  x: .3,
  y: -.28,
  last: 'agora',
  sig: '4G forte'
}, {
  id: 'VT-0458',
  st: 'free',
  bat: 91,
  spd: 0,
  x: -.02,
  y: .05,
  last: 'agora',
  sig: '4G forte'
}, {
  id: 'VT-0912',
  st: 'free',
  bat: 66,
  spd: 0,
  x: .08,
  y: -.34,
  last: '1 min',
  sig: '4G forte'
}, {
  id: 'VT-5530',
  st: 'reserved',
  bat: 77,
  spd: 0,
  x: -.22,
  y: -.02,
  last: 'agora',
  sig: '4G forte'
}, {
  id: 'VT-6104',
  st: 'paused',
  bat: 45,
  spd: 0,
  x: .24,
  y: .3,
  last: 'agora',
  sig: '4G forte'
}, {
  id: 'VT-7002',
  st: 'rented',
  bat: 58,
  spd: 18,
  x: .36,
  y: -.06,
  last: 'agora',
  sig: '4G forte'
}, {
  id: 'VT-7190',
  st: 'free',
  bat: 88,
  spd: 0,
  x: -.36,
  y: -.3,
  last: 'agora',
  sig: '4G forte'
}];
function FleetPin({
  v,
  selected,
  onClick
}) {
  const c = VDS.FLEET_STATUS ? VDS.FLEET_STATUS[v.st][1] : 'var(--brand)';
  const s = selected ? 40 : 30;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: v.id,
    style: {
      width: s,
      height: s,
      borderRadius: '50%',
      border: '3px solid #fff',
      background: c,
      color: '#fff',
      boxShadow: selected ? '0 0 0 6px rgba(21,24,26,.15), var(--shadow-2)' : 'var(--shadow-1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      transition: 'all var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(VDS.Icon, {
    name: "Bike",
    size: selected ? 18 : 14
  }));
}
Object.assign(window, {
  AdminMap,
  FLEET,
  FleetPin
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminMap.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AlertsView.jsx
try { (() => {
const ALERTS = [{
  id: 1,
  sev: 'danger',
  ic: 'Activity',
  t: 'Queda detectada',
  moto: 'VT-7002',
  d: 'Cliente não respondeu em 30 s · suporte acionado',
  when: 'agora'
}, {
  id: 2,
  sev: 'danger',
  ic: 'ShieldAlert',
  t: 'Moto em movimento sem aluguel',
  moto: 'VT-1077',
  d: '14 km/h · Av. Rebouças',
  when: '2 min'
}, {
  id: 3,
  sev: 'warning',
  ic: 'WifiOff',
  t: 'Rastreador desconectado',
  moto: 'VT-3310',
  d: 'Último sinal há 38 min',
  when: '38 min'
}, {
  id: 4,
  sev: 'warning',
  ic: 'BatteryWarning',
  t: 'Bateria crítica',
  moto: 'VT-3310',
  d: '12% · tarefa criada para Rafael',
  when: '41 min'
}, {
  id: 5,
  sev: 'info',
  ic: 'Hourglass',
  t: 'Aluguel muito longo',
  moto: 'VT-4821',
  d: '5 h 12 min · plano por minuto',
  when: '1 h'
}, {
  id: 6,
  sev: 'info',
  ic: 'MapPin',
  t: 'Parada fora do ponto',
  moto: 'VT-0912',
  d: 'Há 3 h · R. Haddock Lobo',
  when: '3 h'
}];
function AlertsView() {
  const {
    DataTable,
    Badge,
    Button,
    Icon,
    SegmentedControl,
    Alert
  } = VDS;
  const [f, setF] = React.useState('Abertos');
  const [ack, setAck] = React.useState([]);
  const sevL = {
    danger: 'Crítico',
    warning: 'Atenção',
    info: 'Info'
  };
  const rows = ALERTS.filter(a => f === 'Abertos' ? !ack.includes(a.id) : ack.includes(a.id));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Alertas"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Gerados pelo rastreador e pelas regras de \xE1rea")), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Abertos', 'Resolvidos'],
    value: f,
    onChange: setF,
    style: {
      width: 260
    }
  })), /*#__PURE__*/React.createElement(Alert, {
    tone: "danger",
    title: "2 alertas cr\xEDticos",
    icon: "Siren"
  }, "Queda detectada e moto em movimento sem aluguel exigem a\xE7\xE3o imediata."), /*#__PURE__*/React.createElement(DataTable, {
    rowKey: "id",
    columns: [{
      key: 'sev',
      label: 'Nível',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: r.sev,
        icon: r.ic
      }, sevL[r.sev])
    }, {
      key: 't',
      label: 'Alerta',
      render: r => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600
        }
      }, r.t), /*#__PURE__*/React.createElement("div", {
        style: {
          font: 'var(--type-caption)',
          color: 'var(--text-secondary)',
          whiteSpace: 'normal'
        }
      }, r.d))
    }, {
      key: 'moto',
      label: 'Moto',
      mono: true
    }, {
      key: 'when',
      label: 'Quando',
      align: 'right'
    }, {
      key: 'a',
      label: '',
      align: 'right',
      render: r => f === 'Abertos' ? /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "secondary",
        style: {
          color: 'var(--text-primary)',
          borderColor: 'var(--border-strong)'
        }
      }, "Ver no mapa"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "dark",
        onClick: () => setAck([...ack, r.id])
      }, "Resolver")) : /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: "neutral"
      }, "Resolvido")
    }],
    rows: rows
  }));
}
window.AlertsView = AlertsView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AlertsView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/CustomersView.jsx
try { (() => {
const CUSTOMERS = [{
  id: 'c1',
  name: 'Ana Lima',
  cpf: '123.•••.•••-00',
  ver: 'ok',
  rents: 23,
  bal: 'R$ 38,50',
  st: 'Ativa',
  plan: 'Semanal entregador',
  since: 'mar/2026',
  match: '98%'
}, {
  id: 'c2',
  name: 'Bruno Costa',
  cpf: '456.•••.•••-11',
  ver: 'pending',
  rents: 0,
  bal: 'R$ 0,00',
  st: 'Em análise',
  plan: '—',
  since: 'hoje',
  match: '—'
}, {
  id: 'c3',
  name: 'Carla Souza',
  cpf: '789.•••.•••-22',
  ver: 'ok',
  rents: 7,
  bal: 'R$ 4,00',
  st: 'Ativa',
  plan: 'Por minuto',
  since: 'set/2026',
  match: '95%'
}, {
  id: 'c4',
  name: 'Diego Alves',
  cpf: '321.•••.•••-33',
  ver: 'fail',
  rents: 0,
  bal: 'R$ 0,00',
  st: 'Restrição (fraude)',
  plan: '—',
  since: 'ontem',
  match: '41%'
}, {
  id: 'c5',
  name: 'Eduarda Reis',
  cpf: '654.•••.•••-44',
  ver: 'ok',
  rents: 61,
  bal: 'R$ 112,00',
  st: 'Inadimplente',
  plan: 'Mensal',
  since: 'jan/2026',
  match: '97%'
}];
const VER = {
  ok: ['success', 'Verificada', 'ShieldCheck'],
  pending: ['warning', 'Pendente', 'Hourglass'],
  fail: ['danger', 'Reprovada', 'ShieldAlert']
};
const ST_TONE = {
  'Ativa': 'success',
  'Em análise': 'warning',
  'Restrição (fraude)': 'danger',
  'Inadimplente': 'danger'
};
const TICKETS = [['Contestação', 'Cobrança em dobro · 18/10', 'warning', 'Aberta'], ['Sinistro', 'Queda leve · VT-7002 · BO anexado', 'danger', 'Em análise'], ['Estorno', 'Caução R$ 150 via Pix', 'success', 'Pago'], ['Chat', '"A moto não destrava"', 'info', 'Respondido']];
function CustomersView() {
  const {
    DataTable,
    Badge,
    Button,
    SegmentedControl,
    Input,
    IconButton,
    Card,
    ListRow,
    PhotoCapture,
    Icon
  } = VDS;
  const [f, setF] = React.useState('Todos');
  const [sel, setSel] = React.useState('c1');
  const [tab, setTab] = React.useState('Verificação');
  const rows = CUSTOMERS.filter(c => f === 'Todos' || f === 'Pendentes' && c.ver === 'pending' || f === 'Bloqueados' && ST_TONE[c.st] === 'danger');
  const c = CUSTOMERS.find(x => x.id === sel);
  const kv = (k, v) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--ink-100)',
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, k), /*#__PURE__*/React.createElement("span", null, v));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Clientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Verifica\xE7\xE3o, bloqueio de conta e lista de restri\xE7\xE3o")), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Todos', 'Pendentes', 'Bloqueados'],
    value: f,
    onChange: setF,
    style: {
      width: 340
    }
  })), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Buscar por nome, CPF, e-mail ou telefone",
    icon: "Search"
  }), /*#__PURE__*/React.createElement(DataTable, {
    rowKey: "id",
    selectedKey: sel,
    onRowClick: r => setSel(r.id),
    columns: [{
      key: 'name',
      label: 'Cliente',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--sun-300)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: 'var(--fw-bold) 12px/1 var(--font-sans)'
        }
      }, r.name.split(' ').map(s => s[0]).join('')), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600
        }
      }, r.name))
    }, {
      key: 'cpf',
      label: 'CPF',
      mono: true
    }, {
      key: 'ver',
      label: 'Verificação',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: VER[r.ver][0],
        icon: VER[r.ver][2]
      }, VER[r.ver][1])
    }, {
      key: 'rents',
      label: 'Aluguéis',
      align: 'right'
    }, {
      key: 'bal',
      label: 'Créditos',
      align: 'right'
    }, {
      key: 'st',
      label: 'Conta',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: ST_TONE[r.st]
      }, r.st)
    }],
    rows: rows
  })), c && /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 380,
      flexShrink: 0,
      background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'auto',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--sun-300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--fw-bold) 16px/1 var(--font-sans)'
    }
  }, c.name.split(' ').map(s => s[0]).join('')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Cliente desde ", c.since)), /*#__PURE__*/React.createElement(IconButton, {
    icon: "X",
    variant: "soft",
    size: 32,
    label: "Fechar",
    onClick: () => setSel(null)
  })), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Verificação', 'Atendimento', 'Histórico'],
    value: tab,
    onChange: setTab
  }), tab === 'Verificação' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(PhotoCapture, {
    height: 110,
    label: "Documento",
    icon: "IdCard",
    done: c.ver !== 'pending'
  }), /*#__PURE__*/React.createElement(PhotoCapture, {
    height: 110,
    label: "Selfie",
    icon: "ScanFace",
    done: c.ver !== 'pending'
  })), /*#__PURE__*/React.createElement("div", null, kv('Comparação facial', c.match), kv('Prova de vida', c.ver === 'fail' ? 'Falhou' : c.ver === 'ok' ? 'Aprovada' : 'Aguardando'), kv('Idade', '28 anos (18+)'), kv('Plano', c.plan)), c.ver === 'pending' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    style: {
      flex: 1
    },
    icon: "Check"
  }, "Aprovar"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "danger",
    style: {
      flex: 1
    },
    icon: "X"
  }, "Reprovar"))), tab === 'Atendimento' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, TICKETS.map(([t, d, tone, s]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunken)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, d)), /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    tone: tone
  }, s))), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "MessageCircle"
  }, "Abrir chat")), tab === 'Histórico' && /*#__PURE__*/React.createElement(DataTable, {
    dense: true,
    columns: [{
      key: 'd',
      label: 'Data'
    }, {
      key: 'm',
      label: 'Moto',
      mono: true
    }, {
      key: 't',
      label: 'Tempo',
      align: 'right'
    }, {
      key: 'v',
      label: 'Valor',
      align: 'right'
    }],
    rows: [{
      id: 1,
      d: '21/10',
      m: 'VT-4821',
      t: '12 min',
      v: 'R$ 9,98'
    }, {
      id: 2,
      d: '20/10',
      m: 'VT-0458',
      t: '2 h',
      v: 'R$ 59,80'
    }, {
      id: 3,
      d: '18/10',
      m: 'VT-7190',
      t: '34 min',
      v: 'R$ 28,36'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      paddingTop: 8,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "dark",
    icon: "Ban"
  }, "Bloquear conta"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "ShieldAlert",
    style: {
      color: 'var(--danger-ink)'
    }
  }, "Adicionar \xE0 lista de restri\xE7\xE3o"))));
}
window.CustomersView = CustomersView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/CustomersView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/DocAdminShell.jsx
try { (() => {
const DOC_NAV = [{
  value: 'fleet',
  label: 'Frota ao vivo',
  icon: 'Map'
}, {
  value: 'alerts',
  label: 'Alertas',
  icon: 'Siren',
  badge: 6
}, {
  value: 'zones',
  label: 'Cercas e regras',
  icon: 'Hexagon'
}, {
  value: 'customers',
  label: 'Clientes',
  icon: 'Users'
}, {
  value: 'tasks',
  label: 'Operação',
  icon: 'ClipboardList'
}, {
  value: 'finance',
  label: 'Financeiro',
  icon: 'ChartColumn'
}, {
  value: 'settings',
  label: 'Preços e planos',
  icon: 'SlidersHorizontal'
}, {
  value: 'team',
  label: 'Equipe e acessos',
  icon: 'KeyRound'
}];
function DocAdminShell({
  view
}) {
  if (view === 'login') return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1440,
      height: 900,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 900
    }
  }, /*#__PURE__*/React.createElement(LoginView, {
    onDone: () => {}
  })));
  const V = {
    fleet: FleetView,
    alerts: AlertsView,
    zones: ZonesView,
    customers: CustomersView,
    tasks: OperationsView,
    finance: FinanceView,
    settings: PricingView,
    team: TeamView
  }[view];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1440,
      height: 900,
      display: 'flex',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(VDS.SideNav, {
    items: DOC_NAV,
    value: view,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        background: 'rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--sun-300)',
        color: 'var(--ink-900)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'var(--fw-bold) 12px/1 var(--font-sans)'
      }
    }, "CM"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-label)'
      }
    }, "Carla M."), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-caption)',
        color: 'rgba(255,255,255,.55)'
      }
    }, "Opera\xE7\xE3o \xB7 2FA")))
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)',
      flex: 1
    }
  }, DOC_NAV.find(n => n.value === view).label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 40,
      padding: '0 14px',
      borderRadius: 999,
      background: 'var(--surface-sunken)',
      width: 280,
      color: 'var(--text-tertiary)',
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(VDS.Icon, {
    name: "Search",
    size: 16
  }), "Buscar moto, cliente ou aluguel"), /*#__PURE__*/React.createElement(VDS.Badge, {
    tone: "success",
    icon: "Wifi"
  }, "108 motos \xB7 2 sem sinal")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(V, null))));
}
window.DocAdminShell = DocAdminShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/DocAdminShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/FinanceView.jsx
try { (() => {
function FinanceView() {
  const {
    StatTile,
    DataTable,
    SegmentedControl,
    Badge,
    Card
  } = VDS;
  const [p, setP] = React.useState('7 dias');
  const days = [['Qua', 4.1], ['Qui', 4.6], ['Sex', 5.8], ['Sáb', 7.2], ['Dom', 6.4], ['Seg', 4.9], ['Ter', 5.3]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Financeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Receita, planos, inadimpl\xEAncia e cau\xE7\xF5es")), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Hoje', '7 dias', '30 dias'],
    value: p,
    onChange: setP,
    style: {
      width: 300
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    icon: "Wallet",
    label: "Receita",
    value: "R$ 38,3 mil",
    delta: "+12% vs. per\xEDodo anterior"
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: "Gauge",
    label: "Taxa de ocupa\xE7\xE3o",
    value: "68%",
    delta: "+4,2 p.p."
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: "Bike",
    label: "Receita/moto/dia",
    value: "R$ 74,10",
    delta: "+R$ 3,20"
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: "CircleAlert",
    label: "Inadimpl\xEAncia",
    value: "2,1%",
    delta: "+0,3 p.p.",
    trend: "down"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      marginBottom: 16
    }
  }, "Receita di\xE1ria (R$ mil)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 14,
      height: 180
    }
  }, days.map(([d, v], i) => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-semibold) 11px/1 var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, v.toFixed(1).replace('.', ',')), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: v / 7.2 * 140 + 'px',
      borderRadius: 8,
      background: i === 3 ? 'var(--brand)' : 'var(--green-200)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, d))))), /*#__PURE__*/React.createElement(DataTable, {
    dense: true,
    columns: [{
      key: 'p',
      label: 'Plano'
    }, {
      key: 'n',
      label: 'Aluguéis',
      align: 'right'
    }, {
      key: 'r',
      label: 'Receita',
      align: 'right'
    }],
    rows: [{
      id: 1,
      p: 'Por minuto',
      n: '2.184',
      r: 'R$ 18,9 mil'
    }, {
      id: 2,
      p: 'Por hora',
      n: '312',
      r: 'R$ 5,6 mil'
    }, {
      id: 3,
      p: 'Diária',
      n: '64',
      r: 'R$ 3,1 mil'
    }, {
      id: 4,
      p: 'Semanal (entregador)',
      n: '28',
      r: 'R$ 8,4 mil'
    }, {
      id: 5,
      p: 'Mensal',
      n: '3',
      r: 'R$ 2,3 mil'
    }]
  })), /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'k',
      label: 'Cauções e repasses'
    }, {
      key: 'v',
      label: 'Valor',
      align: 'right'
    }, {
      key: 's',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: r.t
      }, r.s)
    }],
    rows: [{
      id: 1,
      k: 'Cauções retidas (pré-autorização)',
      v: 'R$ 6.300',
      s: 'Em aberto',
      t: 'warning'
    }, {
      id: 2,
      k: 'Repasse à seguradora · outubro',
      v: 'R$ 4.212',
      s: 'Agendado',
      t: 'info'
    }, {
      id: 3,
      k: 'Estornos via Pix',
      v: 'R$ 389',
      s: 'Pago',
      t: 'success'
    }]
  }));
}
window.FinanceView = FinanceView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/FinanceView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/FleetView.jsx
try { (() => {
const AUDIT = [['09:42', 'Carla (operação)', 'Limitou a 20 km/h', 'Zona escolar'], ['09:15', 'Sistema', 'Bloqueio gradual', 'Saiu da área há 5 min'], ['08:58', 'Rafael (campo)', 'Modo serviço', 'Troca de bateria']];
function FleetView() {
  const {
    FleetStatus,
    Button,
    IconButton,
    BatteryPill,
    Card,
    Badge,
    Icon,
    Toast
  } = VDS;
  const [filter, setFilter] = React.useState(null);
  const [sel, setSel] = React.useState('VT-4821');
  const [toast, setToast] = React.useState(null);
  const counts = FLEET.reduce((a, v) => (a[v.st] = (a[v.st] || 0) + 1, a), {});
  const v = FLEET.find(x => x.id === sel);
  const cmd = t => {
    setToast(t);
    setTimeout(() => setToast(null), 2400);
  };
  const kv = (k, val, mono) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--ink-100)',
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono ? 'var(--font-mono)' : undefined
    }
  }, val));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(AdminMap, null, sz => FLEET.filter(f => !filter || f.st === filter).map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    style: {
      position: 'absolute',
      left: sz.w / 2 + f.x * sz.w,
      top: sz.h / 2 + f.y * sz.h,
      transform: 'translate(-50%,-50%)'
    }
  }, /*#__PURE__*/React.createElement(FleetPin, {
    v: f,
    selected: f.id === sel,
    onClick: () => setSel(f.id)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(FleetStatus, {
    status: "free",
    count: counts.free,
    selected: filter === 'free',
    onClick: () => setFilter(filter === 'free' ? null : 'free'),
    style: {
      boxShadow: 'var(--shadow-1)'
    }
  }), ['rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline'].map(s => /*#__PURE__*/React.createElement(FleetStatus, {
    key: s,
    status: s,
    count: counts[s] || 0,
    selected: filter === s,
    onClick: () => setFilter(filter === s ? null : s),
    style: {
      boxShadow: 'var(--shadow-1)'
    }
  }))), toast && /*#__PURE__*/React.createElement(Toast, {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      minWidth: 320
    }
  }, toast)), v && /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 360,
      flexShrink: 0,
      background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'auto',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) 22px/1.1 var(--font-mono)'
    }
  }, v.id), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(FleetStatus, {
    status: v.st,
    variant: "dot"
  }))), /*#__PURE__*/React.createElement(IconButton, {
    icon: "X",
    variant: "soft",
    size: 32,
    label: "Fechar",
    onClick: () => setSel(null)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(BatteryPill, {
    level: v.bat,
    range: Math.round(v.bat / 4.5)
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    icon: "Gauge"
  }, v.spd, " km/h")), /*#__PURE__*/React.createElement("div", null, kv('Último sinal', v.last), kv('GPS / 4G', v.sig), kv('Cliente', v.user || '—'), kv('Posição', '-23.5874, -46.6575', true), kv('Km desde revisão', '412 km')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      marginBottom: 8
    }
  }, "Comandos remotos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "danger",
    icon: "Lock",
    onClick: () => cmd('Bloqueio enviado · reduz potência e trava abaixo de 3 km/h')
  }, "Bloquear"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "LockOpen",
    onClick: () => cmd('Desbloqueio enviado')
  }, "Desbloquear"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "Megaphone",
    style: {
      color: 'var(--text-primary)',
      borderColor: 'var(--border-strong)'
    },
    onClick: () => cmd('Buzina acionada')
  }, "Buzina"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "Gauge",
    style: {
      color: 'var(--text-primary)',
      borderColor: 'var(--border-strong)'
    },
    onClick: () => cmd('Limite de 20 km/h aplicado')
  }, "Limitar vel.")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "dark",
    icon: "ShieldAlert",
    fullWidth: true,
    style: {
      marginTop: 8
    },
    onClick: () => cmd('Modo roubada: bloqueio + posição a cada 5 s')
  }, "Modo roubada"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      marginTop: 8
    }
  }, "Sem sinal, o comando fica pendente e \xE9 aplicado ao reconectar.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "Play",
    style: {
      paddingLeft: 0
    }
  }, "Replay de trajeto"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "History"
  }, "Hist\xF3rico")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      marginBottom: 6
    }
  }, "Log de auditoria"), AUDIT.map(([t, who, what, why]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-medium) 12px/1.4 var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, what), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, who, " \xB7 ", why)))))));
}
window.FleetView = FleetView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/FleetView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/LoginView.jsx
try { (() => {
function LoginView({
  onDone
}) {
  const {
    Input,
    Button,
    OtpInput,
    Alert
  } = VDS;
  const [step, setStep] = React.useState(0);
  const [code, setCode] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '42%',
      background: 'var(--ink-900)',
      color: '#fff',
      padding: 56,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 32px/1 var(--font-sans)',
      letterSpacing: '-.04em',
      color: 'var(--green-400)'
    }
  }, "volti"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 48px/1.05 var(--font-sans)',
      letterSpacing: '-.03em',
      maxWidth: 420
    }
  }, "Painel de opera\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'rgba(255,255,255,.6)',
      marginTop: 12,
      maxWidth: 380
    }
  }, "Frota, clientes e finan\xE7as em tempo real. Acesso restrito \xE0 equipe.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 380,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, step === 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Entrar"), /*#__PURE__*/React.createElement(Input, {
    label: "E-mail",
    defaultValue: "carla@volti.app",
    icon: "Mail"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Senha",
    type: "password",
    defaultValue: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    icon: "Lock"
  }), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    onClick: () => setStep(1)
  }, "Continuar")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Verifica\xE7\xE3o em dois fatores"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)'
    }
  }, "Digite o c\xF3digo do seu app autenticador."), /*#__PURE__*/React.createElement(OtpInput, {
    value: code,
    onChange: setCode
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    icon: "ShieldCheck"
  }, "2FA \xE9 obrigat\xF3rio para todos os perfis."), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    disabled: code.length < 6,
    onClick: onDone
  }, "Entrar no painel"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    onClick: () => {
      setCode('');
      setStep(0);
    }
  }, "Voltar")))));
}
window.LoginView = LoginView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/LoginView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/OperationsView.jsx
try { (() => {
const OPS = [{
  id: 1,
  col: 'Pendente',
  t: 'Trocar bateria',
  moto: 'VT-3310',
  who: null,
  ic: 'BatteryCharging',
  pri: 'Alta'
}, {
  id: 2,
  col: 'Pendente',
  t: 'Recolher moto',
  moto: 'VT-1077',
  who: null,
  ic: 'Truck',
  pri: 'Média'
}, {
  id: 3,
  col: 'Em andamento',
  t: 'Levar para manutenção',
  moto: 'VT-2209',
  who: 'Rafael',
  ic: 'Wrench',
  pri: 'Alta'
}, {
  id: 4,
  col: 'Em andamento',
  t: 'Reposicionar',
  moto: 'VT-0458',
  who: 'Júlia',
  ic: 'MapPinned',
  pri: 'Baixa'
}, {
  id: 5,
  col: 'Concluída',
  t: 'Trocar bateria',
  moto: 'VT-6104',
  who: 'Rafael',
  ic: 'BatteryCharging',
  pri: 'Média'
}];
function OperationsView() {
  const {
    Badge,
    Button,
    Card,
    DataTable,
    Icon,
    SegmentedControl
  } = VDS;
  const [view, setView] = React.useState('Tarefas');
  const cols = ['Pendente', 'Em andamento', 'Concluída'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Tarefas da equipe de campo e manuten\xE7\xE3o preventiva")), /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Tarefas', 'Manutenção'],
    value: view,
    onChange: setView,
    style: {
      width: 280
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "Plus"
  }, "Nova tarefa")), view === 'Tarefas' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 14,
      alignItems: 'start'
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-lg)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)'
    }
  }, c), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-bold) 12px/1 var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, OPS.filter(o => o.col === c).length)), OPS.filter(o => o.col === c).map(o => /*#__PURE__*/React.createElement(Card, {
    key: o.id,
    padding: 14,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 10,
      background: 'var(--surface-sunken)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.ic,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, o.t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 12px/1.3 var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, o.moto))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    tone: o.pri === 'Alta' ? 'danger' : o.pri === 'Média' ? 'warning' : 'neutral'
  }, o.pri), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), o.who ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, o.who) : /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "UserPlus",
    style: {
      height: 28,
      padding: '0 8px'
    }
  }, "Atribuir"))))))) : /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'm',
      label: 'Moto',
      mono: true
    }, {
      key: 'km',
      label: 'Km desde revisão',
      align: 'right'
    }, {
      key: 'h',
      label: 'Horas de uso',
      align: 'right'
    }, {
      key: 'n',
      label: 'Próxima revisão'
    }, {
      key: 's',
      label: 'Situação',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: r.t
      }, r.s)
    }, {
      key: 'a',
      label: '',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "secondary",
        style: {
          color: 'var(--text-primary)',
          borderColor: 'var(--border-strong)'
        }
      }, "Agendar")
    }],
    rows: [{
      id: 1,
      m: 'VT-2209',
      km: '1.012',
      h: '96 h',
      n: 'Atrasada',
      s: 'Vencida',
      t: 'danger'
    }, {
      id: 2,
      m: 'VT-4821',
      km: '412',
      h: '38 h',
      n: 'em 588 km',
      s: 'Em dia',
      t: 'success'
    }, {
      id: 3,
      m: 'VT-7190',
      km: '870',
      h: '81 h',
      n: 'em 130 km',
      s: 'Próxima',
      t: 'warning'
    }, {
      id: 4,
      m: 'VT-0912',
      km: '205',
      h: '19 h',
      n: 'em 795 km',
      s: 'Em dia',
      t: 'success'
    }]
  }));
}
window.OperationsView = OperationsView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/OperationsView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/PricingView.jsx
try { (() => {
function PricingView() {
  const {
    DataTable,
    Badge,
    Button,
    Input,
    Switch,
    Card,
    Toast
  } = VDS;
  const [saved, setSaved] = React.useState(false);
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };
  const field = (v, w = 110) => /*#__PURE__*/React.createElement("input", {
    defaultValue: v,
    style: {
      width: w,
      height: 34,
      padding: '0 10px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--ink-50)',
      font: 'var(--fw-medium) 13px/1 var(--font-mono)',
      textAlign: 'right',
      color: 'var(--text-primary)'
    }
  });
  const sec = (t, d, c) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, d)), c);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 26,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Pre\xE7os e planos"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Altera\xE7\xF5es valem para novos alugu\xE9is")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost"
  }, "Descartar"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "Check",
    onClick: save
  }, "Salvar altera\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
      gap: 24,
      alignItems: 'start'
    }
  }, sec('Planos', 'Preço por período', /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'p',
      label: 'Plano'
    }, {
      key: 'v',
      label: 'Preço',
      align: 'right',
      render: r => field(r.v)
    }, {
      key: 'u',
      label: 'Unidade'
    }, {
      key: 'on',
      label: 'Ativo',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Switch, {
        defaultChecked: r.on
      })
    }],
    rows: [{
      id: 1,
      p: 'Por minuto',
      v: '0,79',
      u: '/min',
      on: true
    }, {
      id: 2,
      p: 'Por hora',
      v: '29,90',
      u: '/hora',
      on: true
    }, {
      id: 3,
      p: 'Diária',
      v: '79,90',
      u: '/dia',
      on: true
    }, {
      id: 4,
      p: 'Semanal (entregador)',
      v: '299,00',
      u: '/semana',
      on: true
    }, {
      id: 5,
      p: 'Mensal',
      v: '990,00',
      u: '/mês',
      on: false
    }]
  })), sec('Taxas', 'Cobranças fixas', /*#__PURE__*/React.createElement(Card, {
    padding: 6
  }, [['Desbloqueio', '1,00'], ['Pausa', '0,20 /min'], ['Reserva (após 10 min)', '0,30 /min'], ['Devolução fora do ponto', '15,00'], ['Caução (pré-autorização)', '150,00']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 12px',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, k), field(v, 120))))), sec('Seguros', 'Repasse à seguradora', /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 's',
      label: 'Seguro'
    }, {
      key: 'c',
      label: 'Cobertura'
    }, {
      key: 'v',
      label: 'Preço',
      align: 'right',
      render: r => field(r.v, 90)
    }, {
      key: 'o',
      label: '',
      render: r => r.o ? /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: "neutral"
      }, "Obrigat\xF3rio") : null
    }],
    rows: [{
      id: 1,
      s: 'Básico',
      c: 'Terceiros + acidentes pessoais',
      v: '1,50',
      o: true
    }, {
      id: 2,
      s: 'Completo',
      c: '+ danos à moto, furto, franquia zero',
      v: '4,90'
    }]
  })), sec('Cupons e indicação', 'Campanhas ativas', /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'c',
      label: 'Código',
      mono: true
    }, {
      key: 'd',
      label: 'Desconto'
    }, {
      key: 'u',
      label: 'Usos',
      align: 'right'
    }, {
      key: 'on',
      label: 'Ativo',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Switch, {
        defaultChecked: r.on
      })
    }],
    rows: [{
      id: 1,
      c: 'PRIMEIRA',
      d: '15 min grátis',
      u: '1.204',
      on: true
    }, {
      id: 2,
      c: 'INDICA10',
      d: 'R$ 10 cada',
      u: '388',
      on: true
    }, {
      id: 3,
      c: 'PASSE10',
      d: '10% no semanal',
      u: '52',
      on: false
    }]
  }))), saved && /*#__PURE__*/React.createElement(Toast, {
    style: {
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      minWidth: 300
    }
  }, "Pre\xE7os salvos \xB7 log de auditoria atualizado"));
}
window.PricingView = PricingView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/PricingView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/TeamView.jsx
try { (() => {
function TeamView() {
  const {
    DataTable,
    Badge,
    Button
  } = VDS;
  const R = {
    'Administrador': 'dark',
    'Operação': 'success',
    'Financeiro': 'info',
    'Suporte': 'warning'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Equipe e acessos"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Cada perfil v\xEA s\xF3 o que precisa \xB7 2FA obrigat\xF3rio")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "UserPlus"
  }, "Convidar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: 12
    }
  }, [['Administrador', 'Tudo, incluindo acessos'], ['Operação', 'Frota, cercas, alertas, tarefas'], ['Financeiro', 'Receita, preços, estornos'], ['Suporte', 'Clientes, chat, sinistros']].map(([r, d]) => /*#__PURE__*/React.createElement("div", {
    key: r,
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    tone: R[r]
  }, r), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      marginTop: 10
    }
  }, d)))), /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 'n',
      label: 'Pessoa'
    }, {
      key: 'e',
      label: 'E-mail'
    }, {
      key: 'r',
      label: 'Perfil',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: R[r.r]
      }, r.r)
    }, {
      key: 'f',
      label: '2FA',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        size: "sm",
        tone: "success",
        icon: "ShieldCheck"
      }, "Ativo")
    }, {
      key: 'l',
      label: 'Último acesso',
      align: 'right'
    }],
    rows: [{
      id: 1,
      n: 'Vinicius R.',
      e: 'vinicius@volti.app',
      r: 'Administrador',
      l: 'agora'
    }, {
      id: 2,
      n: 'Carla M.',
      e: 'carla@volti.app',
      r: 'Operação',
      l: 'agora'
    }, {
      id: 3,
      n: 'Paulo S.',
      e: 'paulo@volti.app',
      r: 'Financeiro',
      l: 'ontem'
    }, {
      id: 4,
      n: 'Marina T.',
      e: 'marina@volti.app',
      r: 'Suporte',
      l: '12 min'
    }]
  }));
}
window.TeamView = TeamView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/TeamView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ZonesView.jsx
try { (() => {
function ZonesView() {
  const {
    Card,
    Switch,
    Badge,
    Button,
    ListRow
  } = VDS;
  const Z = [['Área de operação', 'var(--ink-900)', 'dashed', -.42, -.4, .84, .8], ['Ponto · Pç. Oswaldo Cruz', 'var(--brand)', 'solid', -.08, -.08, .12, .1], ['Ponto · Av. Paulista', 'var(--brand)', 'solid', .16, -.3, .1, .1], ['Zona proibida · Parque', 'var(--coral-500)', 'solid', -.34, .12, .18, .16], ['Velocidade reduzida · Escola', 'var(--orange-500)', 'solid', .12, .14, .16, .12]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(AdminMap, null, sz => Z.map(([n, c, b, x, y, w, h]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    title: n,
    style: {
      position: 'absolute',
      left: sz.w / 2 + x * sz.w,
      top: sz.h / 2 + y * sz.h,
      width: w * sz.w,
      height: h * sz.h,
      border: '2.5px ' + b + ' ' + c,
      borderRadius: 18,
      background: b === 'dashed' ? 'transparent' : 'color-mix(in oklch, ' + c + ' 18%, transparent)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 16,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "dark",
    icon: "PenTool"
  }, "Desenhar \xE1rea"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "Layers",
    style: {
      background: '#fff'
    }
  }, "Camadas"))), /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 360,
      flexShrink: 0,
      background: 'var(--surface-card)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'auto',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, "Cercas e regras"), /*#__PURE__*/React.createElement(Card, {
    variant: "sunken",
    padding: 4
  }, Z.map(([n, c]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 4,
      background: c
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: 'var(--type-label)',
      fontWeight: 500
    }
  }, n), /*#__PURE__*/React.createElement(VDS.Icon, {
    name: "ChevronRight",
    size: 16,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      marginTop: 6
    }
  }, "Regras autom\xE1ticas"), [['Saiu da área', 'Alerta → após 5 min reduz e bloqueia', true], ['Entrou em calçada/ciclovia', 'Limite 20 km/h', true], ['Zona proibida', 'Não permite encerrar aluguel', true], ['Fora do ponto de devolução', 'Taxa de R$ 15,00', false]].map(([t, d, on]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, d)), /*#__PURE__*/React.createElement(Switch, {
    defaultChecked: on
  })))));
}
window.ZonesView = ZonesView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ZonesView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/deck-stage.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* ═══ THIS PROJECT USES DESIGN COMPONENTS (.dc.html) ═══
 * Reference this stage from your <x-dc> template as an import — NEVER as a
 * raw <deck-stage> tag plus a <script src> (that hides the whole deck until
 * the stream finishes):
 *
 *   <x-import component-from-global-scope="deck-stage" from="./deck-stage.js"
 *             width="1920" height="1080" hint-size="100%,100%">
 *     <section data-label="Title" style="...">…</section>
 *     <section data-label="Agenda" style="...">…</section>
 *   </x-import>
 *
 * Slides are inline-styled <section> siblings; do not add a stylesheet or a
 * deck-stage:not(:defined) rule. The plain-HTML "Usage" block in the comment
 * below does NOT apply to .dc.html templates.
 */
/* BEGIN USAGE */
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→ and ↑/↓, PgUp/PgDn, Space, Home/End,
 *      number keys.
 *      On touch devices, tapping the left/right half of the stage goes
 *      prev/next — taps on links, buttons and other interactive slide
 *      content are left alone.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on
 *      idle; hovering or focusing its controls pins it visible until the
 *      pointer/focus leaves. While presenting it is pointer-summoned only:
 *      mouse movement (or hover/focus) shows it, slide changes never do.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate — the clicked slide becomes the
 *      selected (highlighted) slide; shift-click selects a range and
 *      cmd/ctrl-click toggles slides in and out of the selection
 *      (Escape collapses it back to the current slide); ↑/↓ with a
 *      thumbnail focused to step between slides; Delete/Backspace with a
 *      thumbnail focused to delete the selection (one confirm dialog,
 *      one undoable operation); drag to reorder (dragging collapses a
 *      multi-selection); right-click for
 *      Skip / Move up / Move down / Duplicate / Delete — over a
 *      multi-selection the menu offers "Delete N slides". Drag the rail's right edge to resize;
 *      width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      They also carry no rail number and are excluded from the overlay's
 *      slide count: the remaining slides are numbered contiguously
 *      (Keynote-style), and a skipped CURRENT slide (reachable by rail
 *      click or deep link, never by prev/next) shows '–' as its position.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, on narrow viewports
 *      (≤640px), and via the `no-rail` attribute. Rail mutations dispatch
 *      a `dc-op` CustomEvent on the element (see docs/dc-ops.md) and do
 *      NOT touch the DOM: the host applies the op and re-renders;
 *      structural rail input is locked until the host posts
 *      {__dc_op_ack: true, applied}.
 *  (h) typographic defaults — a zero-specificity stylesheet injected into
 *      the document gives headings `text-wrap: balance` and body text
 *      (p, li, blockquote, figcaption) `text-wrap: pretty`, so slides
 *      avoid widowed/orphaned words by default. Any text-wrap declaration
 *      you author on those elements wins over these defaults.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 *
 * Speaker notes stay in sync because the component posts {slideIndexChanged: N}
 * to the parent — just include the #speaker-notes script tag if asked for notes.
 *
 * Authoring guidance:
 *   - Write slide bodies as static HTML inside <deck-stage>, with sizing via
 *     CSS custom properties in a <style> block rather than JS constants.
 *     Static slide markup is what lets the user click a heading in edit mode
 *     and retype it directly; a slide rendered through <script type="text/babel">,
 *     React, or a loop over a JS array has to round-trip every tweak through a
 *     chat message instead. Reach for script-generated slides only when the
 *     content genuinely needs interactive behaviour static HTML can't express.
 *   - Do NOT set position/inset/width/height on the slide <section> elements —
 *     the component absolutely positions every slotted child for you.
 *   - Entrance animations: make the visible end-state the base style and
 *     animate *from* hidden, so print and reduced-motion show content.
 *     Gate the animation on [data-deck-active] and the motion query, e.g.
 *     `@media (prefers-reduced-motion:no-preference){ [data-deck-active] .x{animation:fade-in .5s both} }`.
 *     Avoid infinite decorative loops on slide content.
 */
/* END USAGE */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const FINE_POINTER_MQ = matchMedia('(hover: hover) and (pointer: fine)');
  const NARROW_MQ = matchMedia('(max-width: 640px)');
  // Slide-authored controls that should keep a tap instead of it navigating.
  const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, label, video[controls], audio[controls], [role="button"], [onclick], [tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
      /* Slide edge on the black stage. Dark decks override the canvas
       * fill toward the stage's own black, leaving nothing to mark where
       * the slide ends — the faint white ring keeps the boundary legible
       * there while disappearing into the white of light decks. A
       * box-shadow, not outline/border: it follows any canvas rounding
       * and adds no layout size. */
      box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.12);
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    @media (max-width: 640px) {
      .rail, .rail-resize { display: none; }
    }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-selected] .num { color: #fff; }
    .thumb[data-selected] .frame {
      outline-color: rgba(217,119,87,0.65);
      box-shadow: 0 0 0 4px rgba(217,119,87,0.18);
    }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame {
      outline-color: #D97757;
      box-shadow: 0 0 0 4px rgba(217,119,87,0.25);
    }
    /* While dragging, the thumb itself is the drag visual (the native drag
       image is suppressed in dragstart so the snapshot can't wander off the
       rail horizontally): elevate it rather than dim it, and let hit-testing
       ignore it so dragover reaches the sibling thumb under the pointer
       instead of the moving element itself. */
    .thumb[data-dragging] { opacity: 0.9; z-index: 30; pointer-events: none; }
    .thumb[data-dragging] .frame {
      outline-color: rgba(255,255,255,0.5);
      box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that _syncPrintPageRule appends
       to the document (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        /* Size containment: slotted content that overflows the design box
         * (an image-slot's aspect-ratio-derived width, say) must not count
         * toward Chromium's print document width — without this, an
         * abs-positioned child past the page edge shrinks the whole PDF
         * to fit (~75%). Containment is safe here because the definite
         * width/height above size the slide regardless of content.
         * (Absorbed from PR #2619 with its owner's agreement.) */
        contain: size !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      // Explicit multi-selection (slide elements). Empty means the
      // selection is implicitly the current slide, so Delete always has
      // a well-defined target while the rail has focus.
      this._selected = new Set();
      this._selAnchor = null;
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      // Overlay pinning: while the pointer is over the controls toolbar or
      // a control has keyboard focus, the idle-hide timeout must not
      // dismiss it (a pointer parked ON the controls doesn't generate
      // mousemove, so without the pin the toolbar vanishes under the
      // user's cursor after OVERLAY_HIDE_MS). Read by _flashOverlay's
      // hide timeout; cleared by mouseleave/focusout, which resume the
      // normal idle fade.
      this._overlayHover = false;
      this._overlayFocus = false;
      // Capability marker for the host's injected guest bundle. Copies
      // WITHOUT _navArrowsUpDown are frozen per-project builds that
      // predate native ArrowUp/ArrowDown slide nav — the bundle translates
      // Up/Down to Right/Left for those (installDeckArrowKeyTranslator in
      // apps/web/src/guest/edit-mode.ts) and must stand down here or every
      // press would advance twice. A marker, not a version number, so a
      // future capability can add its own independent probe.
      this._navArrowsUpDown = true;
      // Same contract for rail Delete/Backspace: copies WITHOUT
      // _railDeleteKey predate the thumbs' own Delete/Backspace binding,
      // and the bundle opens the delete confirm for them
      // (installDeckRailDeleteFallback in apps/web/src/guest/edit-mode.ts).
      // Current builds consume the key at the thumb (stopPropagation), so
      // the marker is belt-and-braces — it keeps the fallback standing
      // down even if a future build lets the key bubble past the thumb.
      this._railDeleteKey = true;
      // Same contract for skip-aware numbering: copies WITHOUT
      // _railSkipNumbers number every thumb 1..N and count skipped slides
      // in the overlay total — the bundle rewrites both for those
      // (installDeckSkipNumberingFallback in apps/web/src/guest/edit-mode.ts).
      // Here the component renumbers natively, so the fallback stands down.
      this._railSkipNumbers = true;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTap = this._onTap.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      this._ensurePrintSizingMeta();
      this._ensureTextWrapDefaults();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      this.addEventListener('click', this._onTap);
      // Print lays every slide out as its own page, so [data-deck-active]-
      // gated entrance styles need the attribute on every slide (not just
      // the current one) or their content prints at the hidden base style.
      // The transient freeze style lands BEFORE the attributes so any
      // attribute-keyed transition fires at 0s (changing transition-
      // duration after a transition has started doesn't affect it).
      this._onBeforePrint = () => {
        this._syncPrintPageRule();
        // Self-heal: a departed doc-page may have removed the page-global
        // print-sizing meta this deck deferred to at connect time.
        this._ensurePrintSizingMeta();
        if (this._freezeStyle) this._freezeStyle.remove();
        this._freezeStyle = document.createElement('style');
        this._freezeStyle.textContent = '*,*::before,*::after{transition-duration:0s !important}';
        document.head.appendChild(this._freezeStyle);
        this._slides.forEach(s => s.setAttribute('data-deck-active', ''));
      };
      this._onAfterPrint = () => {
        this._applyIndex({
          showOverlay: false,
          broadcast: false
        });
        if (this._freezeStyle) {
          this._freezeStyle.remove();
          this._freezeStyle = null;
        }
      };
      window.addEventListener('beforeprint', this._onBeforePrint);
      window.addEventListener('afterprint', this._onAfterPrint);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // Unconditional cap — rAF can be suspended in a hidden iframe, which
      // would strand the one inside the rAF callback.
      setTimeout(reveal, 2000);
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (three per view — cur/prev/next).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav doesn't trigger spurious
      // refreshes — except data-deck-skip, which now arrives from the host
      // re-render and is what updates the rail badge, print bookkeeping,
      // and deckSkipped re-broadcast. Also ignore data-dc-tpl /
      // data-om-slide-id — host-reserved bookkeeping stamps (the host's
      // ATTR_RESERVED guard bounds them the same way) that structural
      // edits renumber/re-mint on slides whose content didn't change;
      // re-cloning on that churn is what made a slide move flash its
      // thumbnails.
      const OWN_ATTRS = /^data-(deck-(?!skip$)|screen-label$|om-(validate|slide-id)$|dc-tpl$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          // Skip/unskip is handled below without re-cloning (the badge sits
          // on the thumb wrapper, not the clone) — don't mark the slide
          // dirty for an attr change whose only visible effect is the badge.
          if (n && this._slideSet && this._slideSet.has(n) && !(r.type === 'attributes' && r.attributeName === 'data-deck-skip')) {
            this._liveDirty.add(n);
          }
          // Host-driven skip toggle: sync the rail badge + print + presenter
          // skipped-list the way _toggleSkip used to do locally.
          if (r.type === 'attributes' && r.attributeName === 'data-deck-skip' && n && this._slideSet && this._slideSet.has(n)) {
            const i = this._slides.indexOf(n);
            if (this._thumbs && this._thumbs[i]) {
              if (n.hasAttribute('data-deck-skip')) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
            }
            this._markLastVisible();
            this._renumberRail();
            this._syncCount();
            try {
              window.postMessage({
                slideIndexChanged: this._index,
                deckTotal: this._slides.length,
                deckSkipped: this._skippedIndices()
              }, '*');
            } catch (e) {}
          }
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      // Stylesheets that finish loading AFTER the snapshot below never
      // reach the thumbs on their own: a still-pending <link> contributes
      // nothing to document.styleSheets, and nothing re-reads it on load,
      // so the live slides restyle while every clone keeps the stale
      // sheet. dc-runtime's helmet mounts design-system <link>s at render
      // time, so a deck-stage that connects first snapshots before that
      // CSS exists. Funnel late arrivals into the same debounced resync:
      // hook load/error on every current <link>, and watch <head> for
      // links and styles mounted or rewritten later. Deliberately not
      // rAF- or fonts.ready-driven — rAF is throttled/suspended in hidden
      // iframes (thumbnail/presenter contexts), and a font-file load
      // doesn't change cssRules, so it needs no resync.
      this._hookedLinks = [];
      this._hookSheetLoad = el => {
        if (!el.matches || !el.matches('link[rel~="stylesheet" i]')) return;
        if (this._hookedLinks.indexOf(el) !== -1) return;
        this._hookedLinks.push(el);
        el.addEventListener('load', this._onTweakChange);
        el.addEventListener('error', this._onTweakChange);
      };
      document.querySelectorAll('link[rel~="stylesheet" i]').forEach(this._hookSheetLoad);
      this._headObserver = new MutationObserver(records => {
        let resync = false;
        for (const r of records) {
          if (r.type === 'characterData') {
            // Only <style> text is CSS — a ticking <title> shouldn't
            // wake the resync forever.
            const p = r.target.parentNode;
            if (p && p.nodeName === 'STYLE') resync = true;
            continue;
          }
          if (r.type === 'attributes') {
            // A late rel/href rewrite turns an inert <link> into a
            // stylesheet (hook it; its load fires even on cache hits);
            // a media/disabled flip changes effective rules with no
            // event. Resync only if this link is or ever was a
            // stylesheet — favicon/preload/canonical href churn isn't
            // a resync.
            if (r.target.nodeName === 'LINK') {
              this._hookSheetLoad(r.target);
              if (this._hookedLinks.indexOf(r.target) !== -1) resync = true;
            } else if (r.target.nodeName === 'STYLE') resync = true;
            continue;
          }
          // childList: only links and styles carry CSS. A new <link> has
          // no rules until it loads — hook it rather than resync now; a
          // <style> mount/unmount or text-node swap takes effect
          // immediately. _freezeStyle (our beforeprint helper) is skipped
          // on add only — no removal-side guard: _onAfterPrint nulls the
          // ref before the observer fires, so that check would be dead;
          // the one debounced no-op resync per print is harmless.
          if (r.target.nodeName === 'STYLE') resync = true;
          for (const n of r.addedNodes) {
            if (n.nodeName === 'LINK') this._hookSheetLoad(n);else if (n.nodeName === 'STYLE' && n !== this._freezeStyle) resync = true;
          }
          for (const n of r.removedNodes) {
            if (n.nodeName === 'LINK') {
              const hi = this._hookedLinks.indexOf(n);
              if (hi !== -1) {
                this._hookedLinks.splice(hi, 1);
                n.removeEventListener('load', this._onTweakChange);
                n.removeEventListener('error', this._onTweakChange);
                resync = true;
              }
            } else if (n.nodeName === 'STYLE') resync = true;
          }
        }
        if (resync) this._onTweakChange();
      });
      this._headObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['rel', 'href', 'media', 'disabled']
      });
      this._snapshotAuthorCss();
      // Re-snapshot once any still-loading stylesheet settles — it throws on
      // .cssRules above and silently contributes '' → unstyled thumbs on a
      // cold mount. {once:true}; routed through the debounced handler.
      document.querySelectorAll('link[rel~="stylesheet"]').forEach(l => {
        try {
          if (l.sheet && l.sheet.cssRules) return;
        } catch (e) {}
        l.addEventListener('load', this._onTweakChange, {
          once: true
        });
        l.addEventListener('error', this._onTweakChange, {
          once: true
        });
      });
      if (document.fonts) document.fonts.ready.then(this._onTweakChange, this._onTweakChange);
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      // A disconnect mid-drag never gets a dragend, so the document-level
      // drag tracker must be torn down here like every other global hook.
      this._stopDragTrack();
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      window.removeEventListener('beforeprint', this._onBeforePrint);
      window.removeEventListener('afterprint', this._onAfterPrint);
      if (this._freezeStyle) {
        this._freezeStyle.remove();
        this._freezeStyle = null;
      }
      this.removeEventListener('click', this._onTap);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._headObserver) this._headObserver.disconnect();
      (this._hookedLinks || []).forEach(l => {
        l.removeEventListener('load', this._onTweakChange);
        l.removeEventListener('error', this._onTweakChange);
      });
      this._hookedLinks = [];
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
      // Drop the text-wrap defaults when the last deck-stage leaves, so a
      // deleted deck's typography can't restyle whatever replaces it.
      // (#deck-stage-print-page keeps its existing keep-forever lifecycle.)
      if (!document.querySelector('deck-stage')) {
        const tw = document.getElementById('deck-stage-text-wrap');
        if (tw) tw.remove();
        const ps = document.getElementById('deck-stage-print-sizing');
        if (ps) ps.remove();
      }
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-omelette-chrome', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Pin the controls while the user is interacting with them —
      // hovering, or keyboard focus on a control. The hidden overlay is
      // pointer-events:none, so these only ever engage while it's already
      // visible. 'pointer' source: these are user-interaction paths, so
      // they may show/refresh the overlay even while presenting (see
      // _flashOverlay).
      overlay.addEventListener('mouseenter', () => {
        this._overlayHover = true;
        this._flashOverlay('pointer');
      });
      overlay.addEventListener('mouseleave', () => {
        const hadPin = this._overlayHover;
        this._overlayHover = false;
        // Resume the idle fade — never summon. Without the guard, a
        // mouseleave that fires because the overlay was force-hidden
        // (presenting entry flips it to pointer-events:none under the
        // cursor) would pop the controls right back up.
        if (hadPin || overlay.hasAttribute('data-visible')) this._flashOverlay('pointer');
      });
      overlay.addEventListener('focusin', e => {
        // Keyboard-origin focus only (:focus-visible): a mouse click also
        // focuses the clicked button, and pinning on that would hold the
        // controls open indefinitely after a single click — the hover pin
        // already covers the mouse case. Engines without :focus-visible
        // fall back to pinning on any focus (the safe direction).
        var kb = true;
        try {
          var t = e.target;
          kb = !(t && t.matches && !t.matches(':focus-visible'));
        } catch (err) {
          kb = true;
        }
        if (!kb) return;
        this._overlayFocus = true;
        this._flashOverlay('pointer');
      });
      overlay.addEventListener('focusout', e => {
        // Only unpin when focus truly left the toolbar — tabbing between
        // its buttons stays pinned. relatedTarget is null when focus
        // leaves the document entirely; treat that as leaving.
        if (e.relatedTarget && overlay.contains(e.relatedTarget)) return;
        const hadPin = this._overlayFocus;
        this._overlayFocus = false;
        // Resume-the-fade only (see mouseleave): a click-focused button
        // losing focus to a later stage click must not summon the
        // controls mid-presentation.
        if (hadPin || overlay.hasAttribute('data-visible')) this._flashOverlay('pointer');
      });

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-omelette-chrome', '');
      // Edit mode hooks wheel to pan the canvas; this opts the rail's own
      // scrollview out so thumbnails stay scrollable while editing.
      rail.setAttribute('data-dc-wheel-passthru', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-omelette-chrome', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <button type="button" data-act="duplicate">Duplicate slide</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        const list = this._menuIndices;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'duplicate') this._duplicateSlide(i);else if (act === 'delete') this._openConfirm(list && list.length ? list : [i]);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-omelette-chrome', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-omelette-chrome', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) {
          this._closeConfirm();
          this._focusCurrentThumb();
        }
      });
      confirm.querySelector('.cancel').addEventListener('click', () => {
        this._closeConfirm();
        this._focusCurrentThumb();
      });
      confirm.querySelector('.danger').addEventListener('click', () => {
        // Re-resolve at click time — the elements are the user's actual
        // selection; their indices may have shifted since confirm-open.
        const list = (this._confirmEls || []).map(el => this._slides.indexOf(el)).filter(i => i >= 0);
        this._closeConfirm();
        this._deleteSlides(list);
        this._focusCurrentThumb();
      });
      this._root.append(style, rail, resize, stage, overlay, menu, confirm);
      this._canvas = canvas;
      this._stage = stage;
      this._slot = slot;
      this._overlay = overlay;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. (Re-)append so any author @page landing later in
     *  source order can't reintroduce a margin and push each slide onto
     *  two sheets; called again from beforeprint. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      (document.body || document.head).appendChild(tag);
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' +
      // Jump authored animations/transitions to their end state so print
      // never captures mid-entrance — pairs with the beforeprint handler
      // in connectedCallback that sets data-deck-active on every slide.
      '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Announces the deck's print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] content "default-landscape" — a
     *  deck prints one slide per page on the user's paper size, landscape.
     *  The export path probes the meta to decide what true paper size to
     *  inject at print time (the @page px rule above stays as the
     *  standalone-print fallback; an injected later rule overrides it).
     *  Never overrides an authored meta or another component's; removed
     *  when the last deck-stage leaves. data-omelette-injected keeps it
     *  out of serialized source. */
    _ensurePrintSizingMeta() {
      if (document.querySelector('meta[name="omelette-print-sizing"]')) return;
      const tag = document.createElement('meta');
      tag.id = 'deck-stage-print-sizing';
      tag.name = 'omelette-print-sizing';
      tag.content = 'default-landscape';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** Typographic defaults for slide text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins. Lives in the document,
     *  not the shadow root, for two reasons: document rules reach the
     *  slotted (light DOM) slides, and _snapshotAuthorCss copies document
     *  stylesheets into each thumbnail's shadow root, so the thumbs wrap
     *  the same way — a deck-stage-scoped selector would match nothing
     *  there. data-omelette-injected marks the tag for the host editor
     *  to strip at serialize, so it is never written back as authored
     *  source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('deck-stage-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'deck-stage-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }
    _onSlotChange() {
      // Self-mutate path already reconciled synchronously and emitted
      // slidechange; skip the async slotchange it caused.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      // Primary lock-clear is the host's __deck_rail_ack; this clears on a
      // dropped ack so the rail can't stay dead.
      this._railLock = false;
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
      // The deck just changed under any open rail surface — an open
      // confirm or menu is a question about the OLD deck (its labels and
      // counts may now lie), so close them rather than let a stale
      // answer fire. The element-held selection re-resolves, but the
      // user should re-read what they're deleting.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        this._closeConfirm();
        // The dialog held focus (danger button); hand it back to the rail.
        this._focusCurrentThumb(true);
      }
      if (this._menu && this._menu.hasAttribute('data-open')) this._closeMenu();
      // Editor-mode deletes rebuild the rail through here; a confirmed
      // delete that started from the keyboard still owes focus to the
      // (new) current thumb.
      if (this._pendingRailRefocus) this._focusCurrentThumb(true);
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      // Selection is element-keyed: drop entries whose slide is gone
      // (deleted, or replaced wholesale by a host re-render).
      if (this._selected && this._selected.size) {
        this._selected.forEach(s => {
          if (!this._slideSet.has(s)) this._selected.delete(s);
        });
      }
      if (this._selAnchor && !this._slideSet.has(this._selAnchor)) this._selAnchor = null;
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._syncCount();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      // Per-slide data-speaker-notes is authoritative when present (attrs
      // travel with the element on reorder/dup/delete); a slide without
      // the attr falls through to the legacy #speaker-notes JSON array
      // PER SLIDE so a single attr on a JSON-authored deck doesn't blank
      // the rest.
      const tag = document.getElementById('speaker-notes');
      let json = null;
      if (tag) try {
        const p = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(p)) json = p;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
      }
      this._notes = this._slides.map((s, i) => {
        const a = s.getAttribute('data-speaker-notes');
        return a !== null ? a : json && typeof json[i] === 'string' ? json[i] : '';
      });
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      this._syncCount();
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay(source) {
      // Host posts __omelette_presenting while in fullscreen/tab
      // presentation mode. While presenting, the overlay is
      // pointer-summoned only: it appears on mouse movement and while the
      // user hovers/focuses the controls (source 'pointer'), but never
      // flashes on slide changes or nav-key presses (the default 'auto'
      // source) — a keyboard-driven advance must not blink chrome at the
      // audience. Outside presenting, both sources flash as before.
      if (!this._overlay) return;
      if (this._presenting && source !== 'pointer') return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        // Pinned by hover or focus on the controls — keep them up. The
        // matching mouseleave/focusout re-flashes, so the idle fade
        // resumes from that moment.
        if (this._overlayHover || this._overlayFocus) return;
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode || NARROW_MQ.matches) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
      // Crossing the narrow-viewport breakpoint reveals the rail — rerun the
      // thumbnail scale the same way _setRailWidth does.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle. 'pointer'
      // source: mouse movement summons the controls even while presenting.
      this._flashOverlay('pointer');
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        // Unchanged value → idempotent re-delivery (the guest bundle
        // re-posts when a deck mounts mid-presentation, and host + bundle
        // can both deliver at entry). Skip the resets: re-running the
        // entry work on every delivery would dismiss the pointer-summoned
        // overlay under a hovering cursor and close menus on every slide
        // change. Mirrors the preview_mode branch's unchanged-value guard
        // below.
        if (d.__omelette_presenting !== !!this._presenting) {
          this._presenting = d.__omelette_presenting;
          // A presenting transition invalidates interaction pins: carried
          // across the flip, a stale pin would hold the first summoned
          // overlay open with no pointer anywhere near it. Hide on BOTH
          // transitions: entry cleans the audience's screen, and on exit a
          // pin-skipped hide timeout may have left data-visible set with
          // no timer armed — without this, the footer would linger in the
          // editor until the next mousemove. The next interaction
          // re-summons it either way.
          this._overlayHover = false;
          this._overlayFocus = false;
          if (this._overlay) {
            this._overlay.removeAttribute('data-visible');
            if (this._hideTimer) clearTimeout(this._hideTimer);
          }
          this._syncRailHidden();
          this._closeMenu();
          this._closeConfirm();
          this._fit();
          this._scaleThumbs();
        }
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host has processed a dc-op; rail input is safe again. Not tied to
      // slotchange — setAttr and refusal don't fire one. On refusal,
      // revert the optimistic _index/hash adjustment so the next nav
      // starts from what's actually on screen.
      if (d && d.__dc_op_ack) {
        this._railLock = false;
        if (d.applied === false && this._indexBeforeEmit != null) {
          this._index = this._indexBeforeEmit;
          try {
            history.replaceState(null, '', '#' + (this._index + 1));
          } catch (e) {}
        }
        this._indexBeforeEmit = null;
        // A refused op never re-renders, so slotchange won't restore the
        // keyboard flow's focus — do it here. (Applied ops refocus in
        // _onSlotChange, after the rail has been rebuilt.)
        if (d.applied === false && this._pendingRailRefocus) {
          this._focusCurrentThumb(true);
        }
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTap(e) {
      // Touch-only — keyboard + the overlay toolbar cover nav on desktop.
      if (FINE_POINTER_MQ.matches) return;
      // Only taps that land on the stage (slide content or letterbox); the
      // overlay / rail / menus are siblings with their own click handlers.
      const path = e.composedPath();
      if (!this._stage || !path.includes(this._stage)) return;
      // Let interactive slide content keep the tap. composedPath (not
      // e.target.closest) so we see through open shadow roots — a <button>
      // inside a slide-authored custom element retargets e.target to the
      // host but still appears in the composed path.
      if (e.defaultPrevented) return;
      for (const n of path) {
        if (n === this._stage) break;
        if (n.matches && n.matches(INTERACTIVE_SEL)) return;
      }
      e.preventDefault();
      const rw = this._railWidth();
      const mid = rw + (window.innerWidth - rw) / 2;
      this._advance(e.clientX < mid ? -1 : 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing. composedPath()[0], not e.target: a
      // window-level keydown retargets e.target to the shadow host, which
      // would miss an <input> or contenteditable inside a web component on
      // a slide (same reason _onTap uses composedPath).
      const t = e.composedPath ? e.composedPath()[0] : e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          this._focusCurrentThumb();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' && this._selected.size) {
        // Collapse the multi-selection back to the current slide (the
        // implicit selection), not to nothing.
        this._clearSelection();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'ArrowDown' && !e.defaultPrevented) {
        // ↓/↑ page slides like →/← (Keynote/PowerPoint parity). Window
        // level only: rail thumbs keep their own ↑/↓ walk (their handler
        // stops propagation before this one), and the typing guard above
        // already covers inputs and contenteditable slide content.
        // Deliberate tradeoff: like Space/PageDown before them, these are
        // scroll keys — slide content that wants keyboard scrolling claims
        // them with preventDefault, which this branch honors (checked here
        // and not for the long-standing keys above, so ←/→/Space behavior
        // is unchanged and ↑/↓ behave identically on frozen copies, whose
        // translator in the guest bundle applies the same guard).
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowUp' && !e.defaultPrevented) {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      // User-initiated navigation collapses a multi-selection down to
      // the (implicit) current slide, like Keynote's arrow keys. 'click'
      // handles its own selection; programmatic reasons leave it alone.
      if (reason === 'keyboard' || reason === 'tap') this._clearSelection();
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
        if (this._selected.has(t.slide)) t.thumb.setAttribute('data-selected', '');else t.thumb.removeAttribute('data-selected');
      });
      this._thumbs = next;
      this._renumberRail();
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          // The live-dragged thumb is positioned by the drag tracker; a
          // FLIP transform+transition here would clobber it mid-drag.
          if (thumb === this._dragThumb) return;
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', e => {
        const i = idx();
        const slide = this._slides[i];
        // WebKit doesn't focus a plain element on click — focus
        // explicitly so Delete/Backspace works right after selecting a
        // slide by mouse. preventScroll: _syncRail owns the rail's
        // scroll position.
        thumb.focus({
          preventScroll: true
        });
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          // Multi-select gestures adjust the selection without
          // navigating (Keynote/Figma convention).
          e.preventDefault();
          if (e.shiftKey) {
            // Range from the anchor (last plain/cmd-clicked slide;
            // falls back to the current slide) to here, replacing any
            // previous range.
            let a = this._selAnchor ? this._slides.indexOf(this._selAnchor) : -1;
            if (a < 0) {
              a = this._index;
              this._selAnchor = this._slides[a] || null;
            }
            this._selected.clear();
            for (let j = Math.min(a, i); j <= Math.max(a, i); j++) {
              this._selected.add(this._slides[j]);
            }
          } else if (slide) {
            // Toggle. An empty explicit selection implicitly holds the
            // current slide — materialize it first so cmd-clicking a
            // second slide selects both.
            if (!this._selected.size && i !== this._index && this._slides[this._index]) {
              this._selected.add(this._slides[this._index]);
            }
            if (this._selected.has(slide)) this._selected.delete(slide);else {
              this._selected.add(slide);
              this._selAnchor = slide;
            }
          }
          this._syncSelection();
          return;
        }
        this._clearSelection();
        this._selAnchor = slide || null;
        this._go(i, 'click');
      });
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        // Delete/Backspace with the rail focused deletes this thumb's
        // slide through the same confirm dialog as the menu item.
        // Listening on the thumb (never window-level) is what keeps
        // typing in the notes panel / slide inputs from ever landing
        // here; the target check is belt-and-braces for anything
        // focusable that ends up inside a thumb.
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const t = e.target;
          if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
          e.preventDefault();
          e.stopPropagation();
          // Same refusals as the menu item: never every slide, never
          // while a prior structural op is waiting on its ack. The
          // whole-deck refusal is announced (the menu greys its item
          // out; a silently dead key reads as breakage). The rail-lock
          // refusal stays silent: it lasts one ack round-trip and
          // matches the existing single-delete behavior.
          if (this._railLock) return;
          // Explicit selection wins; otherwise the focused thumb (which
          // plain click and ↑/↓ keep equal to the current slide).
          const sel = this._selected.size ? this._selectionIndices() : [idx()];
          if (sel.length >= this._slides.length) {
            this._showNotice(sel.length === 1 ? 'The last slide can’t be deleted.' : 'At least one slide has to stay — the whole deck can’t be deleted.');
            return;
          }
          this._openConfirm(sel);
          return;
        }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        // v1: dragging moves ONE slide, so a multi-selection would lie
        // about what's about to move — collapse it. (Group drag would
        // instead keep it and emit a batched move.)
        this._clearSelection();
        this._dragFrom = idx();
        // Deferred to the next frame: the [data-dragging] rule sets
        // pointer-events:none on the drag SOURCE, and applying that
        // synchronously inside dragstart makes Chromium (and WebKit) cancel
        // the drag — dragstart then an immediate dragend, no dragover or
        // drop, so thumbnails could not be reordered by dragging at all.
        // One frame is invisible and lands before the first dragover needs
        // the source to be hit-test-transparent. Guarded twice so the
        // attribute can never strand on a thumb that is no longer being
        // dragged (pointer-events:none would leave it unclickable for the
        // session): the pending frame is cancelled in dragend
        // (_cancelDragAttr), and the callback itself re-checks that THIS
        // thumb is still the live drag source (a new drag on another thumb
        // re-points the drag state). Deliberately NOT cancelled in
        // _stopDragTrack — _startDragTrack calls it at the start of every
        // drag, which would kill the mark this dragstart just scheduled
        // (see _cancelDragAttr).
        this._dragAttrRaf = requestAnimationFrame(() => {
          this._dragAttrRaf = null;
          if (this._dragFrom != null && this._dragThumb === thumb) {
            thumb.setAttribute('data-dragging', '');
          }
        });
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
        // Constrain the drag visual to the rail's vertical axis. The
        // browser's default drag image is a free-floating snapshot that
        // follows the OS cursor in BOTH axes and the DnD API offers no way
        // to constrain it — so swap it for a transparent stand-in and move
        // the thumb itself along Y instead (_startDragTrack). The drop
        // logic below always read only clientY; this makes the visual
        // match it.
        try {
          e.dataTransfer.setDragImage(this._dragBlank(), 0, 0);
        } catch (err) {}
        this._startDragTrack(thumb, e.clientY);
      });
      thumb.addEventListener('dragend', () => {
        this._cancelDragAttr();
        thumb.removeAttribute('data-dragging');
        this._stopDragTrack();
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      // The clone participates in the document's flat tree, so the
      // templates' position-based CSS page counters (.slide
      // { counter-increment: page }) would count every materialized
      // thumb before the real slides — folios print offset by the
      // thumb count (slide 2 reading "7" on a five-slide deck).
      // Neutralize the counter on the clone and drop its folio pill:
      // a thumbnail's own page number is unreadable at thumb scale
      // anyway, and the real slides' numbers stay truthful.
      clone.style.counterIncrement = 'none';
      clone.querySelectorAll('.page-foot').forEach(pf => pf.remove());
      // Canvas bitmaps don't clone — swap each cloned canvas for an <img>
      // of the live pixels. Best-effort: tainted canvases throw (left
      // as-is); zero-size are skipped; WebGL without preserveDrawingBuffer
      // reads back blank and the thumb gets a blank img (same as before).
      const liveCanvases = entry.slide.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      cloneCanvases.forEach((cv, i) => {
        const live = liveCanvases[i];
        if (!live || !live.width || !live.height) return;
        try {
          const img = document.createElement('img');
          img.src = live.toDataURL();
          img.alt = '';
          img.style.cssText = cv.style.cssText;
          img.className = cv.className;
          img.width = live.width;
          img.height = live.height;
          // Author CSS that sized the <canvas> via tag selector won't match
          // the <img> — pin the live canvas's laid-out box on the snapshot.
          if (live.clientWidth) {
            img.style.width = live.clientWidth + 'px';
            img.style.height = live.clientHeight + 'px';
          }
          cv.replaceWith(img);
        } catch (e) {}
      });
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      // Parity with _inertify: transient top-layer UI never belongs in a
      // static thumb.
      clone.querySelectorAll('[popover], dialog').forEach(el => el.remove());
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes (_neuter) so a component-heavy deck doesn't run
      // N copies of each component's mount logic in the rail. Children
      // are preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content, and a shadow tree cloned along
      // via attachShadow({clonable:true}) (e.g. <image-slot>) moves onto
      // the box so the thumb shows the component's rendered content. The
      // querySelectorAll NodeList is static, so nested custom elements in
      // the moved subtree are still visited on later iterations.
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = this._neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(this._neuter(el));
      });
      // Strip ids only now: a defined custom element upgrades synchronously
      // during cloneNode and re-renders on attribute callbacks, so removing
      // 'id' any earlier resets components (e.g. <image-slot> falls back to
      // its author src). Post-neuter, only inert boxes and plain elements
      // remain, where the strip is just the usual duplicate-id hygiene.
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      // Clones are display-only: inert removes anything focusable inside
      // them from the tab order, so the rail's Delete/Backspace handler
      // can never see a (retargeted) key press from cloned content.
      host.inert = true;
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Replace a cloned custom element with an inert box (see the comment
     *  in _materialize). A shadow tree cloned along via {clonable:true}
     *  moves onto the box, so the thumb shows the component's real content
     *  with zero component logic; :host rules in the moved <style> match
     *  the box, and the preserved data-* attrs keep :host([data-…])
     *  selectors working. */
    _neuter(el) {
      // Adopt the shadow only when the cloned root carries renderable
      // content. A constructor-attach / connectedCallback-render component
      // clones into an empty (or style-only) slotless root — adopting that
      // would hide the light children the box is about to receive and drop
      // the placeholder chrome. Such components fall back to the plain box.
      let sr = el.shadowRoot;
      if (sr) {
        let renderable = false;
        for (let n = sr.firstElementChild; n; n = n.nextElementSibling) {
          const t = n.tagName;
          if (t !== 'STYLE' && t !== 'LINK') {
            renderable = true;
            break;
          }
        }
        if (!renderable) sr = null;
      }
      const box = document.createElement('div');
      box.style.cssText = (el.getAttribute('style') || '') + (sr ? '' : ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);');
      box.className = el.className;
      // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
      // descendant selectors still match the neutered root — but not
      // pointer-interaction transients (a mid-reframe/mid-drag re-clone
      // would render the interaction chrome statically in the thumb).
      for (const a of el.attributes) {
        const n = a.name;
        if (n === 'data-reframe' || n === 'data-panning' || n === 'data-over') continue;
        if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
          box.setAttribute(n, a.value);
        }
      }
      while (el.firstChild) box.appendChild(el.firstChild);
      if (sr) this._adoptShadow(box, sr);
      return box;
    }

    /** Move a cloned shadow tree onto a neutered thumbnail box: attach an
     *  open root on the box, carry adoptedStyleSheets, move the children,
     *  then make the content inert. */
    _adoptShadow(box, sr) {
      let root;
      try {
        root = box.attachShadow({
          mode: 'open'
        });
      } catch (e) {
        return;
      }
      // Engine-cloned shadow roots never carry adoptedStyleSheets, but a
      // defined component's clone is upgrade-rebuilt (constructor runs
      // during cloneNode), so sheets it adopts there are present and
      // shared by reference — carry them.
      if (sr.adoptedStyleSheets && sr.adoptedStyleSheets.length) {
        try {
          root.adoptedStyleSheets = Array.prototype.slice.call(sr.adoptedStyleSheets);
        } catch (e) {}
      }
      // Clone rather than move: moving preserves listeners an upgraded
      // clone's constructor attached inside its shadow; cloning sheds
      // them, keeping thumbs free of component logic categorically.
      for (let n = sr.firstChild; n; n = n.nextSibling) {
        root.appendChild(n.cloneNode(true));
      }
      this._inertify(root);
    }

    /** Strip anything executable from copied shadow content and apply the
     *  same custom-element/media/img policy as the light-DOM clone.
     *  (Canvases inside copied shadow content stay blank — there is no
     *  live↔clone pairing across shadow boundaries to snapshot from.) */
    _inertify(root) {
      root.querySelectorAll('script').forEach(s => s.remove());
      // Transient top-layer UI can never belong in a static thumb. (A
      // cloned [popover] is display:none anyway — open state doesn't
      // clone — this just makes it categorical.)
      root.querySelectorAll('[popover], dialog').forEach(el => el.remove());
      // Same heavy-media policy as the light-DOM clone above.
      root.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      root.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      root.querySelectorAll('*').forEach(el => {
        for (let i = el.attributes.length - 1; i >= 0; i--) {
          if (/^on/i.test(el.attributes[i].name)) {
            el.removeAttribute(el.attributes[i].name);
          }
        }
      });
      root.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Nested custom elements inside copied shadow content would upgrade
      // on append — same treatment as the light DOM. querySelectorAll is
      // static, so boxes created mid-walk don't re-enter this loop.
      root.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(this._neuter(el));
      });
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }

    /** 1×1 transparent stand-in for setDragImage. Kept attached (offscreen
     *  in the shadow root) because some engines ignore a drag image that
     *  isn't in a rendered tree. Created lazily, reused for every drag. */
    _dragBlank() {
      if (!this._dragBlankEl) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        c.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
        this._root.appendChild(c);
        this._dragBlankEl = c;
      }
      return this._dragBlankEl;
    }

    /** Vertical-only drag tracking: translate the dragged thumb along Y to
     *  follow the pointer, clamped to the rail, ignoring X entirely. A
     *  document-level capture listener is used because native dragover
     *  fires wherever the pointer is — so the thumb keeps tracking even
     *  while the pointer wanders over the stage — and it is removed the
     *  moment the drag ends. getBoundingClientRect already reflects the
     *  current transform, so the layout position is recovered by
     *  subtracting the translation applied so far (rail auto-scroll moves
     *  the layout position mid-drag; see the rail dragover handler). */
    _startDragTrack(thumb, startY) {
      // A lost dragend (the dragged thumb removed mid-drag by a remote
      // edit's re-render — browsers fire no dragend on a disconnected
      // source) would otherwise leave the previous listener installed
      // forever once this overwrite lands.
      this._stopDragTrack();
      this._dragThumb = thumb;
      // The FLIP reorder animation drives transform through a transition;
      // the live drag must not inherit one, or the thumb rubber-bands.
      // Killed BEFORE the grab-offset read: mid-FLIP the rect includes the
      // interpolated transform, which would bake a constant offset into
      // the whole drag.
      thumb.style.transition = 'none';
      this._dragGrab = startY - thumb.getBoundingClientRect().top;
      this._dragTy = 0;
      this._onDragTrack = e => {
        const t = this._dragThumb;
        if (!t) return;
        const rail = this._rail.getBoundingClientRect();
        const r = t.getBoundingClientRect();
        // A transformed ancestor (author wraps the deck in a CSS scale;
        // canvas-mode pan/zoom) scales viewport deltas: translateY(N)
        // moves the rect by s·N. Measure s from the thumb itself (rect is
        // scaled, offsetHeight is layout px) so the feedback loop stays
        // exact instead of oscillating at s ≥ 2. offsetHeight is 0 only
        // when unrendered — nothing to track then, treat as unscaled.
        const s = t.offsetHeight ? r.height / t.offsetHeight : 1;
        const layoutTop = r.top - s * this._dragTy;
        let want = e.clientY - this._dragGrab;
        want = Math.max(rail.top, Math.min(want, rail.bottom - r.height));
        this._dragTy = (want - layoutTop) / s;
        t.style.transform = 'translateY(' + this._dragTy + 'px)';
      };
      document.addEventListener('dragover', this._onDragTrack, true);
    }

    /** Cancel the thumb's deferred data-dragging mark if its frame has not
     *  fired yet — see the dragstart deferral. Called from dragend only:
     *  _stopDragTrack is the wrong home for it, because _startDragTrack
     *  defensively calls _stopDragTrack at the START of every drag (its
     *  lost-dragend reset), so a cancel there kills the mark the same
     *  dragstart just scheduled. The strand that matters — pointer-
     *  events:none left on a CONNECTED thumb that is no longer being
     *  dragged — is closed two ways: dragend cancels the pending frame
     *  here, and the frame callback re-checks that THIS thumb is still the
     *  live drag source (_dragFrom and _dragThumb, both cleared/re-pointed
     *  by dragend or by a new drag). The remaining lost-dragend case — the
     *  source slide removed mid-drag, so no dragend fires — ends with that
     *  thumb discarded by the rail reconcile (thumbs are keyed by slide
     *  element and a removed slide's thumb is not reused), so a mark landing
     *  on it is on a discarded node. The risk this defer adds over the old
     *  synchronous set is therefore the narrow rAF-after-dragend window,
     *  which the dragend cancel covers. */
    _cancelDragAttr() {
      if (this._dragAttrRaf != null) {
        cancelAnimationFrame(this._dragAttrRaf);
        this._dragAttrRaf = null;
      }
    }
    _stopDragTrack() {
      if (this._onDragTrack) {
        document.removeEventListener('dragover', this._onDragTrack, true);
        this._onDragTrack = null;
      }
      const t = this._dragThumb;
      if (t) {
        t.style.transform = '';
        t.style.transition = '';
      }
      this._dragThumb = null;
      this._dragTy = 0;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      // Right-clicking a thumb OUTSIDE the selection collapses the
      // selection to that thumb (platform convention) — the menu then
      // always targets exactly what's highlighted.
      if (this._selected.size && slide && !this._selected.has(slide)) {
        this._selected.clear();
        this._selected.add(slide);
        this._selAnchor = slide;
        this._syncSelection();
      }
      const sel = this._selectionIndices();
      const bulk = sel.length > 1;
      this._menuIndices = bulk ? sel : [i];
      // Bulk mode offers only the one batched op that exists (delete);
      // the single-slide items address one index and stay hidden.
      this._menu.querySelectorAll('[data-act="skip"], [data-act="up"], [data-act="down"], [data-act="duplicate"], hr').forEach(el => {
        el.style.display = bulk ? 'none' : '';
      });
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      const del = this._menu.querySelector('[data-act="delete"]');
      del.textContent = bulk ? 'Delete ' + sel.length + ' slides' : 'Delete slide';
      del.disabled = bulk ? sel.length >= this._slides.length : this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
      this._menuIndices = null;
    }
    _openConfirm(sel) {
      if (!this._confirm) return;
      const list = Array.isArray(sel) ? sel : [sel];
      // Hold the slide ELEMENTS: the deck can re-render while the dialog
      // is open (collaborator/agent edit), and a frozen index list would
      // then address the wrong slides — a same-count reorder even passes
      // the host's witness guard. Elements re-resolve at danger-click.
      this._confirmEls = list.map(i => this._slides[i]).filter(Boolean);
      // Title uses the rail's skip-aware label, so the confirm names the
      // number the user right-clicked (a raw index would disagree with the
      // rail whenever a skipped slide precedes the target).
      const lbl = list.length === 1 ? this._slideLabel(list[0]) : '';
      this._confirm.querySelector('.title').textContent = list.length === 1 ? lbl ? 'Delete slide ' + lbl + '?' : 'Delete skipped slide?' : 'Delete ' + list.length + ' slides?';
      this._confirm.querySelector('.msg').textContent = list.length === 1 ? 'This slide will be removed from the deck.' : 'These slides will be removed from the deck.';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmEls = null;
    }

    /** Return focus to the current slide's thumb so the keyboard flow
     *  (Delete → Enter → Delete …) survives the confirm dialog closing.
     *  Without 'force', skipped while a structural op is in flight
     *  (_railLock): _index is then an optimistic post-op value that
     *  doesn't address the pre-op thumb list — _pendingRailRefocus stays
     *  armed and the ack/slotchange paths call back with force once the
     *  rail reflects the op. Skipped (and disarmed) while the rail is
     *  inert (hidden / presenting). */
    _focusCurrentThumb(force) {
      if (!force && this._railLock) return;
      this._pendingRailRefocus = false;
      // Never yank focus from content the user reached meanwhile (e.g.
      // an input inside a slide during the ack round-trip) — only
      // reclaim it from the rail's own surfaces, or from nowhere.
      const ae = this._root && this._root.activeElement;
      const ours = !ae || this._rail && this._rail.contains(ae) || this._confirm && this._confirm.contains(ae) || this._menu && this._menu.contains(ae);
      const lightAe = document.activeElement;
      const lightOk = !lightAe || lightAe === document.body || lightAe === this;
      if (!ours || !lightOk) return;
      const cur = this._thumbs && this._thumbs[this._index];
      if (cur && this._rail && !this._rail.inert) cur.thumb.focus({
        preventScroll: true
      });
    }

    /** Selection as sorted slide indices. An empty explicit selection
     *  means the current slide (the rail's implicit selection). */
    _selectionIndices() {
      const out = [];
      this._slides.forEach((s, i) => {
        if (this._selected.has(s)) out.push(i);
      });
      if (!out.length && this._slides[this._index]) out.push(this._index);
      return out;
    }
    _clearSelection() {
      // Re-anchor before the early return: a plain click followed by
      // arrow/tap navigation leaves _selected empty but the anchor
      // pointing at the old slide, and a later shift-click would range
      // from there instead of the current slide.
      this._selAnchor = null;
      if (!this._selected.size) return;
      this._selected.clear();
      this._syncSelection();
    }
    _syncSelection() {
      (this._thumbs || []).forEach(t => {
        if (this._selected.has(t.slide)) t.thumb.setAttribute('data-selected', '');else t.thumb.removeAttribute('data-selected');
      });
    }

    /** Rail mutations. When a dc-runtime is present (`window.__dcUpdate`)
     *  the host owns the light DOM — handlers emit a dc-op only and the
     *  host applies it (to the editor's model or to the source file) and
     *  re-renders via dc-runtime; slotchange catches the rail up.
     *  Structural ops lock rail input until the host acks so a rapid second
     *  click can't address a stale index; setAttr/removeAttr respect the
     *  lock but don't set it (indices unchanged; the host serializes).
     *  `newIndex` is written to location.hash so slotchange's
     *  _restoreIndex lands on the right slide.
     *
     *  With NO dc-runtime (a raw .html deck), there's no re-render path,
     *  so handlers self-mutate locally for an instant update and emit
     *  `emitOnly: false`; the host persists to disk without
     *  re-rendering over the already-mutated DOM.
     *
     *  See docs/dc-ops.md for the contract. */
    /** True when the page's DC runtime reports a live template stream for
     *  any component here (newer support.js bundles only — older bundles
     *  lack the signal and the HOST-side gate covers those decks). Rail
     *  mutations are refused for the duration: a mid-stream op addresses
     *  slide indices the stream is rewriting underneath the click. */
    _streamActive() {
      try {
        return !!window.__dcUpdate && typeof window.__dcStreaming === 'function' && window.__dcStreaming();
      } catch (e) {
        return false;
      }
    }

    /** Transient in-stage notice for a refused mid-stream rail op. */
    _showStreamNotice() {
      this._showNotice('Claude is still updating this deck — try again when it finishes.');
    }

    /** Transient bottom-center toast for a refused rail gesture. */
    _showNotice(text) {
      if (!this._root) return;
      let n = this._streamNotice;
      if (!n) {
        n = document.createElement('div');
        n.className = 'export-hidden';
        n.setAttribute('data-omelette-chrome', '');
        n.setAttribute('role', 'status');
        n.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' + 'background:rgba(22,22,22,.94);color:#fff;' + 'font:500 13px/1.4 system-ui,sans-serif;padding:8px 14px;' + 'border-radius:8px;z-index:2147483646;pointer-events:none;' + 'opacity:0;transition:opacity .15s ease';
        this._root.append(n);
        this._streamNotice = n;
      }
      n.textContent = text;
      n.style.opacity = '1';
      if (this._streamNoticeTimer) clearTimeout(this._streamNoticeTimer);
      this._streamNoticeTimer = setTimeout(() => {
        n.style.opacity = '0';
      }, 2600);
    }
    _emitDcOp(op, slide, lock, newIndex) {
      // Mid-stream guard: refuse the gesture outright — no lock, no
      // optimistic index change, no emit, no self-mutation (returning
      // true short-circuits every caller). The host applies the same
      // gate for decks whose committed support.js predates the signal.
      if (this._streamActive()) {
        this._showStreamNotice();
        return true;
      }
      // Slide index (template/script/style filtered — same as
      // _collectSlides). deck-stage is a filtered-index dc-op emitter;
      // the host resolves against findDeckStage().slideTids. Callers
      // already pass `to` as a slide index.
      op.at = this._slides.indexOf(slide);
      op.witness = {
        childCount: this._slides.length
      };
      // dc-runtime wraps an <x-import>-mounted component in a
      // <div class="sc-host-x" data-dc-tpl="N"> host — the stamp is on the
      // WRAPPER, not this element. closest() finds it (or this element's
      // own stamp when directly templated).
      const host = this.closest('[data-dc-tpl]');
      const tid = host && host.getAttribute('data-dc-tpl');
      op.mount = {
        tid: tid !== null ? parseInt(tid, 10) : null,
        tag: 'deck-stage'
      };
      op.emitOnly = !!window.__dcUpdate;
      if (op.emitOnly) {
        if (lock) this._railLock = true;
        if (newIndex != null && newIndex !== this._index) {
          this._indexBeforeEmit = this._index;
          this._index = newIndex;
          try {
            history.replaceState(null, '', '#' + (newIndex + 1));
          } catch (e) {}
        }
      }
      this.dispatchEvent(new CustomEvent('dc-op', {
        detail: op,
        bubbles: true,
        composed: true
      }));
      return op.emitOnly;
    }

    /** Delete a set of slides (pre-op indices). One slide delegates to
     *  _deleteSlide — the plain 'remove' op — so single deletes keep
     *  working against hosts that predate 'removeMany'. A bulk delete is
     *  ONE op: one host write, one undo snapshot, and indices that all
     *  address the same pre-op deck (N acked single ops would each need
     *  a fresh witness). */
    _deleteSlides(list) {
      if (this._railLock || !list) return;
      const indices = [...new Set(list)].filter(i => this._slides[i]).sort((a, b) => a - b);
      if (!indices.length || indices.length >= this._slides.length) return;
      if (indices.length === 1) {
        this._deleteSlide(indices[0]);
        return;
      }
      // Mirrors _duplicateSlide: check the stream gate before doing any
      // work (_emitDcOp re-checks).
      if (this._streamActive()) {
        this._showStreamNotice();
        return;
      }
      const els = indices.map(i => this._slides[i]);
      const del = new Set(indices);
      const cur = this._index;
      // New current index in post-op space: shift the kept slide left by
      // the deletions below it; if the current slide itself is deleted,
      // land on the nearest survivor (after, else before).
      const below = n => indices.reduce((k, x) => k + (x < n ? 1 : 0), 0);
      let ni;
      if (!del.has(cur)) {
        ni = cur - below(cur);
      } else {
        let s = -1;
        for (let j = cur + 1; j < this._slides.length; j++) {
          if (!del.has(j)) {
            s = j;
            break;
          }
        }
        if (s === -1) {
          for (let j = cur - 1; j >= 0; j--) {
            if (!del.has(j)) {
              s = j;
              break;
            }
          }
        }
        ni = s < 0 ? 0 : s - below(s);
      }
      // Emit-path deletes can't refocus until the host re-renders; arm
      // the flag at emit time (never on a refused/no-op path) so
      // ack/slotchange can finish the keyboard flow's focus hand-back.
      // The local path clears it via the caller's _focusCurrentThumb().
      this._pendingRailRefocus = true;
      if (this._emitDcOp({
        op: 'removeMany',
        indices
      }, els[0], true, ni)) return;
      this._index = ni;
      this._squelchSlotChange = true;
      els.forEach(el => el.remove());
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _deleteSlide(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const cur = this._index;
      const ni = i < cur || i === cur && i === this._slides.length - 1 ? cur - 1 : cur;
      this._pendingRailRefocus = true;
      if (this._emitDcOp({
        op: 'remove'
      }, slide, true, ni)) return;
      this._index = ni;
      this._squelchSlotChange = true;
      slide.remove();
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _duplicateSlide(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide) return;
      // Mint ids + copy component state BEFORE emitting, so the op can
      // carry the id map — but never mint for an op the stream gate is
      // about to refuse (_emitDcOp re-checks; this avoids orphaned keys).
      if (this._streamActive()) {
        this._showStreamNotice();
        return;
      }
      const copy = slide.cloneNode(true);
      copy.removeAttribute('id');
      const ids = this._remintDuplicateIds(copy);
      const op = {
        op: 'duplicate'
      };
      if (ids) op.ids = ids;
      if (this._emitDcOp(op, slide, true, i + 1)) return;
      this._index = i + 1;
      this._squelchSlotChange = true;
      this.insertBefore(copy, slide.nextSibling);
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }

    /** Duplicate id policy. Plain ids are stripped — two live slides must
     *  not share one id. But a component that KEYS persistent state by id
     *  (image-slot's sidecar photo) would silently lose that state with
     *  its id. Such a component opts out of the strip by exposing a
     *  static cloneSlot(fromId, isFree) that copies its stored state
     *  under a fresh id of its choosing and returns that id. The old→new
     *  map is returned (or null) and rides the dc-op so the host writes
     *  the SAME ids into source — without that, the copy's state would
     *  revert on reload (docs/dc-ops.md). */
    _remintDuplicateIds(copy) {
      const ids = {};
      let found = false;
      const used = new Set();
      const idOk = /^[A-Za-z][\w-]{0,63}$/;
      const isFree = id => idOk.test(id) && !used.has(id) && !document.getElementById(id);
      copy.querySelectorAll('[id]').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const cls = tag.indexOf('-') >= 0 && customElements.get(tag);
        let next = null;
        if (el.id && cls && typeof cls.cloneSlot === 'function') {
          try {
            next = cls.cloneSlot(el.id, isFree);
          } catch (e) {}
        }
        // Re-checked here so a misbehaving static can't smuggle a dupe
        // or an unsafe value into the document / the emitted op.
        if (typeof next === 'string' && isFree(next)) {
          ids[el.id] = next;
          used.add(next);
          el.id = next;
          found = true;
        } else {
          el.removeAttribute('id');
        }
      });
      return found ? ids : null;
    }
    _toggleSkip(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (this._emitDcOp(on ? {
        op: 'setAttr',
        attr: 'data-deck-skip',
        value: ''
      } : {
        op: 'removeAttr',
        attr: 'data-deck-skip'
      }, slide, false)) return;
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }

    /** Rail numbering, skip-aware: a skipped slide shows no number and the
     *  rest stay contiguous (1..visible), so the labels match the positions
     *  the overlay counter reports. Cheap (text writes are diffed), safe to
     *  call after any reconcile or skip toggle. */
    _renumberRail() {
      let v = 0;
      (this._thumbs || []).forEach(t => {
        const label = t.slide.hasAttribute('data-deck-skip') ? '' : String(++v);
        if (t.num.textContent !== label) t.num.textContent = label;
      });
    }

    /** Skip-aware label for slide i — the same numbering _renumberRail
     *  paints: '' for a skipped slide, else its 1-based position among
     *  non-skipped slides. Display surfaces (e.g. the delete confirm)
     *  use this so they never name a number the rail doesn't show. */
    _slideLabel(i) {
      const s = this._slides[i];
      if (!s || s.hasAttribute('data-deck-skip')) return '';
      let v = 0;
      for (let k = 0; k <= i; k++) {
        if (!this._slides[k].hasAttribute('data-deck-skip')) v++;
      }
      return String(v);
    }

    /** Overlay counter, skip-aware: position among non-skipped slides over
     *  the non-skipped total. A skipped CURRENT slide (reachable by rail
     *  click or deep link, never by _advance) shows '–' — its number is
     *  gone from the rail, so any digit here would lie. */
    _syncCount() {
      if (!this._countEl || !this._totalEl) return;
      // Empty deck: keep the overlay's initial "1 / 1" (it has nothing to
      // count and isn't visible without slides) — the guest fallback for
      // frozen copies leaves empty decks alone for the same rendering.
      if (!this._slides.length) {
        this._countEl.textContent = '1';
        this._totalEl.textContent = '1';
        return;
      }
      let pos = 0,
        total = 0;
      this._slides.forEach((s, i) => {
        if (!s.hasAttribute('data-deck-skip')) {
          total++;
          if (i <= this._index) pos = total;
        }
      });
      const cur = this._slides[this._index];
      const curSkipped = !cur || cur.hasAttribute('data-deck-skip');
      this._countEl.textContent = curSkipped ? '–' : String(pos);
      this._totalEl.textContent = String(total);
    }
    _moveSlide(i, j) {
      if (this._railLock || j < 0 || j >= this._slides.length || j === i) return;
      const cur = this._index;
      const ni = cur === i ? j : i < cur && j >= cur ? cur - 1 : i > cur && j <= cur ? cur + 1 : cur;
      const slide = this._slides[i];
      if (this._emitDcOp({
        op: 'move',
        to: j
      }, slide, true, ni)) return;
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      this._index = ni;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/admin/doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    /* Monolithic at print: Blink slices a transform-scaled child at
     * fragmentainer boundaries mapped in UNSCALED layout coordinates
     * (transforms are paint-time), so the .fit box (authored size, e.g.
     * 1400x990) gets cut at the page's free block space and spills onto
     * a second sheet even though its SCALED footprint fits the page by
     * construction. overflow:hidden makes .fit-box a scroll container —
     * monolithic under fragmentation (css-break-3) — so the scaled
     * content prints atomically on one sheet. No clipping for content
     * within the authored box: .fit-box is calc-sized to exactly the
     * scaled footprint. (Content that bleeds past content-width/height
     * is clipped at the footprint — fit mode's contract; it previously
     * painted beyond it at print.) Print-only, so the screen rendering
     * keeps visible overflow for editor affordances.
     * The export path injects the same rule into frozen copies
     * (print-eval.ts om-print-fit-contain). The .fit-mode scope is
     * load-bearing: .fit-box wraps slotted content in EVERY mode, and an
     * unscoped overflow:hidden would make whole flowing documents
     * monolithic (one truncated sheet). overflow:hidden, never clip —
     * clip is not a scroll container, so not monolithic. */
    @media print {
      .fit-mode .fit-box { overflow: hidden; }
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/doc-page.js", error: String((e && e.message) || e) }); }

// ui_kits/app/AccountScreen.jsx
try { (() => {
function AccountScreen({
  onBack
}) {
  const {
    IconButton,
    Card,
    ListRow,
    Button,
    Badge,
    StatTile
  } = VDS;
  const group = (title, children) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--ls-caps)',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      margin: '18px 4px 8px'
    }
  }, title), /*#__PURE__*/React.createElement(Card, {
    padding: 4,
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, children));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    label: "Voltar",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, "Minha conta")), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      flex: 1,
      overflow: 'auto',
      scrollbarWidth: 'none',
      padding: '16px 20px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--sun-300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--fw-bold) 20px/1 var(--font-sans)'
    }
  }, "AL"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)'
    }
  }, "Ana Lima"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    icon: "ShieldCheck"
  }, "Verificada"), /*#__PURE__*/React.createElement(Badge, {
    size: "sm",
    tone: "neutral"
  }, "18+")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    icon: "Wallet",
    label: "Cr\xE9ditos",
    value: "R$ 38,50"
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: "Timer",
    label: "Pacote de minutos",
    value: "120 min"
  })), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    variant: "secondary",
    icon: "Plus",
    style: {
      marginTop: 10
    }
  }, "Recarregar carteira"), group('Plano', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListRow, {
    icon: "CalendarClock",
    iconTone: "brand",
    title: "Semanal entregador",
    subtitle: "Pr\xF3xima cobran\xE7a 28/10 \xB7 R$ 299",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "BatteryCharging",
    iconTone: "info",
    title: "Esta\xE7\xF5es de troca de bateria",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "Wrench",
    title: "Agendar manuten\xE7\xE3o",
    trailing: "chevron"
  }))), group('Viagens', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListRow, {
    icon: "History",
    title: "Hist\xF3rico e recibos",
    value: "23",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "Gift",
    iconTone: "sun",
    title: "Cupons e indica\xE7\xE3o",
    subtitle: "Ganhe R$ 10 por amigo",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "FileText",
    title: "Contestar cobran\xE7a / sinistro",
    trailing: "chevron"
  }))), group('Ajuda', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListRow, {
    icon: "MessageCircle",
    iconTone: "brand",
    title: "Chat com o suporte",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "CircleHelp",
    title: "Central de ajuda",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "Signpost",
    title: "Regras de tr\xE2nsito para autopropelidos",
    trailing: "chevron"
  }))), group('Privacidade (LGPD)', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListRow, {
    icon: "Download",
    title: "Baixar meus dados",
    trailing: "chevron"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "Trash2",
    iconTone: "danger",
    title: "Excluir conta",
    trailing: "chevron"
  })))));
}
window.AccountScreen = AccountScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AccountScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ClientApp.jsx
try { (() => {
const SCREENS = [['onboarding', 'Cadastro'], ['home', 'Mapa'], ['pick', 'Escolher moto'], ['reserved', 'Reserva'], ['scan', 'QR'], ['plan', 'Plano e seguro'], ['ride', 'Corrida'], ['return', 'Devolução'], ['summary', 'Recibo'], ['account', 'Conta']];
const ORDER = SCREENS.map(x => x[0]);
const T_IN = {
  fwd: ['vt-screen-in-right', 2],
  back: ['vt-screen-in-left', 1],
  up: ['vt-screen-in-up', 2],
  down: ['vt-screen-emerge', 1]
};
const T_OUT = {
  fwd: ['vt-screen-out-left', 1],
  back: ['vt-screen-out-right', 2],
  up: ['vt-screen-recede', 1],
  down: ['vt-screen-out-down', 2]
};
function ClientApp() {
  const [nav, setNav] = React.useState(() => ({
    cur: localStorage.getItem('volti-kit-screen') || 'home',
    prev: null,
    dir: 'fwd',
    n: 0
  }));
  const [veh, setVeh] = React.useState(VEHICLES[0]);
  const [toast, setToast] = React.useState(null);
  const navRef = React.useRef(nav);
  navRef.current = nav;
  const go = (x, t) => {
    const c = navRef.current;
    if (x === c.cur) return;
    const dir = x === 'scan' ? 'up' : c.cur === 'scan' && x !== 'plan' ? 'down' : ORDER.indexOf(x) > ORDER.indexOf(c.cur) ? 'fwd' : 'back';
    const n = c.n + 1;
    setNav({
      cur: x,
      prev: c.cur,
      dir,
      n
    });
    localStorage.setItem('volti-kit-screen', x);
    setTimeout(() => setNav(p => p.n === n ? {
      ...p,
      prev: null
    } : p), 480);
    if (t) {
      setToast(t);
      setTimeout(() => setToast(null), 2800);
    }
  };
  const render = s => {
    if (s === 'onboarding') return /*#__PURE__*/React.createElement(Onboarding, {
      onDone: () => go('home', 'Cadastro enviado. Verificação em até 2 min.')
    });
    if (s === 'home') return /*#__PURE__*/React.createElement(HomeScreen, {
      toast: toast,
      onAccount: () => go('account'),
      onList: () => go('pick'),
      onReserve: v => {
        setVeh(v);
        go('reserved');
      },
      onScan: () => go('scan')
    });
    if (s === 'pick') return /*#__PURE__*/React.createElement(PickScreen, {
      onBack: () => go('home'),
      onMap: () => go('home'),
      onReserve: v => {
        setVeh(v);
        go('reserved');
      }
    });
    if (s === 'reserved') return /*#__PURE__*/React.createElement(ReservedScreen, {
      vehicle: veh,
      onCancel: () => go('home', 'Reserva cancelada'),
      onScan: () => go('scan')
    });
    if (s === 'scan') return /*#__PURE__*/React.createElement(ScanScreen, {
      onBack: () => go('home'),
      onUnlocked: () => go('plan')
    });
    if (s === 'plan') return /*#__PURE__*/React.createElement(PlanScreen, {
      onBack: () => go('scan'),
      onConfirm: () => go('ride')
    });
    if (s === 'ride') return /*#__PURE__*/React.createElement(RideScreen, {
      onEnd: () => go('return')
    });
    if (s === 'return') return /*#__PURE__*/React.createElement(ReturnScreen, {
      onBack: () => go('ride'),
      onDone: () => go('summary')
    });
    if (s === 'account') return /*#__PURE__*/React.createElement(AccountScreen, {
      onBack: () => go('home')
    });
    return /*#__PURE__*/React.createElement(SummaryScreen, {
      onDone: () => go('home', 'Obrigado por andar de Volti')
    });
  };
  const layer = (s, key, anim, z, out) => /*#__PURE__*/React.createElement("div", {
    key: key,
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: 'var(--surface-app)',
      zIndex: z,
      pointerEvents: out ? 'none' : undefined,
      animation: anim ? anim + ' var(--dur-screen) var(--ease-screen) both' : 'none',
      boxShadow: anim && z === 2 ? '0 0 48px rgba(21,24,26,.22)' : 'none'
    }
  }, render(s));
  const animate = nav.n > 0;
  const [inA, inZ] = T_IN[nav.dir],
    [outA, outZ] = T_OUT[nav.dir];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 560
    }
  }, SCREENS.map(([k, l]) => /*#__PURE__*/React.createElement(VDS.Chip, {
    key: k,
    selected: k === nav.cur,
    onClick: () => go(k)
  }, l))), /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    "data-screen-label": nav.cur,
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
      background: '#000'
    }
  }, nav.prev && layer(nav.prev, nav.prev + '-' + (nav.n - 1), outA, outZ, true), layer(nav.cur, nav.cur + '-' + nav.n, animate ? inA : null, animate ? inZ : 1, false))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(ClientApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ClientApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DeckPhone.jsx
try { (() => {
function DeckPhone({
  screen = 'home'
}) {
  const noop = () => {};
  const M = {
    onb0: /*#__PURE__*/React.createElement(Onboarding, {
      onDone: noop
    }),
    onb3: /*#__PURE__*/React.createElement(Onboarding, {
      onDone: noop,
      initialStep: 3
    }),
    home: /*#__PURE__*/React.createElement(HomeScreen, {
      onReserve: noop,
      onScan: noop,
      onAccount: noop,
      onList: noop
    }),
    homeSel: /*#__PURE__*/React.createElement(HomeScreen, {
      onReserve: noop,
      onScan: noop,
      onAccount: noop,
      onList: noop,
      initialSel: 1
    }),
    pick: /*#__PURE__*/React.createElement(PickScreen, {
      onBack: noop,
      onMap: noop,
      onReserve: noop
    }),
    reserved: /*#__PURE__*/React.createElement(ReservedScreen, {
      vehicle: VEHICLES[0],
      onCancel: noop,
      onScan: noop
    }),
    scan: /*#__PURE__*/React.createElement(ScanScreen, {
      onBack: noop,
      onUnlocked: noop
    }),
    plan: /*#__PURE__*/React.createElement(PlanScreen, {
      onBack: noop,
      onConfirm: noop
    }),
    ride: /*#__PURE__*/React.createElement(RideScreen, {
      onEnd: noop
    }),
    return: /*#__PURE__*/React.createElement(ReturnScreen, {
      onBack: noop,
      onDone: noop
    }),
    summary: /*#__PURE__*/React.createElement(SummaryScreen, {
      onDone: noop
    }),
    account: /*#__PURE__*/React.createElement(AccountScreen, {
      onBack: noop
    })
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-om-raster": "",
    style: {
      width: 402,
      height: 874
    }
  }, /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, M[screen])));
}
window.DeckPhone = DeckPhone;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DeckPhone.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
const VEHICLES = [{
  id: 1,
  x: 100,
  y: 300,
  level: 90,
  range: 20,
  name: 'Volti Flash'
}, {
  id: 2,
  x: 290,
  y: 240,
  level: 62,
  range: 13,
  name: 'Volti Urban'
}, {
  id: 3,
  x: 330,
  y: 470,
  level: 35,
  range: 7,
  name: 'Volti Flash'
}, {
  id: 4,
  x: 170,
  y: 520,
  level: 88,
  range: 19,
  name: 'Volti Cargo'
}, {
  id: 5,
  x: 80,
  y: 600,
  level: 15,
  range: 2,
  name: 'Volti Urban'
}, {
  id: 6,
  x: 270,
  y: 640,
  level: 74,
  range: 15,
  name: 'Volti Flash'
}];
function TopOverlay({
  onPass,
  onAvatar
}) {
  const {
    LocationHeader,
    PassCard,
    Chip
  } = VDS;
  const [f, setF] = React.useState('all');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      paddingTop: 58
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "vt-drop",
    style: {
      padding: '0 20px'
    }
  }, /*#__PURE__*/React.createElement(LocationHeader, {
    initials: "AL",
    address: "Av. Paulista, 1578",
    onAvatar: onAvatar
  })), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      padding: '14px 20px 8px',
      scrollbarWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(PassCard, {
    title: "Desbloqueie seu passe",
    subtitle: "Ande mais, pague menos",
    tone: "sun",
    onClick: onPass
  }), /*#__PURE__*/React.createElement(PassCard, {
    title: "1\xAA corrida gr\xE1tis",
    subtitle: "At\xE9 15 minutos",
    icon: "Gift",
    tone: "coral"
  }), /*#__PURE__*/React.createElement(PassCard, {
    title: "Indique e ganhe",
    subtitle: "R$ 10 por amigo",
    icon: "Users",
    tone: "sky"
  })), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      display: 'flex',
      gap: 8,
      padding: '2px 20px 8px',
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, [['all', 'Todas', 'Bike'], ['r10', 'Autonomia 10+ km', 'Zap'], ['pick', 'Pontos de retirada', 'MapPinned'], ['swap', 'Troca de bateria', 'BatteryCharging']].map(([k, l, i]) => /*#__PURE__*/React.createElement(Chip, {
    key: k,
    icon: i,
    selected: f === k,
    onClick: () => setF(k),
    style: {
      boxShadow: 'var(--shadow-1)',
      border: f === k ? undefined : '1px solid transparent'
    }
  }, l))));
}
function VehicleSheet({
  v,
  onClose,
  onReserve,
  onScan
}) {
  const {
    BottomSheet,
    VehicleSummary,
    Chip,
    Card,
    ListRow,
    Button,
    IconButton
  } = VDS;
  return /*#__PURE__*/React.createElement(BottomSheet, {
    open: !!v,
    padding: "10px 20px 30px"
  }, v && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
    icon: "X",
    variant: "soft",
    size: 32,
    label: "Fechar",
    onClick: onClose,
    style: {
      position: 'absolute',
      top: 16,
      right: 16
    }
  }), /*#__PURE__*/React.createElement(VehicleSummary, {
    name: v.name,
    level: v.level,
    range: v.range,
    onView3d: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      display: 'flex',
      gap: 8,
      margin: '18px 0 12px',
      overflowX: 'auto',
      scrollbarWidth: 'none'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    icon: "Megaphone"
  }, "Buzinar e piscar"), /*#__PURE__*/React.createElement(Chip, {
    icon: "Navigation"
  }, "Navegar"), /*#__PURE__*/React.createElement(Chip, {
    icon: "CircleAlert"
  }, "Reportar problema")), /*#__PURE__*/React.createElement(Card, {
    variant: "sunken",
    padding: 6,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    icon: "Ticket",
    iconTone: "sun",
    title: "Cupom promocional",
    onClick: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: "ScanQrCode",
    style: {
      flex: 1
    },
    onClick: onScan
  }, "Escanear QR"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: "Bookmark",
    style: {
      flex: 1
    },
    onClick: onReserve
  }, "Reservar"))));
}
function HomeScreen({
  onReserve,
  onScan,
  onAccount,
  onList,
  toast,
  initialSel = null
}) {
  const {
    VehicleMarker,
    Button,
    IconButton,
    Toast
  } = VDS;
  const [sel, setSel] = React.useState(initialSel);
  const v = VEHICLES.find(x => x.id === sel);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement(MapView, null, VEHICLES.map((x, i) => /*#__PURE__*/React.createElement(Pin, {
    key: x.id,
    x: x.x,
    y: x.y
  }, /*#__PURE__*/React.createElement(VehicleMarker, {
    level: x.level,
    delay: 260 + i * 70,
    selected: x.id === sel,
    onClick: () => setSel(x.id)
  }))), /*#__PURE__*/React.createElement(UserDot, {
    x: 200,
    y: 430
  })), /*#__PURE__*/React.createElement(TopOverlay, {
    onAvatar: onAccount
  }), !v && /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 40,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      alignItems: 'flex-end'
    }
  }, toast && /*#__PURE__*/React.createElement(Toast, {
    style: {
      width: '100%',
      boxSizing: 'border-box'
    }
  }, toast), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(VDS.Chip, {
    icon: "List",
    onClick: onList,
    style: {
      height: 44,
      padding: '0 16px',
      boxShadow: 'var(--shadow-1)',
      border: '1px solid transparent'
    }
  }, "Escolher moto"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "LocateFixed",
    iconColor: "var(--brand)",
    label: "Minha localiza\xE7\xE3o"
  })), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    shine: true,
    icon: "ScanQrCode",
    onClick: onScan
  }, "Escanear para andar")), /*#__PURE__*/React.createElement(VehicleSheet, {
    v: v,
    onClose: () => setSel(null),
    onReserve: () => onReserve(v),
    onScan: onScan
  }));
}
Object.assign(window, {
  HomeScreen,
  TopOverlay,
  VEHICLES
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/MapView.jsx
try { (() => {
const MAP_Z = 15,
  MAP_CX = 12137.1,
  MAP_CY = 18592.6;
function MapView({
  children,
  dim = false,
  offsetY = 0
}) {
  const W = 402,
    H = 874,
    tiles = [];
  const cx = MAP_CX * 256,
    cy = MAP_CY * 256 + offsetY;
  for (let x = 12135; x <= 12139; x++) for (let y = 18589; y <= 18596; y++) {
    const l = x * 256 - cx + W / 2,
      t = y * 256 - cy + H / 2;
    if (l > -256 && l < W && t > -256 && t < H) tiles.push(/*#__PURE__*/React.createElement("img", {
      key: x + '-' + y,
      src: 'https://tile.openstreetmap.org/' + MAP_Z + '/' + x + '/' + y + '.png',
      width: "256",
      height: "256",
      draggable: "false",
      style: {
        position: 'absolute',
        left: l,
        top: t,
        display: 'block',
        filter: 'saturate(.55) brightness(1.06) contrast(.92)'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: 'var(--map-land)'
    }
  }, tiles, dim && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(255,255,255,.25)'
    }
  }), children);
}
function Pin({
  x,
  y,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%,-100%)',
      zIndex: 5
    }
  }, children);
}
function UserDot({
  x,
  y,
  heading = false
}) {
  const s = heading ? 34 : 20;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%,-50%)',
      zIndex: 6,
      animation: 'vt-pop-in 500ms var(--ease-spring) 200ms both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: s,
      height: s,
      borderRadius: '50%',
      background: 'var(--brand)',
      animation: 'vt-pulse-ring 2.2s var(--ease-out) infinite'
    }
  }), !heading && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -40,
      top: -80,
      width: 80,
      height: 80,
      background: 'linear-gradient(to top, rgba(52,194,92,.35), rgba(52,194,92,0))',
      clipPath: 'polygon(50% 100%, 0 0, 100% 0)'
    }
  }), heading ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--brand)',
      border: '3px solid #fff',
      boxShadow: 'var(--shadow-brand)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(VDS.Icon, {
    name: "Navigation2",
    size: 16,
    style: {
      fill: '#fff'
    }
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--brand)',
      border: '4px solid #fff',
      boxShadow: '0 2px 6px rgba(21,24,26,.25)',
      boxSizing: 'border-box'
    }
  }));
}
function Route({
  points,
  color = 'var(--coral-500)'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 4,
      pointerEvents: 'none'
    },
    width: "402",
    height: "874"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: points,
    fill: "none",
    stroke: color,
    strokeWidth: "4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: "1",
    strokeDasharray: "1",
    strokeDashoffset: "1",
    style: {
      animation: 'vt-draw 1.1s var(--ease-in-out) 300ms forwards'
    }
  }));
}
Object.assign(window, {
  MapView,
  Pin,
  UserDot,
  Route
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/MapView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Onboarding.jsx
try { (() => {
function Onboarding({
  onDone,
  initialStep = 0
}) {
  const {
    Button,
    Input,
    Checkbox,
    IconButton,
    Icon,
    OtpInput,
    ProgressSteps,
    PhotoCapture,
    Alert,
    OptionCard,
    Badge
  } = VDS;
  const [step, setStep] = React.useState(initialStep);
  const [code, setCode] = React.useState('48');
  const [age, setAge] = React.useState(true);
  const [doc, setDoc] = React.useState(false),
    [selfie, setSelfie] = React.useState(false);
  const [pay, setPay] = React.useState('card');
  const shell = (title, sub, body, cta, ctaOk = true, next) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-card)',
      display: 'flex',
      flexDirection: 'column',
      padding: '60px 20px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    variant: "soft",
    size: 40,
    label: "Voltar",
    onClick: () => setStep(step - 1)
  }), /*#__PURE__*/React.createElement(ProgressSteps, {
    total: 4,
    current: step - 1,
    style: {
      flex: 1
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em',
      margin: '22px 0 6px'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      marginBottom: 22,
      textWrap: 'pretty'
    }
  }, sub), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      flex: 1,
      overflow: 'auto'
    }
  }, body), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    disabled: !ctaOk,
    onClick: next || (() => setStep(step + 1)),
    style: {
      marginTop: 16
    }
  }, cta));
  if (step === 0) return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-card)',
      display: 'flex',
      flexDirection: 'column',
      padding: '64px 20px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 26px/1 var(--font-sans)',
      letterSpacing: '-.04em',
      color: 'var(--brand)'
    }
  }, "volti"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      margin: '20px 0',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--sky-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-caption)',
      color: 'var(--blue-600)',
      textAlign: 'center'
    }
  }, "ilustra\xE7\xE3o de boas-vindas", /*#__PURE__*/React.createElement("br", null), "(arte da marca)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, ['Sem CNH', 'Sem placa', '18+'].map(t => /*#__PURE__*/React.createElement(Badge, {
    key: t,
    tone: "success"
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-display)',
      letterSpacing: '-.02em'
    }
  }, "Pegue uma moto e v\xE1."), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      margin: '8px 0 22px'
    }
  }, "Por minuto, hora, dia ou semana. Liberada pelo app em segundos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    icon: "Phone",
    onClick: () => setStep(1)
  }, "Continuar com celular"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "dark",
    style: {
      flex: 1
    },
    onClick: () => setStep(1)
  }, "Apple"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    style: {
      flex: 1,
      color: 'var(--text-primary)',
      borderColor: 'var(--border-strong)'
    },
    onClick: () => setStep(1)
  }, "Google")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    icon: "Mail",
    onClick: () => setStep(1)
  }, "Entrar com e-mail")));
  if (step === 1) return shell('Digite o código', 'Enviamos 6 dígitos por SMS para (11) 98765-4321.', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(OtpInput, {
    value: code,
    onChange: setCode
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "N\xE3o chegou? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "Reenviar em 0:42"))), 'Confirmar', code.length === 6);
  if (step === 2) return shell('Seus dados', 'Não pedimos CNH. Só confirmamos que é você.', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Input, {
    label: "Nome completo",
    placeholder: "Como no documento",
    icon: "User",
    defaultValue: "Ana Lima"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "CPF",
    placeholder: "000.000.000-00",
    icon: "IdCard",
    inputMode: "numeric",
    defaultValue: "123.456.789-00"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Data de nascimento",
    placeholder: "DD/MM/AAAA",
    icon: "Calendar",
    defaultValue: "14/03/1998",
    hint: "\xC9 preciso ter 18 anos ou mais"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: age,
    onChange: setAge,
    label: "Aceito os termos de uso e a pol\xEDtica de privacidade"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    defaultChecked: true,
    label: "Permito o uso da minha localiza\xE7\xE3o durante o aluguel"
  }))), 'Continuar', age);
  if (step === 3) return shell('Verificação de identidade', 'Foto do documento e uma selfie rápida para comparação facial.', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PhotoCapture, {
    label: "Foto do documento (RG ou CNH)",
    hint: "Frente, sem reflexo",
    icon: "IdCard",
    height: 140,
    done: doc,
    onClick: () => setDoc(true)
  }), /*#__PURE__*/React.createElement(PhotoCapture, {
    label: "Selfie com prova de vida",
    hint: "Pisque quando pedirmos",
    icon: "ScanFace",
    height: 140,
    done: selfie,
    onClick: () => setSelfie(true)
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    icon: "ShieldCheck"
  }, "Seus documentos ficam criptografados e servem s\xF3 para verifica\xE7\xE3o.")), 'Enviar para análise', doc && selfie);
  return shell('Forma de pagamento', 'O cartão garante a caução. A chave Pix é usada para estornos.', /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(OptionCard, {
    icon: "CreditCard",
    title: "Cart\xE3o de cr\xE9dito",
    description: "Visa \u2022\u2022\u2022\u2022 4821",
    selected: pay === 'card',
    onClick: () => setPay('card')
  }), /*#__PURE__*/React.createElement(OptionCard, {
    icon: "Wallet",
    title: "Pix + carteira Volti",
    description: "Cau\xE7\xE3o por dep\xF3sito Pix",
    selected: pay === 'pix',
    onClick: () => setPay('pix')
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Chave Pix para estornos",
    placeholder: "CPF, e-mail ou celular",
    icon: "KeyRound",
    defaultValue: "123.456.789-00"
  })), 'Concluir cadastro', true, onDone);
}
window.Onboarding = Onboarding;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Onboarding.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PickScreen.jsx
try { (() => {
const PICK = [{
  id: 1,
  code: 'VT-0458',
  model: 'Volti Flash',
  cat: 'Urbana',
  level: 91,
  range: 20,
  walk: '120 m · 2 min',
  price: 'R$ 0,79/min',
  promo: true
}, {
  id: 2,
  code: 'VT-4821',
  model: 'Volti Flash',
  cat: 'Urbana',
  level: 84,
  range: 18,
  walk: '310 m · 5 min',
  price: 'R$ 0,79/min'
}, {
  id: 3,
  code: 'VT-7190',
  model: 'Volti Cargo',
  cat: 'Com baú · entregas',
  level: 88,
  range: 19,
  walk: '450 m · 6 min',
  price: 'R$ 0,99/min'
}, {
  id: 4,
  code: 'VT-0912',
  model: 'Volti Urban',
  cat: 'Assento duplo',
  level: 66,
  range: 13,
  walk: '600 m · 8 min',
  price: 'R$ 0,89/min'
}, {
  id: 5,
  code: 'VT-6104',
  model: 'Volti Urban',
  cat: 'Assento duplo',
  level: 35,
  range: 7,
  walk: '800 m · 10 min',
  price: 'R$ 0,89/min'
}];
function PickScreen({
  onBack,
  onReserve,
  onMap
}) {
  const {
    IconButton,
    Chip,
    BatteryPill,
    Badge,
    Button,
    SegmentedControl,
    Icon
  } = VDS;
  const [model, setModel] = React.useState('Todas');
  const [sel, setSel] = React.useState(1);
  const list = PICK.filter(p => model === 'Todas' || p.model === model);
  const v = PICK.find(p => p.id === sel);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    label: "Voltar",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, "Escolha sua moto"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, list.length, " dispon\xEDveis perto de voc\xEA")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "Map",
    label: "Ver no mapa",
    onClick: onMap
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '14px 20px 6px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      flexShrink: 0
    }
  }, ['Todas', 'Volti Flash', 'Volti Urban', 'Volti Cargo'].map(m => /*#__PURE__*/React.createElement(Chip, {
    key: m,
    selected: model === m,
    onClick: () => setModel(m)
  }, m))), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      flex: 1,
      overflow: 'auto',
      scrollbarWidth: 'none',
      padding: '8px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, list.map(p => {
    const on = p.id === sel;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      role: "radio",
      "aria-checked": on,
      onClick: () => setSel(p.id),
      style: {
        display: 'flex',
        gap: 14,
        padding: 10,
        borderRadius: 'var(--radius-lg)',
        background: on ? 'var(--brand-soft)' : 'var(--surface-card)',
        border: '1.5px solid ' + (on ? 'var(--brand)' : 'transparent'),
        boxShadow: on ? 'none' : 'var(--shadow-1)',
        cursor: 'pointer',
        transform: on ? 'scale(1.01)' : 'none',
        transition: 'all var(--dur-spring) var(--ease-spring)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 96,
        height: 96,
        borderRadius: 16,
        background: 'var(--surface-media)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'var(--type-caption)',
        color: 'var(--blue-600)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", null, "foto", /*#__PURE__*/React.createElement("br", null), p.model.split(' ')[1])), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-body-strong)'
      }
    }, p.model), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--fw-medium) 11px/1 var(--font-mono)',
        color: 'var(--text-secondary)'
      }
    }, p.code)), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--fw-semibold) 12px/1 var(--font-sans)',
        color: 'var(--warning)'
      }
    }, p.cat), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(BatteryPill, {
      level: p.level,
      range: p.range
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      size: "sm",
      tone: "neutral",
      icon: "Footprints"
    }, p.walk), /*#__PURE__*/React.createElement(Badge, {
      size: "sm",
      tone: "info"
    }, p.price), p.promo && /*#__PURE__*/React.createElement(Badge, {
      size: "sm"
    }, "1\xAA gr\xE1tis"))), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        alignSelf: 'center',
        border: '1.5px solid ' + (on ? 'var(--brand)' : 'var(--border-strong)'),
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: 'var(--brand)',
        animation: 'vt-check-pop 320ms var(--ease-spring) both'
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 40px',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-sheet)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, v && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Clock",
    size: 14
  }), "A moto fica reservada por 10 min, sem custo."), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    icon: "Bookmark",
    disabled: !v,
    onClick: () => onReserve(v)
  }, v ? 'Reservar ' + v.model + ' · ' + v.code : 'Selecione uma moto')));
}
window.PickScreen = PickScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PickScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PlanScreen.jsx
try { (() => {
const PLANS = [{
  id: 'min',
  t: 'Por minuto',
  d: 'Trajetos curtos',
  p: 'R$ 0,79',
  n: '/min'
}, {
  id: 'hora',
  t: 'Por hora',
  d: 'Até 60 min corridos',
  p: 'R$ 29,90',
  n: '/hora'
}, {
  id: 'dia',
  t: 'Diária',
  d: '24 h com a mesma moto',
  p: 'R$ 79,90',
  n: '/dia'
}, {
  id: 'sem',
  t: 'Semanal',
  d: 'Para entregadores · moto fixa',
  p: 'R$ 299',
  n: '/semana'
}, {
  id: 'mes',
  t: 'Mensal',
  d: 'Cobrança recorrente',
  p: 'R$ 990',
  n: '/mês'
}];
function PlanScreen({
  onBack,
  onConfirm
}) {
  const {
    IconButton,
    OptionCard,
    Button,
    Card,
    ListRow,
    Badge
  } = VDS;
  const [plan, setPlan] = React.useState('min');
  const [ins, setIns] = React.useState('basic');
  const insP = ins === 'basic' ? 1.5 : 4.9;
  const row = (l, v, b) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '7px 0',
      font: b ? 'var(--type-body-strong)' : 'var(--type-caption)',
      color: b ? 'var(--text-primary)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, l), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, v));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '58px 20px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    variant: "surface",
    size: 40,
    label: "Voltar",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, "Escolha seu plano"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "VT-4821 \xB7 Volti Flash \xB7 90%"))), /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      flex: 1,
      overflow: 'auto',
      scrollbarWidth: 'none',
      padding: '4px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, PLANS.map(p => /*#__PURE__*/React.createElement(OptionCard, {
    key: p.id,
    title: p.t,
    description: p.d,
    price: p.p,
    priceNote: p.n,
    selected: plan === p.id,
    onClick: () => setPlan(p.id)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      margin: '14px 0 2px'
    }
  }, "Seguro"), /*#__PURE__*/React.createElement(OptionCard, {
    icon: "Shield",
    title: "B\xE1sico",
    badge: "Obrigat\xF3rio",
    description: "Danos a terceiros e acidentes pessoais",
    price: "R$ 1,50",
    priceNote: "/aluguel",
    selected: ins === 'basic',
    onClick: () => setIns('basic')
  }), /*#__PURE__*/React.createElement(OptionCard, {
    icon: "ShieldCheck",
    title: "Completo",
    description: "B\xE1sico + danos \xE0 moto, furto e franquia zero",
    price: "R$ 4,90",
    priceNote: "/aluguel",
    selected: ins === 'full',
    onClick: () => setIns('full')
  }), /*#__PURE__*/React.createElement(Card, {
    variant: "elevated",
    padding: 4,
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    icon: "Ticket",
    iconTone: "sun",
    title: "Cupom ou cr\xE9dito",
    value: "R$ 12,00",
    trailing: "chevron"
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 4,
      padding: '10px 16px'
    }
  }, row('Desbloqueio', 'R$ 1,00'), row('Plano', PLANS.find(p => p.id === plan).p + PLANS.find(p => p.id === plan).n), row('Seguro', 'R$ ' + insP.toFixed(2).replace('.', ',')), row('Caução (pré-autorização, devolvida)', 'R$ 150,00'))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 40px',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    icon: "LockOpen",
    onClick: onConfirm
  }, "Confirmar e destravar")));
}
window.PlanScreen = PlanScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PlanScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ReservedScreen.jsx
try { (() => {
function ReservedScreen({
  vehicle,
  onCancel,
  onScan
}) {
  const {
    VehicleMarker,
    RouteInfoPill,
    ReservationBanner,
    Button,
    IconButton,
    LocationHeader
  } = VDS;
  const [sec, setSec] = React.useState(600);
  React.useEffect(() => {
    const t = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement(MapView, null, /*#__PURE__*/React.createElement(Route, {
    points: "200,500 200,440 250,440 250,360 205,330 160,300 130,300"
  }), /*#__PURE__*/React.createElement(Pin, {
    x: 130,
    y: 300
  }, /*#__PURE__*/React.createElement(VehicleMarker, {
    level: vehicle?.level || 90,
    selected: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 130,
      top: 236,
      transform: 'translateX(-50%)',
      zIndex: 7
    }
  }, /*#__PURE__*/React.createElement(RouteInfoPill, {
    minutes: 5,
    distance: "310 m"
  })), /*#__PURE__*/React.createElement(UserDot, {
    x: 200,
    y: 500,
    heading: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 58,
      left: 20,
      right: 20,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement(LocationHeader, {
    initials: "AL",
    address: "Av. Paulista, 1578"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 40,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "LocateFixed",
    iconColor: "var(--brand)",
    label: "Minha localiza\xE7\xE3o",
    style: {
      alignSelf: 'flex-end'
    }
  }), /*#__PURE__*/React.createElement(ReservationBanner, {
    seconds: sec,
    onCancel: onCancel
  }), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    icon: "ScanQrCode",
    onClick: onScan
  }, "Escanear QR")));
}
window.ReservedScreen = ReservedScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ReservedScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ReturnScreen.jsx
try { (() => {
function ReturnScreen({
  onBack,
  onDone
}) {
  const {
    BottomSheet,
    Button,
    PhotoCapture,
    Alert,
    IconButton,
    ProgressSteps,
    Icon
  } = VDS;
  const [photo, setPhoto] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const finish = () => {
    setConfirming(true);
    setTimeout(onDone, 1800);
  };
  const zone = (x, y, w, h) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 16,
      background: 'rgba(52,194,92,.18)',
      border: '2px solid var(--brand)',
      zIndex: 3
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement(MapView, {
    offsetY: -80
  }, zone(150, 250, 110, 90), zone(40, 120, 80, 70), zone(270, 420, 90, 80), /*#__PURE__*/React.createElement(Pin, {
    x: 205,
    y: 300
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2.5px solid #fff',
      boxShadow: 'var(--shadow-brand)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ParkingSquare",
    size: 18
  }))), /*#__PURE__*/React.createElement(UserDot, {
    x: 205,
    y: 330,
    heading: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 58,
      left: 20,
      right: 20,
      zIndex: 20,
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    label: "Voltar",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '10px 14px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, "Ponto de devolu\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "P\xE7. Oswaldo Cruz \xB7 voc\xEA est\xE1 dentro"))), /*#__PURE__*/React.createElement(BottomSheet, {
    padding: "10px 20px 34px"
  }, /*#__PURE__*/React.createElement(ProgressSteps, {
    total: 2,
    current: photo ? 1 : 0,
    label: photo ? 'Passo 2 de 2 · Travar' : 'Passo 1 de 2 · Foto',
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)',
      marginBottom: 12
    }
  }, "Fotografe a moto estacionada"), /*#__PURE__*/React.createElement(PhotoCapture, {
    label: "Tirar foto",
    hint: "Mostre a moto inteira e a cal\xE7ada livre",
    height: 130,
    done: photo,
    onClick: () => setPhoto(true)
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: confirming ? 'info' : 'success',
    icon: confirming ? 'RefreshCw' : 'MapPin',
    style: {
      margin: '12px 0 14px'
    }
  }, confirming ? 'Aguardando o rastreador confirmar moto parada e travada…' : 'Fora dos pontos verdes não é possível encerrar sem taxa.'), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    variant: "dark",
    icon: "Lock",
    disabled: !photo || confirming,
    onClick: finish
  }, confirming ? 'Confirmando…' : 'Travar e encerrar')));
}
window.ReturnScreen = ReturnScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ReturnScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/RideScreen.jsx
try { (() => {
function RideScreen({
  onEnd
}) {
  const {
    BottomSheet,
    Button,
    BatteryPill,
    Dialog,
    Icon,
    Badge,
    Alert,
    IconButton,
    Chip
  } = VDS;
  const [sec, setSec] = React.useState(734);
  const [paused, setPaused] = React.useState(false);
  const [zone, setZone] = React.useState(false);
  const [fall, setFall] = React.useState(false);
  const [sos, setSos] = React.useState(false);
  const [report, setReport] = React.useState(false);
  React.useEffect(() => {
    const t = setInterval(() => !paused && setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0'),
    ss = String(sec % 60).padStart(2, '0');
  const cost = (1 + sec / 60 * 0.79).toFixed(2).replace('.', ',');
  const speed = paused ? 0 : zone ? 20 : 24,
    limit = zone ? 20 : 32;
  const stat = (l, v) => /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)',
      marginTop: 2
    }
  }, v));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement(MapView, {
    offsetY: -120
  }, /*#__PURE__*/React.createElement(Route, {
    points: "200,420 200,360 260,330 300,250 300,150",
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement(UserDot, {
    x: 200,
    y: 420,
    heading: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 58,
      left: 20,
      right: 20,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-1)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 34px/1 var(--font-sans)',
      letterSpacing: '-.03em'
    }
  }, speed), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "km/h", /*#__PURE__*/React.createElement("br", null), "limite ", limit), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(BatteryPill, {
    level: 84,
    range: 17
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSos(true),
    "aria-label": "SOS",
    style: {
      width: 64,
      borderRadius: 'var(--radius-lg)',
      border: 0,
      background: 'var(--danger)',
      color: '#fff',
      font: 'var(--fw-black) 15px/1 var(--font-sans)',
      boxShadow: 'var(--shadow-coral)',
      cursor: 'pointer'
    }
  }, "SOS")), zone && /*#__PURE__*/React.createElement(Alert, {
    tone: "warning",
    solid: true,
    icon: "Gauge",
    title: "Ciclovia \xB7 limite 20 km/h"
  }, "A moto reduziu a velocidade sozinha.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 20,
      bottom: 330,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    icon: "Gauge",
    selected: zone,
    onClick: () => setZone(!zone),
    style: {
      boxShadow: 'var(--shadow-1)'
    }
  }, "Simular zona"), /*#__PURE__*/React.createElement(Chip, {
    icon: "Activity",
    onClick: () => setFall(true),
    style: {
      boxShadow: 'var(--shadow-1)'
    }
  }, "Simular queda")), /*#__PURE__*/React.createElement(BottomSheet, {
    padding: "10px 20px 34px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, paused ? 'Moto travada · pausa' : 'Em corrida', " \xB7 Por minuto \xB7 Seguro b\xE1sico"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-timer)',
      marginTop: 4
    }
  }, mm, ":", ss)), /*#__PURE__*/React.createElement(Badge, {
    tone: paused ? 'warning' : 'success'
  }, paused ? 'R$ 0,20/min' : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 3,
      background: 'currentColor',
      animation: 'vt-live 1.4s ease-in-out infinite'
    }
  }), "Ao vivo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      margin: '16px 0 12px',
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunken)'
    }
  }, stat('Tarifa', paused ? 'R$ 0,20/min' : 'R$ 0,79/min'), stat('Custo acumulado', 'R$ ' + cost), stat('Bateria', '84%')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    icon: "CircleAlert",
    onClick: () => setReport(true)
  }, "Reportar problema"), /*#__PURE__*/React.createElement(Chip, {
    icon: "Share2"
  }, "Compartilhar trajeto")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    icon: paused ? 'CirclePlay' : 'Pause',
    style: {
      flex: 1
    },
    onClick: () => setPaused(!paused)
  }, paused ? 'Destravar' : 'Pausar'), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "dark",
    style: {
      flex: 1.3
    },
    onClick: onEnd
  }, "Devolver moto"))), /*#__PURE__*/React.createElement(Dialog, {
    open: fall,
    onClose: () => setFall(false),
    title: "Voc\xEA est\xE1 bem?",
    icon: /*#__PURE__*/React.createElement("span", {
      style: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'var(--coral-50)',
        color: 'var(--coral-600)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Activity",
      size: 26
    })),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      onClick: () => setFall(false)
    }, "Estou bem"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      fullWidth: true,
      onClick: () => {
        setFall(false);
        setSos(true);
      }
    }, "Preciso de ajuda"))
  }, "Detectamos uma poss\xEDvel queda. Sem resposta em ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "30 s"), ", acionamos o suporte."), /*#__PURE__*/React.createElement(Dialog, {
    open: sos,
    onClose: () => setSos(false),
    title: "SOS",
    icon: /*#__PURE__*/React.createElement("span", {
      style: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'var(--danger)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "PhoneCall",
      size: 26
    })),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      fullWidth: true,
      icon: "PhoneCall",
      onClick: () => setSos(false)
    }, "Ligar para o suporte"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      fullWidth: true,
      icon: "Share2",
      onClick: () => setSos(false)
    }, "Enviar localiza\xE7\xE3o a um contato"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      fullWidth: true,
      onClick: () => setSos(false)
    }, "Cancelar"))
  }, "Sua localiza\xE7\xE3o em tempo real \xE9 compartilhada enquanto o SOS estiver ativo."), /*#__PURE__*/React.createElement(Dialog, {
    open: report,
    onClose: () => setReport(false),
    title: "Qual o problema?",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      onClick: () => setReport(false)
    }, "Trocar de moto sem nova taxa"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      fullWidth: true,
      onClick: () => setReport(false)
    }, "Cancelar"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, ['Pneu', 'Freio', 'Bateria', 'Luzes', 'Outro'].map((p, i) => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    selected: i === 1
  }, p)))));
}
window.RideScreen = RideScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/RideScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ScanScreen.jsx
try { (() => {
function ScanScreen({
  onBack,
  onUnlocked
}) {
  const {
    IconButton,
    Button,
    Icon
  } = VDS;
  const [state, setState] = React.useState('idle');
  const scan = () => {
    if (state !== 'idle') return;
    setState('unlocking');
    setTimeout(onUnlocked, 900);
  };
  const c = {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: 'var(--green-400)',
    borderStyle: 'solid',
    borderWidth: 0
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: '#0d0f10',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '58px 20px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "X",
    variant: "dark",
    label: "Fechar",
    onClick: onBack,
    style: {
      background: 'rgba(255,255,255,.12)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)'
    }
  }, "Escanear QR"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "Flashlight",
    variant: "dark",
    label: "Lanterna",
    style: {
      background: 'rgba(255,255,255,.12)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: scan,
    style: {
      animation: state === 'idle' ? 'vt-breathe 2.4s var(--ease-in-out) infinite' : 'none',
      overflow: 'hidden',
      position: 'relative',
      width: 250,
      height: 250,
      border: 0,
      borderRadius: 28,
      background: 'rgba(255,255,255,.04)',
      cursor: 'pointer',
      color: 'rgba(255,255,255,.5)',
      font: 'var(--type-caption)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...c,
      top: 0,
      left: 0,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 24
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...c,
      top: 0,
      right: 0,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 24
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...c,
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 24
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...c,
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 24
    }
  }), state === 'idle' && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      height: 3,
      borderRadius: 2,
      background: 'var(--green-400)',
      boxShadow: '0 0 18px 5px rgba(85,204,121,.5)',
      animation: 'vt-scan-line 2.4s var(--ease-in-out) infinite'
    }
  }), state === 'idle' ? 'visor da câmera — toque para simular' : /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      color: '#fff',
      font: 'var(--type-label)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--brand)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-brand)',
      animation: 'vt-check-pop 520ms var(--ease-spring) both'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      background: 'var(--brand)',
      animation: 'vt-pulse-ring 1s var(--ease-out) 2'
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "LockOpen",
    size: 26,
    style: {
      position: 'relative'
    }
  })), "Moto VT-4821 encontrada")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-heading)'
    }
  }, "Aponte para o QR no guid\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'rgba(255,255,255,.6)',
      marginTop: 6
    }
  }, "Ou digite o n\xFAmero da moto."))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    icon: "Keyboard",
    onClick: scan,
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'rgba(255,255,255,.3)'
    }
  }, "Digitar n\xFAmero da moto"));
}
window.ScanScreen = ScanScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ScanScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SummaryScreen.jsx
try { (() => {
function SummaryScreen({
  onDone
}) {
  const {
    Button,
    Card,
    ListRow,
    Icon
  } = VDS;
  const [stars, setStars] = React.useState(0);
  const row = (l, v, b) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '9px 0',
      font: b ? 'var(--type-heading)' : 'var(--type-body)',
      color: b ? 'var(--text-primary)' : 'var(--text-secondary)',
      borderTop: b ? '1px solid var(--border-subtle)' : 0
    }
  }, /*#__PURE__*/React.createElement("span", null, l), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: b ? 700 : 600
    }
  }, v));
  return /*#__PURE__*/React.createElement("div", {
    className: "vt-stagger",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column',
      padding: '64px 20px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-brand)',
      flexShrink: 0,
      animation: 'vt-check-pop 600ms var(--ease-spring) 300ms both'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      background: 'var(--brand)',
      animation: 'vt-pulse-ring 1.1s var(--ease-out) 700ms 2 both'
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 28,
    strokeWidth: 3,
    style: {
      position: 'relative'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Corrida finalizada"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)'
    }
  }, "Moto travada. Cau\xE7\xE3o liberada."))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 110,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      position: 'relative',
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(MapView, {
    offsetY: -120
  }, /*#__PURE__*/React.createElement(Route, {
    points: "200,420 200,360 260,330 300,250 300,150",
    color: "var(--brand)"
  }))), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginTop: 12,
      padding: '6px 18px'
    }
  }, row('Duração', '12 min 14 s'), row('Desbloqueio', 'R$ 1,00'), row('Minutos (12 × R$ 0,79)', 'R$ 9,48'), row('Seguro básico', 'R$ 1,50'), row('Cupom', '− R$ 2,00'), row('Total', 'R$ 9,98', true)), /*#__PURE__*/React.createElement(Card, {
    variant: "elevated",
    padding: 4,
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(ListRow, {
    icon: "Receipt",
    iconTone: "brand",
    title: "Recibo e nota fiscal",
    subtitle: "Visa \u2022\u2022\u2022\u2022 4821",
    trailing: "chevron"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 18,
      font: 'var(--type-label)'
    }
  }, "Como foi a moto e a viagem?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 6,
      marginTop: 6
    }
  }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setStars(n),
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      padding: 4,
      color: n <= stars ? 'var(--sun-400)' : 'var(--ink-300)',
      transition: 'color var(--dur-base)',
      animation: n <= stars ? 'vt-check-pop 380ms var(--ease-spring) ' + (n - 1) * 50 + 'ms both' : 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Star",
    size: 28,
    style: {
      fill: n <= stars ? 'var(--sun-400)' : 'none'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    onClick: onDone
  }, "Concluir"));
}
window.SummaryScreen = SummaryScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SummaryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/deck-stage.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* ═══ THIS PROJECT USES DESIGN COMPONENTS (.dc.html) ═══
 * Reference this stage from your <x-dc> template as an import — NEVER as a
 * raw <deck-stage> tag plus a <script src> (that hides the whole deck until
 * the stream finishes):
 *
 *   <x-import component-from-global-scope="deck-stage" from="./deck-stage.js"
 *             width="1920" height="1080" hint-size="100%,100%">
 *     <section data-label="Title" style="...">…</section>
 *     <section data-label="Agenda" style="...">…</section>
 *   </x-import>
 *
 * Slides are inline-styled <section> siblings; do not add a stylesheet or a
 * deck-stage:not(:defined) rule. The plain-HTML "Usage" block in the comment
 * below does NOT apply to .dc.html templates.
 */
/* BEGIN USAGE */
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→ and ↑/↓, PgUp/PgDn, Space, Home/End,
 *      number keys.
 *      On touch devices, tapping the left/right half of the stage goes
 *      prev/next — taps on links, buttons and other interactive slide
 *      content are left alone.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on
 *      idle; hovering or focusing its controls pins it visible until the
 *      pointer/focus leaves. While presenting it is pointer-summoned only:
 *      mouse movement (or hover/focus) shows it, slide changes never do.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate — the clicked slide becomes the
 *      selected (highlighted) slide; shift-click selects a range and
 *      cmd/ctrl-click toggles slides in and out of the selection
 *      (Escape collapses it back to the current slide); ↑/↓ with a
 *      thumbnail focused to step between slides; Delete/Backspace with a
 *      thumbnail focused to delete the selection (one confirm dialog,
 *      one undoable operation); drag to reorder (dragging collapses a
 *      multi-selection); right-click for
 *      Skip / Move up / Move down / Duplicate / Delete — over a
 *      multi-selection the menu offers "Delete N slides". Drag the rail's right edge to resize;
 *      width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      They also carry no rail number and are excluded from the overlay's
 *      slide count: the remaining slides are numbered contiguously
 *      (Keynote-style), and a skipped CURRENT slide (reachable by rail
 *      click or deep link, never by prev/next) shows '–' as its position.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, on narrow viewports
 *      (≤640px), and via the `no-rail` attribute. Rail mutations dispatch
 *      a `dc-op` CustomEvent on the element (see docs/dc-ops.md) and do
 *      NOT touch the DOM: the host applies the op and re-renders;
 *      structural rail input is locked until the host posts
 *      {__dc_op_ack: true, applied}.
 *  (h) typographic defaults — a zero-specificity stylesheet injected into
 *      the document gives headings `text-wrap: balance` and body text
 *      (p, li, blockquote, figcaption) `text-wrap: pretty`, so slides
 *      avoid widowed/orphaned words by default. Any text-wrap declaration
 *      you author on those elements wins over these defaults.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 *
 * Speaker notes stay in sync because the component posts {slideIndexChanged: N}
 * to the parent — just include the #speaker-notes script tag if asked for notes.
 *
 * Authoring guidance:
 *   - Write slide bodies as static HTML inside <deck-stage>, with sizing via
 *     CSS custom properties in a <style> block rather than JS constants.
 *     Static slide markup is what lets the user click a heading in edit mode
 *     and retype it directly; a slide rendered through <script type="text/babel">,
 *     React, or a loop over a JS array has to round-trip every tweak through a
 *     chat message instead. Reach for script-generated slides only when the
 *     content genuinely needs interactive behaviour static HTML can't express.
 *   - Do NOT set position/inset/width/height on the slide <section> elements —
 *     the component absolutely positions every slotted child for you.
 *   - Entrance animations: make the visible end-state the base style and
 *     animate *from* hidden, so print and reduced-motion show content.
 *     Gate the animation on [data-deck-active] and the motion query, e.g.
 *     `@media (prefers-reduced-motion:no-preference){ [data-deck-active] .x{animation:fade-in .5s both} }`.
 *     Avoid infinite decorative loops on slide content.
 */
/* END USAGE */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const FINE_POINTER_MQ = matchMedia('(hover: hover) and (pointer: fine)');
  const NARROW_MQ = matchMedia('(max-width: 640px)');
  // Slide-authored controls that should keep a tap instead of it navigating.
  const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, label, video[controls], audio[controls], [role="button"], [onclick], [tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
      /* Slide edge on the black stage. Dark decks override the canvas
       * fill toward the stage's own black, leaving nothing to mark where
       * the slide ends — the faint white ring keeps the boundary legible
       * there while disappearing into the white of light decks. A
       * box-shadow, not outline/border: it follows any canvas rounding
       * and adds no layout size. */
      box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.12);
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    @media (max-width: 640px) {
      .rail, .rail-resize { display: none; }
    }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-selected] .num { color: #fff; }
    .thumb[data-selected] .frame {
      outline-color: rgba(217,119,87,0.65);
      box-shadow: 0 0 0 4px rgba(217,119,87,0.18);
    }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame {
      outline-color: #D97757;
      box-shadow: 0 0 0 4px rgba(217,119,87,0.25);
    }
    /* While dragging, the thumb itself is the drag visual (the native drag
       image is suppressed in dragstart so the snapshot can't wander off the
       rail horizontally): elevate it rather than dim it, and let hit-testing
       ignore it so dragover reaches the sibling thumb under the pointer
       instead of the moving element itself. */
    .thumb[data-dragging] { opacity: 0.9; z-index: 30; pointer-events: none; }
    .thumb[data-dragging] .frame {
      outline-color: rgba(255,255,255,0.5);
      box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that _syncPrintPageRule appends
       to the document (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        /* Size containment: slotted content that overflows the design box
         * (an image-slot's aspect-ratio-derived width, say) must not count
         * toward Chromium's print document width — without this, an
         * abs-positioned child past the page edge shrinks the whole PDF
         * to fit (~75%). Containment is safe here because the definite
         * width/height above size the slide regardless of content.
         * (Absorbed from PR #2619 with its owner's agreement.) */
        contain: size !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      // Explicit multi-selection (slide elements). Empty means the
      // selection is implicitly the current slide, so Delete always has
      // a well-defined target while the rail has focus.
      this._selected = new Set();
      this._selAnchor = null;
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      // Overlay pinning: while the pointer is over the controls toolbar or
      // a control has keyboard focus, the idle-hide timeout must not
      // dismiss it (a pointer parked ON the controls doesn't generate
      // mousemove, so without the pin the toolbar vanishes under the
      // user's cursor after OVERLAY_HIDE_MS). Read by _flashOverlay's
      // hide timeout; cleared by mouseleave/focusout, which resume the
      // normal idle fade.
      this._overlayHover = false;
      this._overlayFocus = false;
      // Capability marker for the host's injected guest bundle. Copies
      // WITHOUT _navArrowsUpDown are frozen per-project builds that
      // predate native ArrowUp/ArrowDown slide nav — the bundle translates
      // Up/Down to Right/Left for those (installDeckArrowKeyTranslator in
      // apps/web/src/guest/edit-mode.ts) and must stand down here or every
      // press would advance twice. A marker, not a version number, so a
      // future capability can add its own independent probe.
      this._navArrowsUpDown = true;
      // Same contract for rail Delete/Backspace: copies WITHOUT
      // _railDeleteKey predate the thumbs' own Delete/Backspace binding,
      // and the bundle opens the delete confirm for them
      // (installDeckRailDeleteFallback in apps/web/src/guest/edit-mode.ts).
      // Current builds consume the key at the thumb (stopPropagation), so
      // the marker is belt-and-braces — it keeps the fallback standing
      // down even if a future build lets the key bubble past the thumb.
      this._railDeleteKey = true;
      // Same contract for skip-aware numbering: copies WITHOUT
      // _railSkipNumbers number every thumb 1..N and count skipped slides
      // in the overlay total — the bundle rewrites both for those
      // (installDeckSkipNumberingFallback in apps/web/src/guest/edit-mode.ts).
      // Here the component renumbers natively, so the fallback stands down.
      this._railSkipNumbers = true;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTap = this._onTap.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      this._ensurePrintSizingMeta();
      this._ensureTextWrapDefaults();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      this.addEventListener('click', this._onTap);
      // Print lays every slide out as its own page, so [data-deck-active]-
      // gated entrance styles need the attribute on every slide (not just
      // the current one) or their content prints at the hidden base style.
      // The transient freeze style lands BEFORE the attributes so any
      // attribute-keyed transition fires at 0s (changing transition-
      // duration after a transition has started doesn't affect it).
      this._onBeforePrint = () => {
        this._syncPrintPageRule();
        // Self-heal: a departed doc-page may have removed the page-global
        // print-sizing meta this deck deferred to at connect time.
        this._ensurePrintSizingMeta();
        if (this._freezeStyle) this._freezeStyle.remove();
        this._freezeStyle = document.createElement('style');
        this._freezeStyle.textContent = '*,*::before,*::after{transition-duration:0s !important}';
        document.head.appendChild(this._freezeStyle);
        this._slides.forEach(s => s.setAttribute('data-deck-active', ''));
      };
      this._onAfterPrint = () => {
        this._applyIndex({
          showOverlay: false,
          broadcast: false
        });
        if (this._freezeStyle) {
          this._freezeStyle.remove();
          this._freezeStyle = null;
        }
      };
      window.addEventListener('beforeprint', this._onBeforePrint);
      window.addEventListener('afterprint', this._onAfterPrint);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // Unconditional cap — rAF can be suspended in a hidden iframe, which
      // would strand the one inside the rAF callback.
      setTimeout(reveal, 2000);
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (three per view — cur/prev/next).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav doesn't trigger spurious
      // refreshes — except data-deck-skip, which now arrives from the host
      // re-render and is what updates the rail badge, print bookkeeping,
      // and deckSkipped re-broadcast. Also ignore data-dc-tpl /
      // data-om-slide-id — host-reserved bookkeeping stamps (the host's
      // ATTR_RESERVED guard bounds them the same way) that structural
      // edits renumber/re-mint on slides whose content didn't change;
      // re-cloning on that churn is what made a slide move flash its
      // thumbnails.
      const OWN_ATTRS = /^data-(deck-(?!skip$)|screen-label$|om-(validate|slide-id)$|dc-tpl$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          // Skip/unskip is handled below without re-cloning (the badge sits
          // on the thumb wrapper, not the clone) — don't mark the slide
          // dirty for an attr change whose only visible effect is the badge.
          if (n && this._slideSet && this._slideSet.has(n) && !(r.type === 'attributes' && r.attributeName === 'data-deck-skip')) {
            this._liveDirty.add(n);
          }
          // Host-driven skip toggle: sync the rail badge + print + presenter
          // skipped-list the way _toggleSkip used to do locally.
          if (r.type === 'attributes' && r.attributeName === 'data-deck-skip' && n && this._slideSet && this._slideSet.has(n)) {
            const i = this._slides.indexOf(n);
            if (this._thumbs && this._thumbs[i]) {
              if (n.hasAttribute('data-deck-skip')) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
            }
            this._markLastVisible();
            this._renumberRail();
            this._syncCount();
            try {
              window.postMessage({
                slideIndexChanged: this._index,
                deckTotal: this._slides.length,
                deckSkipped: this._skippedIndices()
              }, '*');
            } catch (e) {}
          }
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      // Stylesheets that finish loading AFTER the snapshot below never
      // reach the thumbs on their own: a still-pending <link> contributes
      // nothing to document.styleSheets, and nothing re-reads it on load,
      // so the live slides restyle while every clone keeps the stale
      // sheet. dc-runtime's helmet mounts design-system <link>s at render
      // time, so a deck-stage that connects first snapshots before that
      // CSS exists. Funnel late arrivals into the same debounced resync:
      // hook load/error on every current <link>, and watch <head> for
      // links and styles mounted or rewritten later. Deliberately not
      // rAF- or fonts.ready-driven — rAF is throttled/suspended in hidden
      // iframes (thumbnail/presenter contexts), and a font-file load
      // doesn't change cssRules, so it needs no resync.
      this._hookedLinks = [];
      this._hookSheetLoad = el => {
        if (!el.matches || !el.matches('link[rel~="stylesheet" i]')) return;
        if (this._hookedLinks.indexOf(el) !== -1) return;
        this._hookedLinks.push(el);
        el.addEventListener('load', this._onTweakChange);
        el.addEventListener('error', this._onTweakChange);
      };
      document.querySelectorAll('link[rel~="stylesheet" i]').forEach(this._hookSheetLoad);
      this._headObserver = new MutationObserver(records => {
        let resync = false;
        for (const r of records) {
          if (r.type === 'characterData') {
            // Only <style> text is CSS — a ticking <title> shouldn't
            // wake the resync forever.
            const p = r.target.parentNode;
            if (p && p.nodeName === 'STYLE') resync = true;
            continue;
          }
          if (r.type === 'attributes') {
            // A late rel/href rewrite turns an inert <link> into a
            // stylesheet (hook it; its load fires even on cache hits);
            // a media/disabled flip changes effective rules with no
            // event. Resync only if this link is or ever was a
            // stylesheet — favicon/preload/canonical href churn isn't
            // a resync.
            if (r.target.nodeName === 'LINK') {
              this._hookSheetLoad(r.target);
              if (this._hookedLinks.indexOf(r.target) !== -1) resync = true;
            } else if (r.target.nodeName === 'STYLE') resync = true;
            continue;
          }
          // childList: only links and styles carry CSS. A new <link> has
          // no rules until it loads — hook it rather than resync now; a
          // <style> mount/unmount or text-node swap takes effect
          // immediately. _freezeStyle (our beforeprint helper) is skipped
          // on add only — no removal-side guard: _onAfterPrint nulls the
          // ref before the observer fires, so that check would be dead;
          // the one debounced no-op resync per print is harmless.
          if (r.target.nodeName === 'STYLE') resync = true;
          for (const n of r.addedNodes) {
            if (n.nodeName === 'LINK') this._hookSheetLoad(n);else if (n.nodeName === 'STYLE' && n !== this._freezeStyle) resync = true;
          }
          for (const n of r.removedNodes) {
            if (n.nodeName === 'LINK') {
              const hi = this._hookedLinks.indexOf(n);
              if (hi !== -1) {
                this._hookedLinks.splice(hi, 1);
                n.removeEventListener('load', this._onTweakChange);
                n.removeEventListener('error', this._onTweakChange);
                resync = true;
              }
            } else if (n.nodeName === 'STYLE') resync = true;
          }
        }
        if (resync) this._onTweakChange();
      });
      this._headObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['rel', 'href', 'media', 'disabled']
      });
      this._snapshotAuthorCss();
      // Re-snapshot once any still-loading stylesheet settles — it throws on
      // .cssRules above and silently contributes '' → unstyled thumbs on a
      // cold mount. {once:true}; routed through the debounced handler.
      document.querySelectorAll('link[rel~="stylesheet"]').forEach(l => {
        try {
          if (l.sheet && l.sheet.cssRules) return;
        } catch (e) {}
        l.addEventListener('load', this._onTweakChange, {
          once: true
        });
        l.addEventListener('error', this._onTweakChange, {
          once: true
        });
      });
      if (document.fonts) document.fonts.ready.then(this._onTweakChange, this._onTweakChange);
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      // A disconnect mid-drag never gets a dragend, so the document-level
      // drag tracker must be torn down here like every other global hook.
      this._stopDragTrack();
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      window.removeEventListener('beforeprint', this._onBeforePrint);
      window.removeEventListener('afterprint', this._onAfterPrint);
      if (this._freezeStyle) {
        this._freezeStyle.remove();
        this._freezeStyle = null;
      }
      this.removeEventListener('click', this._onTap);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._headObserver) this._headObserver.disconnect();
      (this._hookedLinks || []).forEach(l => {
        l.removeEventListener('load', this._onTweakChange);
        l.removeEventListener('error', this._onTweakChange);
      });
      this._hookedLinks = [];
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
      // Drop the text-wrap defaults when the last deck-stage leaves, so a
      // deleted deck's typography can't restyle whatever replaces it.
      // (#deck-stage-print-page keeps its existing keep-forever lifecycle.)
      if (!document.querySelector('deck-stage')) {
        const tw = document.getElementById('deck-stage-text-wrap');
        if (tw) tw.remove();
        const ps = document.getElementById('deck-stage-print-sizing');
        if (ps) ps.remove();
      }
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-omelette-chrome', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Pin the controls while the user is interacting with them —
      // hovering, or keyboard focus on a control. The hidden overlay is
      // pointer-events:none, so these only ever engage while it's already
      // visible. 'pointer' source: these are user-interaction paths, so
      // they may show/refresh the overlay even while presenting (see
      // _flashOverlay).
      overlay.addEventListener('mouseenter', () => {
        this._overlayHover = true;
        this._flashOverlay('pointer');
      });
      overlay.addEventListener('mouseleave', () => {
        const hadPin = this._overlayHover;
        this._overlayHover = false;
        // Resume the idle fade — never summon. Without the guard, a
        // mouseleave that fires because the overlay was force-hidden
        // (presenting entry flips it to pointer-events:none under the
        // cursor) would pop the controls right back up.
        if (hadPin || overlay.hasAttribute('data-visible')) this._flashOverlay('pointer');
      });
      overlay.addEventListener('focusin', e => {
        // Keyboard-origin focus only (:focus-visible): a mouse click also
        // focuses the clicked button, and pinning on that would hold the
        // controls open indefinitely after a single click — the hover pin
        // already covers the mouse case. Engines without :focus-visible
        // fall back to pinning on any focus (the safe direction).
        var kb = true;
        try {
          var t = e.target;
          kb = !(t && t.matches && !t.matches(':focus-visible'));
        } catch (err) {
          kb = true;
        }
        if (!kb) return;
        this._overlayFocus = true;
        this._flashOverlay('pointer');
      });
      overlay.addEventListener('focusout', e => {
        // Only unpin when focus truly left the toolbar — tabbing between
        // its buttons stays pinned. relatedTarget is null when focus
        // leaves the document entirely; treat that as leaving.
        if (e.relatedTarget && overlay.contains(e.relatedTarget)) return;
        const hadPin = this._overlayFocus;
        this._overlayFocus = false;
        // Resume-the-fade only (see mouseleave): a click-focused button
        // losing focus to a later stage click must not summon the
        // controls mid-presentation.
        if (hadPin || overlay.hasAttribute('data-visible')) this._flashOverlay('pointer');
      });

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-omelette-chrome', '');
      // Edit mode hooks wheel to pan the canvas; this opts the rail's own
      // scrollview out so thumbnails stay scrollable while editing.
      rail.setAttribute('data-dc-wheel-passthru', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-omelette-chrome', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <button type="button" data-act="duplicate">Duplicate slide</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        const list = this._menuIndices;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'duplicate') this._duplicateSlide(i);else if (act === 'delete') this._openConfirm(list && list.length ? list : [i]);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-omelette-chrome', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-omelette-chrome', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) {
          this._closeConfirm();
          this._focusCurrentThumb();
        }
      });
      confirm.querySelector('.cancel').addEventListener('click', () => {
        this._closeConfirm();
        this._focusCurrentThumb();
      });
      confirm.querySelector('.danger').addEventListener('click', () => {
        // Re-resolve at click time — the elements are the user's actual
        // selection; their indices may have shifted since confirm-open.
        const list = (this._confirmEls || []).map(el => this._slides.indexOf(el)).filter(i => i >= 0);
        this._closeConfirm();
        this._deleteSlides(list);
        this._focusCurrentThumb();
      });
      this._root.append(style, rail, resize, stage, overlay, menu, confirm);
      this._canvas = canvas;
      this._stage = stage;
      this._slot = slot;
      this._overlay = overlay;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. (Re-)append so any author @page landing later in
     *  source order can't reintroduce a margin and push each slide onto
     *  two sheets; called again from beforeprint. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      (document.body || document.head).appendChild(tag);
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' +
      // Jump authored animations/transitions to their end state so print
      // never captures mid-entrance — pairs with the beforeprint handler
      // in connectedCallback that sets data-deck-active on every slide.
      '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Announces the deck's print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] content "default-landscape" — a
     *  deck prints one slide per page on the user's paper size, landscape.
     *  The export path probes the meta to decide what true paper size to
     *  inject at print time (the @page px rule above stays as the
     *  standalone-print fallback; an injected later rule overrides it).
     *  Never overrides an authored meta or another component's; removed
     *  when the last deck-stage leaves. data-omelette-injected keeps it
     *  out of serialized source. */
    _ensurePrintSizingMeta() {
      if (document.querySelector('meta[name="omelette-print-sizing"]')) return;
      const tag = document.createElement('meta');
      tag.id = 'deck-stage-print-sizing';
      tag.name = 'omelette-print-sizing';
      tag.content = 'default-landscape';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** Typographic defaults for slide text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins. Lives in the document,
     *  not the shadow root, for two reasons: document rules reach the
     *  slotted (light DOM) slides, and _snapshotAuthorCss copies document
     *  stylesheets into each thumbnail's shadow root, so the thumbs wrap
     *  the same way — a deck-stage-scoped selector would match nothing
     *  there. data-omelette-injected marks the tag for the host editor
     *  to strip at serialize, so it is never written back as authored
     *  source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('deck-stage-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'deck-stage-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }
    _onSlotChange() {
      // Self-mutate path already reconciled synchronously and emitted
      // slidechange; skip the async slotchange it caused.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      // Primary lock-clear is the host's __deck_rail_ack; this clears on a
      // dropped ack so the rail can't stay dead.
      this._railLock = false;
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
      // The deck just changed under any open rail surface — an open
      // confirm or menu is a question about the OLD deck (its labels and
      // counts may now lie), so close them rather than let a stale
      // answer fire. The element-held selection re-resolves, but the
      // user should re-read what they're deleting.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        this._closeConfirm();
        // The dialog held focus (danger button); hand it back to the rail.
        this._focusCurrentThumb(true);
      }
      if (this._menu && this._menu.hasAttribute('data-open')) this._closeMenu();
      // Editor-mode deletes rebuild the rail through here; a confirmed
      // delete that started from the keyboard still owes focus to the
      // (new) current thumb.
      if (this._pendingRailRefocus) this._focusCurrentThumb(true);
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      // Selection is element-keyed: drop entries whose slide is gone
      // (deleted, or replaced wholesale by a host re-render).
      if (this._selected && this._selected.size) {
        this._selected.forEach(s => {
          if (!this._slideSet.has(s)) this._selected.delete(s);
        });
      }
      if (this._selAnchor && !this._slideSet.has(this._selAnchor)) this._selAnchor = null;
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._syncCount();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      // Per-slide data-speaker-notes is authoritative when present (attrs
      // travel with the element on reorder/dup/delete); a slide without
      // the attr falls through to the legacy #speaker-notes JSON array
      // PER SLIDE so a single attr on a JSON-authored deck doesn't blank
      // the rest.
      const tag = document.getElementById('speaker-notes');
      let json = null;
      if (tag) try {
        const p = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(p)) json = p;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
      }
      this._notes = this._slides.map((s, i) => {
        const a = s.getAttribute('data-speaker-notes');
        return a !== null ? a : json && typeof json[i] === 'string' ? json[i] : '';
      });
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      this._syncCount();
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay(source) {
      // Host posts __omelette_presenting while in fullscreen/tab
      // presentation mode. While presenting, the overlay is
      // pointer-summoned only: it appears on mouse movement and while the
      // user hovers/focuses the controls (source 'pointer'), but never
      // flashes on slide changes or nav-key presses (the default 'auto'
      // source) — a keyboard-driven advance must not blink chrome at the
      // audience. Outside presenting, both sources flash as before.
      if (!this._overlay) return;
      if (this._presenting && source !== 'pointer') return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        // Pinned by hover or focus on the controls — keep them up. The
        // matching mouseleave/focusout re-flashes, so the idle fade
        // resumes from that moment.
        if (this._overlayHover || this._overlayFocus) return;
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode || NARROW_MQ.matches) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
      // Crossing the narrow-viewport breakpoint reveals the rail — rerun the
      // thumbnail scale the same way _setRailWidth does.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle. 'pointer'
      // source: mouse movement summons the controls even while presenting.
      this._flashOverlay('pointer');
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        // Unchanged value → idempotent re-delivery (the guest bundle
        // re-posts when a deck mounts mid-presentation, and host + bundle
        // can both deliver at entry). Skip the resets: re-running the
        // entry work on every delivery would dismiss the pointer-summoned
        // overlay under a hovering cursor and close menus on every slide
        // change. Mirrors the preview_mode branch's unchanged-value guard
        // below.
        if (d.__omelette_presenting !== !!this._presenting) {
          this._presenting = d.__omelette_presenting;
          // A presenting transition invalidates interaction pins: carried
          // across the flip, a stale pin would hold the first summoned
          // overlay open with no pointer anywhere near it. Hide on BOTH
          // transitions: entry cleans the audience's screen, and on exit a
          // pin-skipped hide timeout may have left data-visible set with
          // no timer armed — without this, the footer would linger in the
          // editor until the next mousemove. The next interaction
          // re-summons it either way.
          this._overlayHover = false;
          this._overlayFocus = false;
          if (this._overlay) {
            this._overlay.removeAttribute('data-visible');
            if (this._hideTimer) clearTimeout(this._hideTimer);
          }
          this._syncRailHidden();
          this._closeMenu();
          this._closeConfirm();
          this._fit();
          this._scaleThumbs();
        }
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host has processed a dc-op; rail input is safe again. Not tied to
      // slotchange — setAttr and refusal don't fire one. On refusal,
      // revert the optimistic _index/hash adjustment so the next nav
      // starts from what's actually on screen.
      if (d && d.__dc_op_ack) {
        this._railLock = false;
        if (d.applied === false && this._indexBeforeEmit != null) {
          this._index = this._indexBeforeEmit;
          try {
            history.replaceState(null, '', '#' + (this._index + 1));
          } catch (e) {}
        }
        this._indexBeforeEmit = null;
        // A refused op never re-renders, so slotchange won't restore the
        // keyboard flow's focus — do it here. (Applied ops refocus in
        // _onSlotChange, after the rail has been rebuilt.)
        if (d.applied === false && this._pendingRailRefocus) {
          this._focusCurrentThumb(true);
        }
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTap(e) {
      // Touch-only — keyboard + the overlay toolbar cover nav on desktop.
      if (FINE_POINTER_MQ.matches) return;
      // Only taps that land on the stage (slide content or letterbox); the
      // overlay / rail / menus are siblings with their own click handlers.
      const path = e.composedPath();
      if (!this._stage || !path.includes(this._stage)) return;
      // Let interactive slide content keep the tap. composedPath (not
      // e.target.closest) so we see through open shadow roots — a <button>
      // inside a slide-authored custom element retargets e.target to the
      // host but still appears in the composed path.
      if (e.defaultPrevented) return;
      for (const n of path) {
        if (n === this._stage) break;
        if (n.matches && n.matches(INTERACTIVE_SEL)) return;
      }
      e.preventDefault();
      const rw = this._railWidth();
      const mid = rw + (window.innerWidth - rw) / 2;
      this._advance(e.clientX < mid ? -1 : 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing. composedPath()[0], not e.target: a
      // window-level keydown retargets e.target to the shadow host, which
      // would miss an <input> or contenteditable inside a web component on
      // a slide (same reason _onTap uses composedPath).
      const t = e.composedPath ? e.composedPath()[0] : e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          this._focusCurrentThumb();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' && this._selected.size) {
        // Collapse the multi-selection back to the current slide (the
        // implicit selection), not to nothing.
        this._clearSelection();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'ArrowDown' && !e.defaultPrevented) {
        // ↓/↑ page slides like →/← (Keynote/PowerPoint parity). Window
        // level only: rail thumbs keep their own ↑/↓ walk (their handler
        // stops propagation before this one), and the typing guard above
        // already covers inputs and contenteditable slide content.
        // Deliberate tradeoff: like Space/PageDown before them, these are
        // scroll keys — slide content that wants keyboard scrolling claims
        // them with preventDefault, which this branch honors (checked here
        // and not for the long-standing keys above, so ←/→/Space behavior
        // is unchanged and ↑/↓ behave identically on frozen copies, whose
        // translator in the guest bundle applies the same guard).
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowUp' && !e.defaultPrevented) {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      // User-initiated navigation collapses a multi-selection down to
      // the (implicit) current slide, like Keynote's arrow keys. 'click'
      // handles its own selection; programmatic reasons leave it alone.
      if (reason === 'keyboard' || reason === 'tap') this._clearSelection();
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
        if (this._selected.has(t.slide)) t.thumb.setAttribute('data-selected', '');else t.thumb.removeAttribute('data-selected');
      });
      this._thumbs = next;
      this._renumberRail();
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          // The live-dragged thumb is positioned by the drag tracker; a
          // FLIP transform+transition here would clobber it mid-drag.
          if (thumb === this._dragThumb) return;
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', e => {
        const i = idx();
        const slide = this._slides[i];
        // WebKit doesn't focus a plain element on click — focus
        // explicitly so Delete/Backspace works right after selecting a
        // slide by mouse. preventScroll: _syncRail owns the rail's
        // scroll position.
        thumb.focus({
          preventScroll: true
        });
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          // Multi-select gestures adjust the selection without
          // navigating (Keynote/Figma convention).
          e.preventDefault();
          if (e.shiftKey) {
            // Range from the anchor (last plain/cmd-clicked slide;
            // falls back to the current slide) to here, replacing any
            // previous range.
            let a = this._selAnchor ? this._slides.indexOf(this._selAnchor) : -1;
            if (a < 0) {
              a = this._index;
              this._selAnchor = this._slides[a] || null;
            }
            this._selected.clear();
            for (let j = Math.min(a, i); j <= Math.max(a, i); j++) {
              this._selected.add(this._slides[j]);
            }
          } else if (slide) {
            // Toggle. An empty explicit selection implicitly holds the
            // current slide — materialize it first so cmd-clicking a
            // second slide selects both.
            if (!this._selected.size && i !== this._index && this._slides[this._index]) {
              this._selected.add(this._slides[this._index]);
            }
            if (this._selected.has(slide)) this._selected.delete(slide);else {
              this._selected.add(slide);
              this._selAnchor = slide;
            }
          }
          this._syncSelection();
          return;
        }
        this._clearSelection();
        this._selAnchor = slide || null;
        this._go(i, 'click');
      });
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        // Delete/Backspace with the rail focused deletes this thumb's
        // slide through the same confirm dialog as the menu item.
        // Listening on the thumb (never window-level) is what keeps
        // typing in the notes panel / slide inputs from ever landing
        // here; the target check is belt-and-braces for anything
        // focusable that ends up inside a thumb.
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const t = e.target;
          if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
          e.preventDefault();
          e.stopPropagation();
          // Same refusals as the menu item: never every slide, never
          // while a prior structural op is waiting on its ack. The
          // whole-deck refusal is announced (the menu greys its item
          // out; a silently dead key reads as breakage). The rail-lock
          // refusal stays silent: it lasts one ack round-trip and
          // matches the existing single-delete behavior.
          if (this._railLock) return;
          // Explicit selection wins; otherwise the focused thumb (which
          // plain click and ↑/↓ keep equal to the current slide).
          const sel = this._selected.size ? this._selectionIndices() : [idx()];
          if (sel.length >= this._slides.length) {
            this._showNotice(sel.length === 1 ? 'The last slide can’t be deleted.' : 'At least one slide has to stay — the whole deck can’t be deleted.');
            return;
          }
          this._openConfirm(sel);
          return;
        }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        // v1: dragging moves ONE slide, so a multi-selection would lie
        // about what's about to move — collapse it. (Group drag would
        // instead keep it and emit a batched move.)
        this._clearSelection();
        this._dragFrom = idx();
        // Deferred to the next frame: the [data-dragging] rule sets
        // pointer-events:none on the drag SOURCE, and applying that
        // synchronously inside dragstart makes Chromium (and WebKit) cancel
        // the drag — dragstart then an immediate dragend, no dragover or
        // drop, so thumbnails could not be reordered by dragging at all.
        // One frame is invisible and lands before the first dragover needs
        // the source to be hit-test-transparent. Guarded twice so the
        // attribute can never strand on a thumb that is no longer being
        // dragged (pointer-events:none would leave it unclickable for the
        // session): the pending frame is cancelled in dragend
        // (_cancelDragAttr), and the callback itself re-checks that THIS
        // thumb is still the live drag source (a new drag on another thumb
        // re-points the drag state). Deliberately NOT cancelled in
        // _stopDragTrack — _startDragTrack calls it at the start of every
        // drag, which would kill the mark this dragstart just scheduled
        // (see _cancelDragAttr).
        this._dragAttrRaf = requestAnimationFrame(() => {
          this._dragAttrRaf = null;
          if (this._dragFrom != null && this._dragThumb === thumb) {
            thumb.setAttribute('data-dragging', '');
          }
        });
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
        // Constrain the drag visual to the rail's vertical axis. The
        // browser's default drag image is a free-floating snapshot that
        // follows the OS cursor in BOTH axes and the DnD API offers no way
        // to constrain it — so swap it for a transparent stand-in and move
        // the thumb itself along Y instead (_startDragTrack). The drop
        // logic below always read only clientY; this makes the visual
        // match it.
        try {
          e.dataTransfer.setDragImage(this._dragBlank(), 0, 0);
        } catch (err) {}
        this._startDragTrack(thumb, e.clientY);
      });
      thumb.addEventListener('dragend', () => {
        this._cancelDragAttr();
        thumb.removeAttribute('data-dragging');
        this._stopDragTrack();
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      // The clone participates in the document's flat tree, so the
      // templates' position-based CSS page counters (.slide
      // { counter-increment: page }) would count every materialized
      // thumb before the real slides — folios print offset by the
      // thumb count (slide 2 reading "7" on a five-slide deck).
      // Neutralize the counter on the clone and drop its folio pill:
      // a thumbnail's own page number is unreadable at thumb scale
      // anyway, and the real slides' numbers stay truthful.
      clone.style.counterIncrement = 'none';
      clone.querySelectorAll('.page-foot').forEach(pf => pf.remove());
      // Canvas bitmaps don't clone — swap each cloned canvas for an <img>
      // of the live pixels. Best-effort: tainted canvases throw (left
      // as-is); zero-size are skipped; WebGL without preserveDrawingBuffer
      // reads back blank and the thumb gets a blank img (same as before).
      const liveCanvases = entry.slide.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      cloneCanvases.forEach((cv, i) => {
        const live = liveCanvases[i];
        if (!live || !live.width || !live.height) return;
        try {
          const img = document.createElement('img');
          img.src = live.toDataURL();
          img.alt = '';
          img.style.cssText = cv.style.cssText;
          img.className = cv.className;
          img.width = live.width;
          img.height = live.height;
          // Author CSS that sized the <canvas> via tag selector won't match
          // the <img> — pin the live canvas's laid-out box on the snapshot.
          if (live.clientWidth) {
            img.style.width = live.clientWidth + 'px';
            img.style.height = live.clientHeight + 'px';
          }
          cv.replaceWith(img);
        } catch (e) {}
      });
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      // Parity with _inertify: transient top-layer UI never belongs in a
      // static thumb.
      clone.querySelectorAll('[popover], dialog').forEach(el => el.remove());
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes (_neuter) so a component-heavy deck doesn't run
      // N copies of each component's mount logic in the rail. Children
      // are preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content, and a shadow tree cloned along
      // via attachShadow({clonable:true}) (e.g. <image-slot>) moves onto
      // the box so the thumb shows the component's rendered content. The
      // querySelectorAll NodeList is static, so nested custom elements in
      // the moved subtree are still visited on later iterations.
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = this._neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(this._neuter(el));
      });
      // Strip ids only now: a defined custom element upgrades synchronously
      // during cloneNode and re-renders on attribute callbacks, so removing
      // 'id' any earlier resets components (e.g. <image-slot> falls back to
      // its author src). Post-neuter, only inert boxes and plain elements
      // remain, where the strip is just the usual duplicate-id hygiene.
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      // Clones are display-only: inert removes anything focusable inside
      // them from the tab order, so the rail's Delete/Backspace handler
      // can never see a (retargeted) key press from cloned content.
      host.inert = true;
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Replace a cloned custom element with an inert box (see the comment
     *  in _materialize). A shadow tree cloned along via {clonable:true}
     *  moves onto the box, so the thumb shows the component's real content
     *  with zero component logic; :host rules in the moved <style> match
     *  the box, and the preserved data-* attrs keep :host([data-…])
     *  selectors working. */
    _neuter(el) {
      // Adopt the shadow only when the cloned root carries renderable
      // content. A constructor-attach / connectedCallback-render component
      // clones into an empty (or style-only) slotless root — adopting that
      // would hide the light children the box is about to receive and drop
      // the placeholder chrome. Such components fall back to the plain box.
      let sr = el.shadowRoot;
      if (sr) {
        let renderable = false;
        for (let n = sr.firstElementChild; n; n = n.nextElementSibling) {
          const t = n.tagName;
          if (t !== 'STYLE' && t !== 'LINK') {
            renderable = true;
            break;
          }
        }
        if (!renderable) sr = null;
      }
      const box = document.createElement('div');
      box.style.cssText = (el.getAttribute('style') || '') + (sr ? '' : ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);');
      box.className = el.className;
      // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
      // descendant selectors still match the neutered root — but not
      // pointer-interaction transients (a mid-reframe/mid-drag re-clone
      // would render the interaction chrome statically in the thumb).
      for (const a of el.attributes) {
        const n = a.name;
        if (n === 'data-reframe' || n === 'data-panning' || n === 'data-over') continue;
        if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
          box.setAttribute(n, a.value);
        }
      }
      while (el.firstChild) box.appendChild(el.firstChild);
      if (sr) this._adoptShadow(box, sr);
      return box;
    }

    /** Move a cloned shadow tree onto a neutered thumbnail box: attach an
     *  open root on the box, carry adoptedStyleSheets, move the children,
     *  then make the content inert. */
    _adoptShadow(box, sr) {
      let root;
      try {
        root = box.attachShadow({
          mode: 'open'
        });
      } catch (e) {
        return;
      }
      // Engine-cloned shadow roots never carry adoptedStyleSheets, but a
      // defined component's clone is upgrade-rebuilt (constructor runs
      // during cloneNode), so sheets it adopts there are present and
      // shared by reference — carry them.
      if (sr.adoptedStyleSheets && sr.adoptedStyleSheets.length) {
        try {
          root.adoptedStyleSheets = Array.prototype.slice.call(sr.adoptedStyleSheets);
        } catch (e) {}
      }
      // Clone rather than move: moving preserves listeners an upgraded
      // clone's constructor attached inside its shadow; cloning sheds
      // them, keeping thumbs free of component logic categorically.
      for (let n = sr.firstChild; n; n = n.nextSibling) {
        root.appendChild(n.cloneNode(true));
      }
      this._inertify(root);
    }

    /** Strip anything executable from copied shadow content and apply the
     *  same custom-element/media/img policy as the light-DOM clone.
     *  (Canvases inside copied shadow content stay blank — there is no
     *  live↔clone pairing across shadow boundaries to snapshot from.) */
    _inertify(root) {
      root.querySelectorAll('script').forEach(s => s.remove());
      // Transient top-layer UI can never belong in a static thumb. (A
      // cloned [popover] is display:none anyway — open state doesn't
      // clone — this just makes it categorical.)
      root.querySelectorAll('[popover], dialog').forEach(el => el.remove());
      // Same heavy-media policy as the light-DOM clone above.
      root.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      root.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      root.querySelectorAll('*').forEach(el => {
        for (let i = el.attributes.length - 1; i >= 0; i--) {
          if (/^on/i.test(el.attributes[i].name)) {
            el.removeAttribute(el.attributes[i].name);
          }
        }
      });
      root.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Nested custom elements inside copied shadow content would upgrade
      // on append — same treatment as the light DOM. querySelectorAll is
      // static, so boxes created mid-walk don't re-enter this loop.
      root.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(this._neuter(el));
      });
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }

    /** 1×1 transparent stand-in for setDragImage. Kept attached (offscreen
     *  in the shadow root) because some engines ignore a drag image that
     *  isn't in a rendered tree. Created lazily, reused for every drag. */
    _dragBlank() {
      if (!this._dragBlankEl) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        c.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
        this._root.appendChild(c);
        this._dragBlankEl = c;
      }
      return this._dragBlankEl;
    }

    /** Vertical-only drag tracking: translate the dragged thumb along Y to
     *  follow the pointer, clamped to the rail, ignoring X entirely. A
     *  document-level capture listener is used because native dragover
     *  fires wherever the pointer is — so the thumb keeps tracking even
     *  while the pointer wanders over the stage — and it is removed the
     *  moment the drag ends. getBoundingClientRect already reflects the
     *  current transform, so the layout position is recovered by
     *  subtracting the translation applied so far (rail auto-scroll moves
     *  the layout position mid-drag; see the rail dragover handler). */
    _startDragTrack(thumb, startY) {
      // A lost dragend (the dragged thumb removed mid-drag by a remote
      // edit's re-render — browsers fire no dragend on a disconnected
      // source) would otherwise leave the previous listener installed
      // forever once this overwrite lands.
      this._stopDragTrack();
      this._dragThumb = thumb;
      // The FLIP reorder animation drives transform through a transition;
      // the live drag must not inherit one, or the thumb rubber-bands.
      // Killed BEFORE the grab-offset read: mid-FLIP the rect includes the
      // interpolated transform, which would bake a constant offset into
      // the whole drag.
      thumb.style.transition = 'none';
      this._dragGrab = startY - thumb.getBoundingClientRect().top;
      this._dragTy = 0;
      this._onDragTrack = e => {
        const t = this._dragThumb;
        if (!t) return;
        const rail = this._rail.getBoundingClientRect();
        const r = t.getBoundingClientRect();
        // A transformed ancestor (author wraps the deck in a CSS scale;
        // canvas-mode pan/zoom) scales viewport deltas: translateY(N)
        // moves the rect by s·N. Measure s from the thumb itself (rect is
        // scaled, offsetHeight is layout px) so the feedback loop stays
        // exact instead of oscillating at s ≥ 2. offsetHeight is 0 only
        // when unrendered — nothing to track then, treat as unscaled.
        const s = t.offsetHeight ? r.height / t.offsetHeight : 1;
        const layoutTop = r.top - s * this._dragTy;
        let want = e.clientY - this._dragGrab;
        want = Math.max(rail.top, Math.min(want, rail.bottom - r.height));
        this._dragTy = (want - layoutTop) / s;
        t.style.transform = 'translateY(' + this._dragTy + 'px)';
      };
      document.addEventListener('dragover', this._onDragTrack, true);
    }

    /** Cancel the thumb's deferred data-dragging mark if its frame has not
     *  fired yet — see the dragstart deferral. Called from dragend only:
     *  _stopDragTrack is the wrong home for it, because _startDragTrack
     *  defensively calls _stopDragTrack at the START of every drag (its
     *  lost-dragend reset), so a cancel there kills the mark the same
     *  dragstart just scheduled. The strand that matters — pointer-
     *  events:none left on a CONNECTED thumb that is no longer being
     *  dragged — is closed two ways: dragend cancels the pending frame
     *  here, and the frame callback re-checks that THIS thumb is still the
     *  live drag source (_dragFrom and _dragThumb, both cleared/re-pointed
     *  by dragend or by a new drag). The remaining lost-dragend case — the
     *  source slide removed mid-drag, so no dragend fires — ends with that
     *  thumb discarded by the rail reconcile (thumbs are keyed by slide
     *  element and a removed slide's thumb is not reused), so a mark landing
     *  on it is on a discarded node. The risk this defer adds over the old
     *  synchronous set is therefore the narrow rAF-after-dragend window,
     *  which the dragend cancel covers. */
    _cancelDragAttr() {
      if (this._dragAttrRaf != null) {
        cancelAnimationFrame(this._dragAttrRaf);
        this._dragAttrRaf = null;
      }
    }
    _stopDragTrack() {
      if (this._onDragTrack) {
        document.removeEventListener('dragover', this._onDragTrack, true);
        this._onDragTrack = null;
      }
      const t = this._dragThumb;
      if (t) {
        t.style.transform = '';
        t.style.transition = '';
      }
      this._dragThumb = null;
      this._dragTy = 0;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      // Right-clicking a thumb OUTSIDE the selection collapses the
      // selection to that thumb (platform convention) — the menu then
      // always targets exactly what's highlighted.
      if (this._selected.size && slide && !this._selected.has(slide)) {
        this._selected.clear();
        this._selected.add(slide);
        this._selAnchor = slide;
        this._syncSelection();
      }
      const sel = this._selectionIndices();
      const bulk = sel.length > 1;
      this._menuIndices = bulk ? sel : [i];
      // Bulk mode offers only the one batched op that exists (delete);
      // the single-slide items address one index and stay hidden.
      this._menu.querySelectorAll('[data-act="skip"], [data-act="up"], [data-act="down"], [data-act="duplicate"], hr').forEach(el => {
        el.style.display = bulk ? 'none' : '';
      });
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      const del = this._menu.querySelector('[data-act="delete"]');
      del.textContent = bulk ? 'Delete ' + sel.length + ' slides' : 'Delete slide';
      del.disabled = bulk ? sel.length >= this._slides.length : this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
      this._menuIndices = null;
    }
    _openConfirm(sel) {
      if (!this._confirm) return;
      const list = Array.isArray(sel) ? sel : [sel];
      // Hold the slide ELEMENTS: the deck can re-render while the dialog
      // is open (collaborator/agent edit), and a frozen index list would
      // then address the wrong slides — a same-count reorder even passes
      // the host's witness guard. Elements re-resolve at danger-click.
      this._confirmEls = list.map(i => this._slides[i]).filter(Boolean);
      // Title uses the rail's skip-aware label, so the confirm names the
      // number the user right-clicked (a raw index would disagree with the
      // rail whenever a skipped slide precedes the target).
      const lbl = list.length === 1 ? this._slideLabel(list[0]) : '';
      this._confirm.querySelector('.title').textContent = list.length === 1 ? lbl ? 'Delete slide ' + lbl + '?' : 'Delete skipped slide?' : 'Delete ' + list.length + ' slides?';
      this._confirm.querySelector('.msg').textContent = list.length === 1 ? 'This slide will be removed from the deck.' : 'These slides will be removed from the deck.';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmEls = null;
    }

    /** Return focus to the current slide's thumb so the keyboard flow
     *  (Delete → Enter → Delete …) survives the confirm dialog closing.
     *  Without 'force', skipped while a structural op is in flight
     *  (_railLock): _index is then an optimistic post-op value that
     *  doesn't address the pre-op thumb list — _pendingRailRefocus stays
     *  armed and the ack/slotchange paths call back with force once the
     *  rail reflects the op. Skipped (and disarmed) while the rail is
     *  inert (hidden / presenting). */
    _focusCurrentThumb(force) {
      if (!force && this._railLock) return;
      this._pendingRailRefocus = false;
      // Never yank focus from content the user reached meanwhile (e.g.
      // an input inside a slide during the ack round-trip) — only
      // reclaim it from the rail's own surfaces, or from nowhere.
      const ae = this._root && this._root.activeElement;
      const ours = !ae || this._rail && this._rail.contains(ae) || this._confirm && this._confirm.contains(ae) || this._menu && this._menu.contains(ae);
      const lightAe = document.activeElement;
      const lightOk = !lightAe || lightAe === document.body || lightAe === this;
      if (!ours || !lightOk) return;
      const cur = this._thumbs && this._thumbs[this._index];
      if (cur && this._rail && !this._rail.inert) cur.thumb.focus({
        preventScroll: true
      });
    }

    /** Selection as sorted slide indices. An empty explicit selection
     *  means the current slide (the rail's implicit selection). */
    _selectionIndices() {
      const out = [];
      this._slides.forEach((s, i) => {
        if (this._selected.has(s)) out.push(i);
      });
      if (!out.length && this._slides[this._index]) out.push(this._index);
      return out;
    }
    _clearSelection() {
      // Re-anchor before the early return: a plain click followed by
      // arrow/tap navigation leaves _selected empty but the anchor
      // pointing at the old slide, and a later shift-click would range
      // from there instead of the current slide.
      this._selAnchor = null;
      if (!this._selected.size) return;
      this._selected.clear();
      this._syncSelection();
    }
    _syncSelection() {
      (this._thumbs || []).forEach(t => {
        if (this._selected.has(t.slide)) t.thumb.setAttribute('data-selected', '');else t.thumb.removeAttribute('data-selected');
      });
    }

    /** Rail mutations. When a dc-runtime is present (`window.__dcUpdate`)
     *  the host owns the light DOM — handlers emit a dc-op only and the
     *  host applies it (to the editor's model or to the source file) and
     *  re-renders via dc-runtime; slotchange catches the rail up.
     *  Structural ops lock rail input until the host acks so a rapid second
     *  click can't address a stale index; setAttr/removeAttr respect the
     *  lock but don't set it (indices unchanged; the host serializes).
     *  `newIndex` is written to location.hash so slotchange's
     *  _restoreIndex lands on the right slide.
     *
     *  With NO dc-runtime (a raw .html deck), there's no re-render path,
     *  so handlers self-mutate locally for an instant update and emit
     *  `emitOnly: false`; the host persists to disk without
     *  re-rendering over the already-mutated DOM.
     *
     *  See docs/dc-ops.md for the contract. */
    /** True when the page's DC runtime reports a live template stream for
     *  any component here (newer support.js bundles only — older bundles
     *  lack the signal and the HOST-side gate covers those decks). Rail
     *  mutations are refused for the duration: a mid-stream op addresses
     *  slide indices the stream is rewriting underneath the click. */
    _streamActive() {
      try {
        return !!window.__dcUpdate && typeof window.__dcStreaming === 'function' && window.__dcStreaming();
      } catch (e) {
        return false;
      }
    }

    /** Transient in-stage notice for a refused mid-stream rail op. */
    _showStreamNotice() {
      this._showNotice('Claude is still updating this deck — try again when it finishes.');
    }

    /** Transient bottom-center toast for a refused rail gesture. */
    _showNotice(text) {
      if (!this._root) return;
      let n = this._streamNotice;
      if (!n) {
        n = document.createElement('div');
        n.className = 'export-hidden';
        n.setAttribute('data-omelette-chrome', '');
        n.setAttribute('role', 'status');
        n.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' + 'background:rgba(22,22,22,.94);color:#fff;' + 'font:500 13px/1.4 system-ui,sans-serif;padding:8px 14px;' + 'border-radius:8px;z-index:2147483646;pointer-events:none;' + 'opacity:0;transition:opacity .15s ease';
        this._root.append(n);
        this._streamNotice = n;
      }
      n.textContent = text;
      n.style.opacity = '1';
      if (this._streamNoticeTimer) clearTimeout(this._streamNoticeTimer);
      this._streamNoticeTimer = setTimeout(() => {
        n.style.opacity = '0';
      }, 2600);
    }
    _emitDcOp(op, slide, lock, newIndex) {
      // Mid-stream guard: refuse the gesture outright — no lock, no
      // optimistic index change, no emit, no self-mutation (returning
      // true short-circuits every caller). The host applies the same
      // gate for decks whose committed support.js predates the signal.
      if (this._streamActive()) {
        this._showStreamNotice();
        return true;
      }
      // Slide index (template/script/style filtered — same as
      // _collectSlides). deck-stage is a filtered-index dc-op emitter;
      // the host resolves against findDeckStage().slideTids. Callers
      // already pass `to` as a slide index.
      op.at = this._slides.indexOf(slide);
      op.witness = {
        childCount: this._slides.length
      };
      // dc-runtime wraps an <x-import>-mounted component in a
      // <div class="sc-host-x" data-dc-tpl="N"> host — the stamp is on the
      // WRAPPER, not this element. closest() finds it (or this element's
      // own stamp when directly templated).
      const host = this.closest('[data-dc-tpl]');
      const tid = host && host.getAttribute('data-dc-tpl');
      op.mount = {
        tid: tid !== null ? parseInt(tid, 10) : null,
        tag: 'deck-stage'
      };
      op.emitOnly = !!window.__dcUpdate;
      if (op.emitOnly) {
        if (lock) this._railLock = true;
        if (newIndex != null && newIndex !== this._index) {
          this._indexBeforeEmit = this._index;
          this._index = newIndex;
          try {
            history.replaceState(null, '', '#' + (newIndex + 1));
          } catch (e) {}
        }
      }
      this.dispatchEvent(new CustomEvent('dc-op', {
        detail: op,
        bubbles: true,
        composed: true
      }));
      return op.emitOnly;
    }

    /** Delete a set of slides (pre-op indices). One slide delegates to
     *  _deleteSlide — the plain 'remove' op — so single deletes keep
     *  working against hosts that predate 'removeMany'. A bulk delete is
     *  ONE op: one host write, one undo snapshot, and indices that all
     *  address the same pre-op deck (N acked single ops would each need
     *  a fresh witness). */
    _deleteSlides(list) {
      if (this._railLock || !list) return;
      const indices = [...new Set(list)].filter(i => this._slides[i]).sort((a, b) => a - b);
      if (!indices.length || indices.length >= this._slides.length) return;
      if (indices.length === 1) {
        this._deleteSlide(indices[0]);
        return;
      }
      // Mirrors _duplicateSlide: check the stream gate before doing any
      // work (_emitDcOp re-checks).
      if (this._streamActive()) {
        this._showStreamNotice();
        return;
      }
      const els = indices.map(i => this._slides[i]);
      const del = new Set(indices);
      const cur = this._index;
      // New current index in post-op space: shift the kept slide left by
      // the deletions below it; if the current slide itself is deleted,
      // land on the nearest survivor (after, else before).
      const below = n => indices.reduce((k, x) => k + (x < n ? 1 : 0), 0);
      let ni;
      if (!del.has(cur)) {
        ni = cur - below(cur);
      } else {
        let s = -1;
        for (let j = cur + 1; j < this._slides.length; j++) {
          if (!del.has(j)) {
            s = j;
            break;
          }
        }
        if (s === -1) {
          for (let j = cur - 1; j >= 0; j--) {
            if (!del.has(j)) {
              s = j;
              break;
            }
          }
        }
        ni = s < 0 ? 0 : s - below(s);
      }
      // Emit-path deletes can't refocus until the host re-renders; arm
      // the flag at emit time (never on a refused/no-op path) so
      // ack/slotchange can finish the keyboard flow's focus hand-back.
      // The local path clears it via the caller's _focusCurrentThumb().
      this._pendingRailRefocus = true;
      if (this._emitDcOp({
        op: 'removeMany',
        indices
      }, els[0], true, ni)) return;
      this._index = ni;
      this._squelchSlotChange = true;
      els.forEach(el => el.remove());
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _deleteSlide(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const cur = this._index;
      const ni = i < cur || i === cur && i === this._slides.length - 1 ? cur - 1 : cur;
      this._pendingRailRefocus = true;
      if (this._emitDcOp({
        op: 'remove'
      }, slide, true, ni)) return;
      this._index = ni;
      this._squelchSlotChange = true;
      slide.remove();
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _duplicateSlide(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide) return;
      // Mint ids + copy component state BEFORE emitting, so the op can
      // carry the id map — but never mint for an op the stream gate is
      // about to refuse (_emitDcOp re-checks; this avoids orphaned keys).
      if (this._streamActive()) {
        this._showStreamNotice();
        return;
      }
      const copy = slide.cloneNode(true);
      copy.removeAttribute('id');
      const ids = this._remintDuplicateIds(copy);
      const op = {
        op: 'duplicate'
      };
      if (ids) op.ids = ids;
      if (this._emitDcOp(op, slide, true, i + 1)) return;
      this._index = i + 1;
      this._squelchSlotChange = true;
      this.insertBefore(copy, slide.nextSibling);
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }

    /** Duplicate id policy. Plain ids are stripped — two live slides must
     *  not share one id. But a component that KEYS persistent state by id
     *  (image-slot's sidecar photo) would silently lose that state with
     *  its id. Such a component opts out of the strip by exposing a
     *  static cloneSlot(fromId, isFree) that copies its stored state
     *  under a fresh id of its choosing and returns that id. The old→new
     *  map is returned (or null) and rides the dc-op so the host writes
     *  the SAME ids into source — without that, the copy's state would
     *  revert on reload (docs/dc-ops.md). */
    _remintDuplicateIds(copy) {
      const ids = {};
      let found = false;
      const used = new Set();
      const idOk = /^[A-Za-z][\w-]{0,63}$/;
      const isFree = id => idOk.test(id) && !used.has(id) && !document.getElementById(id);
      copy.querySelectorAll('[id]').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const cls = tag.indexOf('-') >= 0 && customElements.get(tag);
        let next = null;
        if (el.id && cls && typeof cls.cloneSlot === 'function') {
          try {
            next = cls.cloneSlot(el.id, isFree);
          } catch (e) {}
        }
        // Re-checked here so a misbehaving static can't smuggle a dupe
        // or an unsafe value into the document / the emitted op.
        if (typeof next === 'string' && isFree(next)) {
          ids[el.id] = next;
          used.add(next);
          el.id = next;
          found = true;
        } else {
          el.removeAttribute('id');
        }
      });
      return found ? ids : null;
    }
    _toggleSkip(i) {
      if (this._railLock) return;
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (this._emitDcOp(on ? {
        op: 'setAttr',
        attr: 'data-deck-skip',
        value: ''
      } : {
        op: 'removeAttr',
        attr: 'data-deck-skip'
      }, slide, false)) return;
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }

    /** Rail numbering, skip-aware: a skipped slide shows no number and the
     *  rest stay contiguous (1..visible), so the labels match the positions
     *  the overlay counter reports. Cheap (text writes are diffed), safe to
     *  call after any reconcile or skip toggle. */
    _renumberRail() {
      let v = 0;
      (this._thumbs || []).forEach(t => {
        const label = t.slide.hasAttribute('data-deck-skip') ? '' : String(++v);
        if (t.num.textContent !== label) t.num.textContent = label;
      });
    }

    /** Skip-aware label for slide i — the same numbering _renumberRail
     *  paints: '' for a skipped slide, else its 1-based position among
     *  non-skipped slides. Display surfaces (e.g. the delete confirm)
     *  use this so they never name a number the rail doesn't show. */
    _slideLabel(i) {
      const s = this._slides[i];
      if (!s || s.hasAttribute('data-deck-skip')) return '';
      let v = 0;
      for (let k = 0; k <= i; k++) {
        if (!this._slides[k].hasAttribute('data-deck-skip')) v++;
      }
      return String(v);
    }

    /** Overlay counter, skip-aware: position among non-skipped slides over
     *  the non-skipped total. A skipped CURRENT slide (reachable by rail
     *  click or deep link, never by _advance) shows '–' — its number is
     *  gone from the rail, so any digit here would lie. */
    _syncCount() {
      if (!this._countEl || !this._totalEl) return;
      // Empty deck: keep the overlay's initial "1 / 1" (it has nothing to
      // count and isn't visible without slides) — the guest fallback for
      // frozen copies leaves empty decks alone for the same rendering.
      if (!this._slides.length) {
        this._countEl.textContent = '1';
        this._totalEl.textContent = '1';
        return;
      }
      let pos = 0,
        total = 0;
      this._slides.forEach((s, i) => {
        if (!s.hasAttribute('data-deck-skip')) {
          total++;
          if (i <= this._index) pos = total;
        }
      });
      const cur = this._slides[this._index];
      const curSkipped = !cur || cur.hasAttribute('data-deck-skip');
      this._countEl.textContent = curSkipped ? '–' : String(pos);
      this._totalEl.textContent = String(total);
    }
    _moveSlide(i, j) {
      if (this._railLock || j < 0 || j >= this._slides.length || j === i) return;
      const cur = this._index;
      const ni = cur === i ? j : i < cur && j >= cur ? cur - 1 : i > cur && j <= cur ? cur + 1 : cur;
      const slide = this._slides[i];
      if (this._emitDcOp({
        op: 'move',
        to: j
      }, slide, true, ni)) return;
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      this._index = ni;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/app/doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    /* Monolithic at print: Blink slices a transform-scaled child at
     * fragmentainer boundaries mapped in UNSCALED layout coordinates
     * (transforms are paint-time), so the .fit box (authored size, e.g.
     * 1400x990) gets cut at the page's free block space and spills onto
     * a second sheet even though its SCALED footprint fits the page by
     * construction. overflow:hidden makes .fit-box a scroll container —
     * monolithic under fragmentation (css-break-3) — so the scaled
     * content prints atomically on one sheet. No clipping for content
     * within the authored box: .fit-box is calc-sized to exactly the
     * scaled footprint. (Content that bleeds past content-width/height
     * is clipped at the footprint — fit mode's contract; it previously
     * painted beyond it at print.) Print-only, so the screen rendering
     * keeps visible overflow for editor affordances.
     * The export path injects the same rule into frozen copies
     * (print-eval.ts om-print-fit-contain). The .fit-mode scope is
     * load-bearing: .fit-box wraps slotted content in EVERY mode, and an
     * unscoped overflow:hidden would make whole flowing documents
     * monolithic (one truncated sheet). overflow:hidden, never clip —
     * clip is not a scroll container, so not monolithic. */
    @media print {
      .fit-mode .fit-box { overflow: hidden; }
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/doc-page.js", error: String((e && e.message) || e) }); }

// ui_kits/app/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/operator/OperatorApp.jsx
try { (() => {
function OperatorApp() {
  const [task, setTask] = React.useState(null);
  const [done, setDone] = React.useState([]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, task ? /*#__PURE__*/React.createElement(TaskDetail, {
    task: task,
    onBack: () => setTask(null),
    onDone: t => {
      setDone([...done, t.id]);
      setTask(null);
    }
  }) : /*#__PURE__*/React.createElement(TaskList, {
    done: done,
    onOpen: setTask
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(OperatorApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/operator/OperatorApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/operator/TaskDetail.jsx
try { (() => {
const CHECKS = ['Freio dianteiro e traseiro', 'Pneus', 'Luzes', 'Campainha', 'Limitador de velocidade'];
function TaskDetail({
  task,
  onBack,
  onDone
}) {
  const {
    IconButton,
    Button,
    Checkbox,
    PhotoCapture,
    Input,
    Card,
    Badge,
    BatteryPill,
    FleetStatus,
    Toast,
    Alert
  } = VDS;
  const [unlocked, setUnlocked] = React.useState(false);
  const [checks, setChecks] = React.useState([]);
  const [photo, setPhoto] = React.useState(false);
  const isBat = task.type === 'battery';
  const ok = unlocked && checks.length === CHECKS.length && photo;
  const toggle = c => setChecks(checks.includes(c) ? checks.filter(x => x !== c) : [...checks, c]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 230,
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(MapView, {
    offsetY: -200
  }, /*#__PURE__*/React.createElement(Pin, {
    x: 200,
    y: 470
  }, /*#__PURE__*/React.createElement(VDS.VehicleMarker, {
    level: task.bat,
    selected: true
  })), /*#__PURE__*/React.createElement(UserDot, {
    x: 150,
    y: 560,
    heading: true
  })), /*#__PURE__*/React.createElement(IconButton, {
    icon: "ArrowLeft",
    label: "Voltar",
    onClick: onBack,
    style: {
      position: 'absolute',
      top: 56,
      left: 20,
      zIndex: 5
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      scrollbarWidth: 'none',
      marginTop: -24,
      position: 'relative',
      zIndex: 3,
      background: 'var(--surface-app)',
      borderRadius: '28px 28px 0 0',
      padding: '20px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, task.t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      fontFamily: 'var(--font-mono)',
      letterSpacing: 0
    }
  }, task.moto), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, task.addr)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(BatteryPill, {
    level: task.bat,
    range: Math.round(task.bat / 4.5)
  }), /*#__PURE__*/React.createElement(FleetStatus, {
    status: unlocked ? 'maintenance' : 'free',
    variant: "dot"
  }))), !unlocked ? /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    variant: "dark",
    icon: "Wrench",
    onClick: () => setUnlocked(true)
  }, "Destravar em modo servi\xE7o") : /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    icon: "LockOpen",
    title: "Modo servi\xE7o ativo"
  }, "Sem cobran\xE7a. A moto some do mapa dos clientes."), isBat && /*#__PURE__*/React.createElement(Card, {
    padding: 14,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)'
    }
  }, "Troca de bateria"), /*#__PURE__*/React.createElement(Input, {
    label: "N\xBA de s\xE9rie da bateria nova",
    placeholder: "BT-000000",
    icon: "ScanBarcode",
    defaultValue: "BT-208431"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-secondary)'
    }
  }, "Retirada: BT-190577 \xB7 12% \xB7 412 ciclos")), /*#__PURE__*/React.createElement(Card, {
    padding: 14,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)'
    }
  }, "Checklist de inspe\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-bold) 13px/1 var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, checks.length, "/", CHECKS.length)), CHECKS.map(c => /*#__PURE__*/React.createElement(Checkbox, {
    key: c,
    checked: checks.includes(c),
    onChange: () => toggle(c),
    label: c
  }))), /*#__PURE__*/React.createElement(PhotoCapture, {
    label: "Foto da moto ap\xF3s o servi\xE7o",
    hint: "Obrigat\xF3ria",
    height: 110,
    done: photo,
    onClick: () => setPhoto(true)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px 40px',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-sheet)',
      position: 'relative',
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    fullWidth: true,
    disabled: !ok,
    icon: "ClipboardCheck",
    onClick: () => onDone(task)
  }, "Concluir tarefa")));
}
window.TaskDetail = TaskDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/operator/TaskDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/operator/TaskList.jsx
try { (() => {
const TASKS = [{
  id: 1,
  type: 'battery',
  t: 'Trocar bateria',
  moto: 'VT-3310',
  bat: 12,
  addr: 'R. Augusta, 1020',
  dist: '350 m',
  pri: 'Alta'
}, {
  id: 2,
  type: 'collect',
  t: 'Recolher moto',
  moto: 'VT-1077',
  bat: 52,
  addr: 'Av. Rebouças, 880 · fora do ponto há 3 h',
  dist: '1,2 km',
  pri: 'Média'
}, {
  id: 3,
  type: 'maint',
  t: 'Levar para manutenção',
  moto: 'VT-2209',
  bat: 70,
  addr: 'Freio reportado por cliente',
  dist: '2,0 km',
  pri: 'Alta'
}, {
  id: 4,
  type: 'move',
  t: 'Reposicionar',
  moto: 'VT-0458',
  bat: 91,
  addr: 'Para: Pç. Oswaldo Cruz (demanda alta)',
  dist: '2,6 km',
  pri: 'Baixa'
}];
const TASK_ICON = {
  battery: ['BatteryCharging', 'info'],
  collect: ['Truck', 'sun'],
  maint: ['Wrench', 'danger'],
  move: ['MapPinned', 'brand']
};
function TaskList({
  onOpen,
  done
}) {
  const {
    SegmentedControl,
    ListRow,
    Card,
    Badge,
    StatTile,
    IconButton
  } = VDS;
  const [tab, setTab] = React.useState('Hoje');
  const list = tab === 'Hoje' ? TASKS.filter(t => !done.includes(t.id)) : TASKS.filter(t => done.includes(t.id));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink-900)',
      color: '#fff',
      padding: '58px 20px 20px',
      borderRadius: '0 0 28px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'rgba(255,255,255,.6)'
    }
  }, "Operador de campo \xB7 Turno 07\u201315h"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: '-.02em'
    }
  }, "Ol\xE1, Rafael")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "Bell",
    variant: "dark",
    dot: true,
    label: "Notifica\xE7\xF5es",
    style: {
      background: 'rgba(255,255,255,.1)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 8,
      marginTop: 16
    }
  }, [['Pendentes', TASKS.length - done.length], ['Concluídas', done.length], ['Baterias na van', '6']].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      padding: '10px 12px',
      borderRadius: 14,
      background: 'rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) 22px/1 var(--font-sans)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'rgba(255,255,255,.6)',
      marginTop: 4
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px 8px'
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    options: ['Hoje', 'Concluídas'],
    value: tab,
    onChange: setTab
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      scrollbarWidth: 'none',
      padding: '4px 20px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, list.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      padding: 40
    }
  }, "Nada por aqui."), list.map(t => {
    const [ic, tone] = TASK_ICON[t.type];
    return /*#__PURE__*/React.createElement(Card, {
      key: t.id,
      padding: 4,
      onClick: () => onOpen(t)
    }, /*#__PURE__*/React.createElement(ListRow, {
      icon: ic,
      iconTone: tone,
      title: t.t + ' · ' + t.moto,
      subtitle: t.addr,
      trailing: "chevron"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        padding: '0 14px 12px 62px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      size: "sm",
      tone: t.pri === 'Alta' ? 'danger' : t.pri === 'Média' ? 'warning' : 'neutral'
    }, t.pri), /*#__PURE__*/React.createElement(Badge, {
      size: "sm",
      tone: "neutral"
    }, t.dist), /*#__PURE__*/React.createElement(Badge, {
      size: "sm",
      tone: t.bat <= 20 ? 'danger' : 'success'
    }, t.bat, "%")));
  })));
}
Object.assign(window, {
  TaskList,
  TASKS,
  TASK_ICON
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/operator/TaskList.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.FLEET_STATUS = __ds_scope.FLEET_STATUS;

__ds_ns.FleetStatus = __ds_scope.FleetStatus;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.ProgressSteps = __ds_scope.ProgressSteps;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.OptionCard = __ds_scope.OptionCard;

__ds_ns.OtpInput = __ds_scope.OtpInput;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.BatteryPill = __ds_scope.BatteryPill;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.LocationHeader = __ds_scope.LocationHeader;

__ds_ns.PassCard = __ds_scope.PassCard;

__ds_ns.PhotoCapture = __ds_scope.PhotoCapture;

__ds_ns.ReservationBanner = __ds_scope.ReservationBanner;

__ds_ns.RouteInfoPill = __ds_scope.RouteInfoPill;

__ds_ns.SwipeAction = __ds_scope.SwipeAction;

__ds_ns.VehicleMarker = __ds_scope.VehicleMarker;

__ds_ns.VehicleSummary = __ds_scope.VehicleSummary;

__ds_ns.SideNav = __ds_scope.SideNav;

})();
