// src/components/profit-pilot/ProFunnel.tsx
import React from "react";

type Stage = "TOFU" | "MOFU" | "BOFU";
type IconPair = { left?: string; right?:string; badge?:string };
type Labels = Record<Stage, { title: string; lines: string[] }>;

type Props = {
  width?: number;
  labels?: Labels;
};

// ไอคอน Fallback แบบ SVG Data URI ที่วาดขึ้นมาให้เหมือนในภาพที่สุด
const FALLBACK_ICONS = {
  TOFU: {
    left: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-15 50 50)"><path d="M65 35 a30 30 0 0 1 0 30" fill="none" stroke="#E53935" stroke-width="8"/><path d="M60 25 L30 40 L30 60 L60 75" fill="#EEEEEE" stroke="#BDBDBD" stroke-width="1"/><path d="M60 25 L85 25 L85 75 L60 75" fill="#F44336" stroke="#E53935" stroke-width="1"/><rect x="20" y="45" width="10" height="10" fill="#EEEEEE" rx="2" stroke="#BDBDBD" stroke-width="1"/></g></svg>`),
    right: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="shadow"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/></filter></defs><g filter="url(#shadow)"><path d="M80 90 L80 87 a10,10 0 0,0 -10,-10 L30 77 a10,10 0 0,0 -10,10 v3 z" fill="#42A5F5" /><rect x="20" y="10" width="60" height="80" rx="10" fill="#42A5F5"/><rect x="25" y="15" width="50" height="65" rx="5" fill="#212121"/><polygon points="45,30 65,42 45,54" fill="#F44336"/><path d="M80 30 L80 27 a5,5 0 0,0 -5,-5 L70 22 a5,5 0 0,0 -5,5 v3 z" fill="#FFFFFF" /><path d="M72.1,28.5 a2,2 0 1,1 4,2 a3,3 0 0,1 -4,-2" fill="#F44336"/><path d="M90 50 L90 47 a5,5 0 0,0 -5,-5 L80 42 a5,5 0 0,0 -5,5 v3 z" fill="#FFFFFF" /><path d="M82.1,48.5 a2,2 0 1,1 4,2 a3,3 0 0,1 -4,-2" fill="#F44336"/></g></svg>`)
  },
  MOFU: {
    left: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g"><stop offset="60%" stop-color="white"/><stop offset="100%" stop-color="#E0E0E0"/></radialGradient><filter id="f"><feDropShadow dx="2" dy="4" stdDeviation="2" flood-opacity="0.3"/></filter></defs><g filter="url(#f)"><circle cx="50" cy="50" r="40" fill="#D32F2F"/><circle cx="50" cy="50" r="28" fill="url(#g)"/><circle cx="50" cy="50" r="15" fill="#D32F2F"/><path d="M50 50 L85 25" stroke="#B71C1C" stroke-width="6" stroke-linecap="round"/></g></svg>`),
    right: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="f2"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/></filter></defs><g filter="url(#f2)"><rect x="20" y="10" width="60" height="85" rx="10" fill="#E0E0E0"/><rect x="25" y="15" width="50" height="75" rx="5" fill="#FFFFFF"/><path d="M40 40 A 15 15 0 1 1 60 40" fill="#29B6F6"/><path d="M60 40 A 15 15 0 0 1 40 40" fill="#009688"/><path d="M40 70 A 15 15 0 1 1 60 70" fill="#009688"/><path d="M60 70 A 15 15 0 0 1 40 70" fill="#29B6F6"/><path d="M80 60 L80 57 a5,5 0 0,0 -5,-5 L70 52 a5,5 0 0,0 -5,5 v3 z" fill="#42A5F5" /><rect x="71" y="58" width="8" height="15" fill="#42A5F5" rx="2" /></g></svg>`)
  },
  BOFU: {
    left: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g2"><stop offset="80%" stop-color="#FFC107"/><stop offset="100%" stop-color="#FFA000"/></radialGradient><filter id="f3"><feDropShadow dx="2" dy="4" stdDeviation="2" flood-opacity="0.4"/></filter></defs><g filter="url(#f3)"><circle cx="50" cy="50" r="38" fill="url(#g2)"/><path d="M42 65 Q50 70 58 65 L58 35 Q50 30 42 35 Z" fill="#F57F17" opacity="0.5"/><text x="50" y="62" font-size="40" font-family="Arial, sans-serif" font-weight="bold" fill="#B76D00" text-anchor="middle">$</text></g></svg>`),
    right: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="f4"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-opacity="0.3"/></filter></defs><g filter="url(#f4)"><rect x="20" y="40" width="55" height="35" rx="5" fill="#42A5F5"/><circle cx="35" cy="80" r="6" fill="#1E88E5"/><circle cx="65" cy="80" r="6" fill="#1E88E5"/><rect x="25" y="45" width="8" height="25" fill="#1976D2"/><rect x="40" y="45" width="8" height="25" fill="#1976D2"/><rect x="55" y="45" width="8" height="25" fill="#1976D2"/><g transform="rotate(15 70 35)"><rect x="60" y="25" width="30" height="18" rx="4" fill="#F44336"/><text x="75" y="40" font-size="12" font-family="Arial" fill="white" font-weight="bold" text-anchor="middle">SALE</text></g></g></svg>`),
    badge: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#81C784"/><stop offset="100%" stop-color="#4CAF50"/></linearGradient><filter id="f5"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.3"/></filter></defs><g filter="url(#f5)"><rect x="15" y="60" width="15" height="30" fill="url(#g3)" rx="3"/><rect x="40" y="45" width="15" height="45" fill="url(#g3)" rx="3"/><rect x="65" y="30" width="15" height="60" fill="url(#g3)" rx="3"/><path d="M15 50 Q45 20, 80 35" stroke="#FFC107" stroke-width="10" fill="none" stroke-linecap="round"/></g></svg>`)
  }
};

const DEFAULT_LABELS: Labels = {
  TOFU: { title: "TOFU", lines: ["Top of Funnel:", "VDOs / Social Media"] },
  MOFU: { title: "MOFU", lines: ["Middle of Funnel:", "White Papers / Case Studies"] },
  BOFU: { title: "BOFU", lines: ["Bottom of Funnel", "Incentives and Offers / Sales"] },
};

export default function ProFunnel({ width = 450, labels = DEFAULT_LABELS }: Props) {
  const height = (width / 450) * 600;
  const scale = width / 450;

  const FunnelLayer = ({
    points,
    shadowPoints,
    color,
    iconLeft,
    iconRight,
    iconBadge,
    label,
  }: {
    points: string;
    shadowPoints: string;
    color: string;
    iconLeft?: string;
    iconRight?: string;
    iconBadge?: string;
    label: { title: string; lines: string[] };
  }) => (
    <g>
      <polygon points={shadowPoints} fill="#000" opacity="0.15" />
      <polygon points={points} fill={color} />
      
      {iconLeft && <image href={iconLeft} x={-10 * scale} y={-15 * scale} width={180 * scale} height={180 * scale} />}
      {iconRight && <image href={iconRight} x={280 * scale} y={-15 * scale} width={180 * scale} height={180 * scale} />}
      {iconBadge && <image href={iconBadge} x={175 * scale} y={90 * scale} width={100 * scale} height={100 * scale} />}

      <text
        x={225 * scale}
        y={40 * scale}
        textAnchor="middle"
        fill="white"
        fontSize={40 * scale}
        fontWeight="bold"
      >
        {label.title}
      </text>
      <text
        textAnchor="middle"
        fill="white"
        fontSize={18 * scale}
        opacity="0.9"
      >
        {label.lines.map((line, i) => (
          <tspan key={i} x={225 * scale} dy={i === 0 ? `${80 * scale}px` : `${22 * scale}px`}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
       <defs>
        <filter id="funnel-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>
      <g transform={`scale(${scale})`} filter="url(#funnel-shadow)">
        <g transform="translate(0, 400)">
          <FunnelLayer
            points="20,10 430,10 380,115 70,115"
            shadowPoints="70,115 380,115 370,125 80,125"
            color="#1D8C91"
            iconLeft={FALLBACK_ICONS.BOFU.left}
            iconRight={FALLBACK_ICONS.BOFU.right}
            iconBadge={FALLBACK_ICONS.BOFU.badge}
            label={labels.BOFU}
          />
        </g>
        <g transform="translate(0, 200)">
          <FunnelLayer
            points="40,5 410,5 380,110 70,110"
            shadowPoints="70,110 380,110 350,120 100,120"
            color="#22C7C1"
            iconLeft={FALLBACK_ICONS.MOFU.left}
            iconRight={FALLBACK_ICONS.MOFU.right}
            label={labels.MOFU}
          />
        </g>
        <g>
          <FunnelLayer
            points="60,0 390,0 380,105 70,105"
            shadowPoints="70,105 380,105 340,115 110,115"
            color="#2FA4FF"
            iconLeft={FALLBACK_ICONS.TOFU.left}
            iconRight={FALLBACK_ICONS.TOFU.right}
            label={labels.TOFU}
          />
        </g>
      </g>
    </svg>
  );
}
