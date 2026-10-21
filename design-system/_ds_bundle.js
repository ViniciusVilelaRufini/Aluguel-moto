/* @ds-bundle: {"format":4,"namespace":"VoltiDesignSystem_09a717","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"FLEET_STATUS","sourcePath":"components/data/FleetStatus.jsx"},{"name":"FleetStatus","sourcePath":"components/data/FleetStatus.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"BottomSheet","sourcePath":"components/feedback/BottomSheet.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"ProgressSteps","sourcePath":"components/feedback/ProgressSteps.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"OptionCard","sourcePath":"components/forms/OptionCard.jsx"},{"name":"OtpInput","sourcePath":"components/forms/OtpInput.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"BatteryPill","sourcePath":"components/mobility/BatteryPill.jsx"},{"name":"ListRow","sourcePath":"components/mobility/ListRow.jsx"},{"name":"LocationHeader","sourcePath":"components/mobility/LocationHeader.jsx"},{"name":"PassCard","sourcePath":"components/mobility/PassCard.jsx"},{"name":"PhotoCapture","sourcePath":"components/mobility/PhotoCapture.jsx"},{"name":"ReservationBanner","sourcePath":"components/mobility/ReservationBanner.jsx"},{"name":"RouteInfoPill","sourcePath":"components/mobility/RouteInfoPill.jsx"},{"name":"SwipeAction","sourcePath":"components/mobility/SwipeAction.jsx"},{"name":"VehicleMarker","sourcePath":"components/mobility/VehicleMarker.jsx"},{"name":"VehicleSummary","sourcePath":"components/mobility/VehicleSummary.jsx"},{"name":"SideNav","sourcePath":"components/navigation/SideNav.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"6a8bde5ab94f","components/core/Button.jsx":"be7cacbbc73d","components/core/Card.jsx":"32577861a542","components/core/Chip.jsx":"99d40f3fc872","components/core/Icon.jsx":"d78cbe537f30","components/core/IconButton.jsx":"56136ed17b34","components/data/DataTable.jsx":"7ecae1defc33","components/data/FleetStatus.jsx":"0243a9b7eacc","components/data/StatTile.jsx":"05d0b199b4d5","components/feedback/Alert.jsx":"8a8b635f301c","components/feedback/BottomSheet.jsx":"c506f945ed96","components/feedback/Dialog.jsx":"0ba9e5c7b4f1","components/feedback/ProgressSteps.jsx":"d09a2ab25e84","components/feedback/Toast.jsx":"80873ac9609d","components/forms/Checkbox.jsx":"0a611163df85","components/forms/Input.jsx":"6eb8322e2000","components/forms/OptionCard.jsx":"e3b153f8861a","components/forms/OtpInput.jsx":"f41921213a09","components/forms/SegmentedControl.jsx":"4c08a328a9f8","components/forms/Switch.jsx":"e3ae98262fc6","components/mobility/BatteryPill.jsx":"0b8d117f30d1","components/mobility/ListRow.jsx":"de2e623fe1b0","components/mobility/LocationHeader.jsx":"56fa953cb035","components/mobility/PassCard.jsx":"aa5d19848661","components/mobility/PhotoCapture.jsx":"f82edab8d9a8","components/mobility/ReservationBanner.jsx":"6be67efcd11c","components/mobility/RouteInfoPill.jsx":"7e256e2cd87a","components/mobility/SwipeAction.jsx":"c0bbdf6251f8","components/mobility/VehicleMarker.jsx":"9872ae564921","components/mobility/VehicleSummary.jsx":"a5094285e484","components/navigation/SideNav.jsx":"e1acde8f0266","ui_kits/admin/AdminApp.jsx":"890c1fb08cd7","ui_kits/admin/AdminMap.jsx":"22342cd89b67","ui_kits/admin/AlertsView.jsx":"7f6af63f54ae","ui_kits/admin/FinanceView.jsx":"7725b4dfc914","ui_kits/admin/FleetView.jsx":"2fa0abb58321","ui_kits/admin/ZonesView.jsx":"afd5287f81a0","ui_kits/app/AccountScreen.jsx":"c69f11478fdc","ui_kits/app/ClientApp.jsx":"56f12e4aec10","ui_kits/app/HomeScreen.jsx":"666c73717a68","ui_kits/app/MapView.jsx":"8e87edb3dc63","ui_kits/app/Onboarding.jsx":"b13529d83cbc","ui_kits/app/PickScreen.jsx":"e0d71a8aa10e","ui_kits/app/PlanScreen.jsx":"42cff9c9ebd1","ui_kits/app/ReservedScreen.jsx":"a255c367bedf","ui_kits/app/ReturnScreen.jsx":"1805f782f058","ui_kits/app/RideScreen.jsx":"fd4c1c118a08","ui_kits/app/ScanScreen.jsx":"6c0fec0dd986","ui_kits/app/SummaryScreen.jsx":"fe1fcbc06cbf","ui_kits/app/doc-page.js":"f52ae9c02fca","ui_kits/app/ios-frame.jsx":"24642b887be3","ui_kits/operator/OperatorApp.jsx":"6dc03a6cd5ed","ui_kits/operator/TaskDetail.jsx":"29ce3f81abd8","ui_kits/operator/TaskList.jsx":"d36dff1832fd"},"inlinedExternals":[],"unexposedExports":[]} */

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
    sh: 'var(--shadow-brand)'
  },
  secondary: {
    bg: 'var(--surface-card)',
    fg: 'var(--brand)',
    bd: 'var(--brand)',
    sh: 'none'
  },
  ghost: {
    bg: 'transparent',
    fg: 'var(--text-primary)',
    bd: 'transparent',
    sh: 'none'
  },
  dark: {
    bg: 'var(--surface-inverse)',
    fg: 'var(--text-on-inverse)',
    bd: 'transparent',
    sh: 'var(--shadow-2)'
  },
  danger: {
    bg: 'var(--danger)',
    fg: 'var(--white)',
    bd: 'transparent',
    sh: 'var(--shadow-coral)'
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
  onClick,
  type = 'button',
  style
}) {
  const [p, setP] = React.useState(false);
  const s = SIZES[size] || SIZES.md,
    v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setP(true),
    onPointerUp: () => setP(false),
    onPointerLeave: () => setP(false),
    style: {
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
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transform: p && !disabled ? 'scale(var(--press-scale))' : 'none',
      filter: p && !disabled ? 'brightness(.94)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-out), filter var(--dur-fast)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.ic
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
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
      transition: 'background var(--dur-base), border-color var(--dur-base)',
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
      transform: p ? 'scale(.92)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-out)',
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
      transition: 'transform var(--dur-slow) var(--ease-out)',
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
  }), children);
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
      transition: 'background var(--dur-base), border-color var(--dur-base)',
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
      background: 'var(--brand)'
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
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
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
      transition: 'all var(--dur-base) var(--ease-spring)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
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
      boxSizing: 'border-box'
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
}];
function Placeholder({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-secondary)'
    }
  }, label, " \u2014 fora do escopo deste kit.");
}
function AdminApp() {
  const [v, setV] = React.useState(() => localStorage.getItem('volti-admin-view') || 'fleet');
  const go = x => {
    setV(x);
    localStorage.setItem('volti-admin-view', x);
  };
  const view = v === 'fleet' ? /*#__PURE__*/React.createElement(FleetView, null) : v === 'alerts' ? /*#__PURE__*/React.createElement(AlertsView, null) : v === 'zones' ? /*#__PURE__*/React.createElement(ZonesView, null) : v === 'finance' ? /*#__PURE__*/React.createElement(FinanceView, null) : /*#__PURE__*/React.createElement(Placeholder, {
    label: NAV.find(n => n.value === v).label
  });
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
  }, view)));
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
function ClientApp() {
  const [s, setS] = React.useState(() => localStorage.getItem('volti-kit-screen') || 'home');
  const [veh, setVeh] = React.useState(VEHICLES[0]);
  const [toast, setToast] = React.useState(null);
  const go = (x, t) => {
    setS(x);
    localStorage.setItem('volti-kit-screen', x);
    if (t) {
      setToast(t);
      setTimeout(() => setToast(null), 2800);
    }
  };
  let screen;
  if (s === 'onboarding') screen = /*#__PURE__*/React.createElement(Onboarding, {
    onDone: () => go('home', 'Cadastro enviado. Verificação em até 2 min.')
  });else if (s === 'home') screen = /*#__PURE__*/React.createElement(HomeScreen, {
    toast: toast,
    onAccount: () => go('account'),
    onList: () => go('pick'),
    onReserve: v => {
      setVeh(v);
      go('reserved');
    },
    onScan: () => go('scan')
  });else if (s === 'pick') screen = /*#__PURE__*/React.createElement(PickScreen, {
    onBack: () => go('home'),
    onMap: () => go('home'),
    onReserve: v => {
      setVeh(v);
      go('reserved');
    }
  });else if (s === 'reserved') screen = /*#__PURE__*/React.createElement(ReservedScreen, {
    vehicle: veh,
    onCancel: () => go('home', 'Reserva cancelada'),
    onScan: () => go('scan')
  });else if (s === 'scan') screen = /*#__PURE__*/React.createElement(ScanScreen, {
    onBack: () => go('home'),
    onUnlocked: () => go('plan')
  });else if (s === 'plan') screen = /*#__PURE__*/React.createElement(PlanScreen, {
    onBack: () => go('scan'),
    onConfirm: () => go('ride')
  });else if (s === 'ride') screen = /*#__PURE__*/React.createElement(RideScreen, {
    onEnd: () => go('return')
  });else if (s === 'return') screen = /*#__PURE__*/React.createElement(ReturnScreen, {
    onBack: () => go('ride'),
    onDone: () => go('summary')
  });else if (s === 'account') screen = /*#__PURE__*/React.createElement(AccountScreen, {
    onBack: () => go('home')
  });else screen = /*#__PURE__*/React.createElement(SummaryScreen, {
    onDone: () => go('home', 'Obrigado por andar de Volti')
  });
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
    selected: k === s,
    onClick: () => go(k)
  }, l))), /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    "data-screen-label": s,
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }
  }, screen)));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(ClientApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ClientApp.jsx", error: String((e && e.message) || e) }); }

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
    style: {
      padding: '0 20px'
    }
  }, /*#__PURE__*/React.createElement(LocationHeader, {
    initials: "AL",
    address: "Av. Paulista, 1578",
    onAvatar: onAvatar
  })), /*#__PURE__*/React.createElement("div", {
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
    style: {
      display: 'flex',
      gap: 8,
      padding: '2px 20px',
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
    style: {
      display: 'flex',
      gap: 8,
      margin: '18px 0 12px',
      overflowX: 'auto'
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
  }, /*#__PURE__*/React.createElement(MapView, null, VEHICLES.map(x => /*#__PURE__*/React.createElement(Pin, {
    key: x.id,
    x: x.x,
    y: x.y
  }, /*#__PURE__*/React.createElement(VehicleMarker, {
    level: x.level,
    selected: x.id === sel,
    onClick: () => setSel(x.id)
  }))), /*#__PURE__*/React.createElement(UserDot, {
    x: 200,
    y: 430
  })), /*#__PURE__*/React.createElement(TopOverlay, {
    onAvatar: onAccount
  }), !v && /*#__PURE__*/React.createElement("div", {
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
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%,-50%)',
      zIndex: 6
    }
  }, !heading && /*#__PURE__*/React.createElement("div", {
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
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--brand)',
      border: '4px solid #fff',
      boxShadow: '0 0 0 6px rgba(52,194,92,.2)'
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
    strokeLinejoin: "round"
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
        transition: 'all var(--dur-base) var(--ease-out)'
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
        background: 'var(--brand)'
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
  }, paused ? 'R$ 0,20/min' : 'Ao vivo')), /*#__PURE__*/React.createElement("div", {
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
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--brand)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-brand)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "LockOpen",
    size: 26
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
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--brand)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-brand)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 28,
    strokeWidth: 3
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
      color: n <= stars ? 'var(--sun-400)' : 'var(--ink-300)'
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
