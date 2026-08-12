import React, { useMemo, useState } from "react";
import systemsIndex from "./data/index.json";
import records from "./data/records.generated.json";

type ExplanationBlock = {
  evidence: string;
  interpretation: string;
  implication: string;
};

type SystemDatum = {
  agii: number;
  casx: number;
  trajectory: "Medium" | "Large" | "Very Large";
  summary: string;
  primaryDriver: string;
  primaryConstraint: string;
  explanation: {
    agii: ExplanationBlock;
    casx: ExplanationBlock;
    trajectory: ExplanationBlock;
  };
  changes: {
    increase: string;
    decrease: string;
  };
};

type Point = {
  name: string;
  x: number;
  y: number;
  size: number;
  isSelected: boolean;
  isComparison: boolean;
};

type LabelBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type PlacedLabel = {
  name: string;
  textX: number;
  textY: number;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
  box: LabelBox;
};

const systemsData = Object.fromEntries(
  systemsIndex.systems.map((entry) => {
    const record = records[entry.id as keyof typeof records];

    return [
      entry.name,
      {
        agii: record.scores.agii,
        casx: record.scores.casx,
        trajectory: record.scores.trajectory,
        summary: record.summary,
        primaryDriver: record.primary_interpretation.driver,
        primaryConstraint: record.primary_interpretation.constraint,
        explanation: record.explanations,
        changes: {
          increase: record.change_levers.increase_risk,
          decrease: record.change_levers.decrease_risk
        }
      }
    ];
  })
) as Record<string, SystemDatum>;

function getBoundaryStatus(agii: number, casx: number): string {
  if (agii >= 3 && casx >= 3) return "Inside regime";
  if (agii >= 2.6 || casx >= 2.8) return "Near boundary";
  return "Below boundary";
}

function bubbleSize(label: SystemDatum["trajectory"]): number {
  if (label === "Very Large") return 22;
  if (label === "Large") return 17;
  return 13;
}

function formatDelta(delta: number): string {
  const rounded = Math.abs(delta).toFixed(1);
  if (delta > 0) return `+${rounded} ↗`;
  if (delta < 0) return `-${rounded} ↙`;
  return "0.0";
}

function compareHeadline(selectedName: string, comparisonName: string, selected: SystemDatum, comparison: SystemDatum): string {
  const agiiDiff = comparison.agii - selected.agii;
  const casxDiff = comparison.casx - selected.casx;

  if (Math.abs(agiiDiff) >= Math.abs(casxDiff)) {
    if (agiiDiff > 0.15) return `${comparisonName} exceeds ${selectedName} primarily due to stronger persistent agency pressure.`;
    if (agiiDiff < -0.15) return `${selectedName} exceeds ${comparisonName} primarily due to stronger persistent agency pressure.`;
  }
  if (casxDiff > 0.15) return `${comparisonName} exceeds ${selectedName} primarily due to greater power in action.`;
  if (casxDiff < -0.15) return `${selectedName} exceeds ${comparisonName} primarily due to greater power in action.`;
  return `${selectedName} and ${comparisonName} are broadly similar, with differences distributed across both axes.`;
}

function comparativeExplanation(selected: SystemDatum, comparison: SystemDatum) {
  const agiiDiff = comparison.agii - selected.agii;
  const casxDiff = comparison.casx - selected.casx;
  return {
    agii:
      agiiDiff > 0.15
        ? "Higher due to stronger persistence mechanisms, continuity, or task pressure."
        : agiiDiff < -0.15
          ? "Lower due to weaker persistence and less continuous task pressure."
          : "Similar levels of persistent agency pressure.",
    casx:
      casxDiff > 0.15
        ? "Higher due to greater autonomy, access, or real-world execution capacity."
        : casxDiff < -0.15
          ? "Lower due to reduced autonomy or more constrained tool use."
          : "Similar levels of power in action.",
    driver: Math.abs(agiiDiff) >= Math.abs(casxDiff) ? "Persistent Agency Pressure" : "Power in Action",
  };
}

function boxesOverlap(a: LabelBox, b: LabelBox, padding = 4) {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function estimateLabelWidth(text: string, fontSize = 11) {
  return text.length * (fontSize * 0.58);
}

function shortenLabel(name: string): string {
  const compact = name
    .replace(/^Claude\s+/i, "")
    .replace(/^Gemini\s+/i, "")
    .replace(/^GPT[-\s]?/i, "GPT-")
    .replace(/^Responses API$/i, "Responses")
    .replace(/^Claude Mythos Preview$/i, "Mythos")
    .replace(/^Claude Opus 4\.7$/i, "Opus 4.7")
    .replace(/^Gemini 3\.1 Pro$/i, "Gemini 3.1")
    .trim();

  return compact.length <= 16 ? compact : compact.replace(/\s+\([^)]*\)$/, "").trim();
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}


function InfoStrip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
      <div className="text-sm text-slate-500 mb-1">{title}</div>
      <div className="font-semibold text-slate-900">{body}</div>
    </div>
  );
}

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {subtitle ? <div className="text-sm text-slate-500 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function ExplanationCard({ title, block }: { title: string; block: ExplanationBlock }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 shadow-sm space-y-2">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-700"><span className="font-semibold">Evidence:</span> {block.evidence}</div>
      <div className="text-sm text-slate-700"><span className="font-semibold">Interpretation:</span> {block.interpretation}</div>
      <div className="text-sm text-slate-700"><span className="font-semibold">Implication:</span> {block.implication}</div>
    </div>
  );
}

function RiskMap({ systems, activeLabel, setActiveLabel }: { systems: Point[]; activeLabel: string | null; setActiveLabel: React.Dispatch<React.SetStateAction<string | null>> }) {
  const plotSize = 360;
  const pad = 26;
  const scaleX = (v: number) => pad + (v / 4) * (plotSize - pad * 2);
  const scaleY = (v: number) => plotSize - pad - (v / 4) * (plotSize - pad * 2);
  const horizontalY = scaleY(3);

  const selectedPoint = systems.find((s) => s.isSelected);
  const comparisonPoint = systems.find((s) => s.isComparison);

  const baseRenderPositions = new Map(
    systems.map((s) => [
      s.name,
      { cx: scaleX(s.x), cy: scaleY(s.y), radius: s.size / 2.8 }
    ])
  );

  const renderPositions = new Map(baseRenderPositions);

  if (selectedPoint && comparisonPoint) {
    const a = baseRenderPositions.get(selectedPoint.name)!;
    const b = baseRenderPositions.get(comparisonPoint.name)!;
    const d = distance({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy });

    if (d < 20) {
      const ux = d < 0.001 ? 1 : (b.cx - a.cx) / d;
      const uy = d < 0.001 ? 0 : (b.cy - a.cy) / d;
      const px = -uy;
      const py = ux;
      const separation = 8;

      renderPositions.set(selectedPoint.name, {
        ...a,
        cx: a.cx - px * separation,
        cy: a.cy - py * separation
      });

      renderPositions.set(comparisonPoint.name, {
        ...b,
        cx: b.cx + px * separation,
        cy: b.cy + py * separation
      });
    }
  }

  const quadrantReserved: LabelBox[] = [
    { x: scaleX(2.72), y: pad + 2, w: 118, h: 18 },
    { x: scaleX(0.55), y: scaleY(0.7) - 12, w: 48, h: 16 },
    { x: scaleX(0.42), y: scaleY(3.55) - 12, w: 112, h: 16 },
    { x: scaleX(3.06), y: scaleY(0.7) - 12, w: 92, h: 16 },
    { x: scaleX(3.02), y: scaleY(3.55) - 12, w: 124, h: 16 }
  ];

  const labelSystems = systems
    .filter((s) => s.isSelected || s.isComparison || activeLabel === s.name)
    .sort((a, b) => {
      const aPriority = (a.isSelected ? 100 : 0) + (a.isComparison ? 50 : 0) + (activeLabel === a.name ? 25 : 0) + a.size;
      const bPriority = (b.isSelected ? 100 : 0) + (b.isComparison ? 50 : 0) + (activeLabel === b.name ? 25 : 0) + b.size;
      return bPriority - aPriority;
    });

  const placedLabels: PlacedLabel[] = [];
  const haloSystems = systems.filter((s) => s.x >= 3 && s.y >= 3);

  for (const s of labelSystems) {
    const pos = renderPositions.get(s.name)!;
    const cx = pos.cx;
    const cy = pos.cy;
    const radius = pos.radius;

    const preferredLabel = s.name;
    const fallbackLabel = shortenLabel(s.name);
    const labelCandidates = s.isSelected || s.isComparison ? [preferredLabel] : [preferredLabel, fallbackLabel];

    let placed: PlacedLabel | null = null;

    for (const label of labelCandidates) {
      const fontSize = 11;
      const w = estimateLabelWidth(label, fontSize);
      const h = 14;

      const polarCandidates = [
        { angle: -35, dist: 16 },
        { angle: 30, dist: 16 },
        { angle: 145, dist: 16 },
        { angle: -145, dist: 16 },
        { angle: -90, dist: 18 },
        { angle: 90, dist: 18 },
        { angle: -35, dist: 28 },
        { angle: 30, dist: 28 },
        { angle: 145, dist: 28 },
        { angle: -145, dist: 28 },
        { angle: -90, dist: 32 },
        { angle: 90, dist: 32 }
      ];

      for (const candidate of polarCandidates) {
        const radians = (candidate.angle * Math.PI) / 180;
        const rawX = cx + Math.cos(radians) * (radius + candidate.dist);
        const rawY = cy + Math.sin(radians) * (radius + candidate.dist);

        let tx = rawX;
        if (candidate.angle > 100 || candidate.angle < -100) tx -= w;
        else if (candidate.angle > 70 || candidate.angle < -70) tx -= w / 2;

        const ty = rawY + 4;

        const box: LabelBox = {
          x: clamp(tx, 4, plotSize - w - 4),
          y: clamp(ty - h + 2, 4, plotSize - h - 4),
          w,
          h
        };

        const collidesWithLabels = placedLabels.some((p) => boxesOverlap(box, p.box, 8));
        const collidesWithReserved = quadrantReserved.some((q) => boxesOverlap(box, q, 8));

        if (!collidesWithLabels && !collidesWithReserved) {
          placed = {
            name: label,
            textX: box.x,
            textY: box.y + h - 2,
            lineX1: cx + Math.cos(radians) * radius * 0.8,
            lineY1: cy + Math.sin(radians) * radius * 0.8,
            lineX2: box.x + box.w / 2,
            lineY2: box.y + h / 2,
            box
          };
          break;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      const label = s.isSelected || s.isComparison ? preferredLabel : fallbackLabel;
      const w = estimateLabelWidth(label, 11);
      const h = 14;

      const forcedPositions = [
        { x: cx + 14, y: cy - 24 },
        { x: cx + 14, y: cy + 22 },
        { x: cx - w - 14, y: cy - 24 },
        { x: cx - w - 14, y: cy + 22 }
      ];

      const chosen = forcedPositions
        .map((p) => ({
          box: {
            x: clamp(p.x, 4, plotSize - w - 4),
            y: clamp(p.y, 4, plotSize - h - 4),
            w,
            h
          }
        }))
        .sort((a, b) => {
          const aPenalty =
            placedLabels.filter((p) => boxesOverlap(a.box, p.box, 8)).length +
            quadrantReserved.filter((q) => boxesOverlap(a.box, q, 8)).length * 3;
          const bPenalty =
            placedLabels.filter((p) => boxesOverlap(b.box, p.box, 8)).length +
            quadrantReserved.filter((q) => boxesOverlap(b.box, q, 8)).length * 3;
          return aPenalty - bPenalty;
        })[0];

      placed = {
        name: label,
        textX: chosen.box.x,
        textY: chosen.box.y + h - 2,
        lineX1: cx,
        lineY1: cy,
        lineX2: chosen.box.x + chosen.box.w / 2,
        lineY2: chosen.box.y + h / 2,
        box: chosen.box
      };
    }

    placedLabels.push(placed);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 overflow-hidden">
      <svg
        viewBox={`0 0 ${plotSize} ${plotSize}`}
        className="w-full h-auto"
        onClick={(e) => { if (e.target === e.currentTarget) setActiveLabel(null); }}
      >
        <defs>
          <linearGradient id="riskGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#fecaca" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#fca5a5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.42" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={plotSize} height={plotSize} fill="#f8fafc" rx="20" />

        {haloSystems.map((s) => {
          const pos = renderPositions.get(s.name)!;
          const haloR = pos.radius + 20;
          return (
            <g key={`halo-${s.name}`} pointerEvents="none">
              <circle cx={pos.cx} cy={pos.cy} r={haloR + 10} fill="#f59e0b" opacity="0.06" />
              <circle cx={pos.cx} cy={pos.cy} r={haloR} fill="#f59e0b" opacity="0.10" />
              <circle cx={pos.cx} cy={pos.cy} r={haloR - 8} fill="#fbbf24" opacity="0.10" />
            </g>
          );
        })}

        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line x1={scaleX(tick)} y1={pad} x2={scaleX(tick)} y2={plotSize - pad} stroke="#cbd5e1" strokeWidth="1" />
            <line x1={pad} y1={scaleY(tick)} x2={plotSize - pad} y2={scaleY(tick)} stroke="#cbd5e1" strokeWidth="1" />
          </g>
        ))}

        <rect x={scaleX(3)} y={pad} width={scaleX(4) - scaleX(3)} height={horizontalY - pad} fill="url(#riskGradient)" />
        <line x1={scaleX(3)} y1={pad} x2={scaleX(3)} y2={plotSize - pad} stroke="#dc2626" strokeDasharray="6 4" strokeWidth="2" />
        <line x1={pad} y1={horizontalY} x2={plotSize - pad} y2={horizontalY} stroke="#dc2626" strokeDasharray="6 4" strokeWidth="2" />

        <text x={scaleX(2.76)} y={pad + 14} fontSize="11" fill="#991b1b" fontWeight="600">Increasing risk regime</text>
        <text x={scaleX(0.6)} y={scaleY(0.7)} fontSize="11" fill="#64748b">Tools</text>
        <text x={scaleX(0.45)} y={scaleY(3.55)} fontSize="11" fill="#64748b">Powerful systems</text>
        <text x={scaleX(3.1)} y={scaleY(0.7)} fontSize="11" fill="#64748b">Latent agents</text>
        <text x={scaleX(3.02)} y={scaleY(3.55)} fontSize="11" fill="#64748b">Autonomous systems</text>

        {systems.map((s) => {
          const base = baseRenderPositions.get(s.name)!;
          const pos = renderPositions.get(s.name)!;
          const radius = pos.radius;
          const moved = Math.abs(base.cx - pos.cx) > 0.1 || Math.abs(base.cy - pos.cy) > 0.1;
          const isActive = activeLabel === s.name;

          return (
            <g
              key={s.name}
              onMouseEnter={() => setActiveLabel(s.name)}
              onMouseLeave={() => setActiveLabel((prev) => (prev === s.name ? null : prev))}
              onClick={() => setActiveLabel((prev) => (prev === s.name ? null : s.name))}
              style={{ cursor: "pointer" }}
            >
              {moved ? (
                <line
                  x1={base.cx}
                  y1={base.cy}
                  x2={pos.cx}
                  y2={pos.cy}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              ) : null}
              {s.isSelected ? <circle cx={pos.cx} cy={pos.cy} r={radius + 7} fill="#93c5fd" opacity="0.35" /> : null}
              {s.isComparison ? <circle cx={pos.cx} cy={pos.cy} r={radius + 7} fill="#ddd6fe" opacity="0.45" /> : null}
              {isActive && !s.isSelected && !s.isComparison ? <circle cx={pos.cx} cy={pos.cy} r={radius + 6} fill="#bfdbfe" opacity="0.35" /> : null}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={radius}
                fill={s.isSelected ? "#1d4ed8" : s.isComparison ? "#7c3aed" : "#2563eb"}
                stroke={s.isSelected || s.isComparison || isActive ? "#ffffff" : "none"}
                strokeWidth={s.isSelected || s.isComparison || isActive ? 2 : 0}
                fillOpacity={s.isSelected || s.isComparison ? 0.95 : isActive ? 0.85 : 0.55}
              />
            </g>
          );
        })}

        {placedLabels.map((label) => (
          <g key={`label-${label.name}`}>
            <line
              x1={label.lineX1}
              y1={label.lineY1}
              x2={label.lineX2}
              y2={label.lineY2}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <rect
              x={label.box.x - 3}
              y={label.box.y - 1}
              width={label.box.w + 6}
              height={label.box.h + 2}
              rx="4"
              fill="white"
              fillOpacity="0.94"
            />
            <text x={label.textX} y={label.textY} fontSize="11" fill="#0f172a">
              {label.name}
            </text>
          </g>
        ))}

        <text x={plotSize / 2} y={plotSize - 4} textAnchor="middle" fontSize="12" fill="#475569">
          Persistent Agency Pressure (AGII)
        </text>
        <text
          x="12"
          y={plotSize / 2}
          transform={`rotate(-90 12 ${plotSize / 2})`}
          textAnchor="middle"
          fontSize="12"
          fill="#475569"
        >
          Power in Action (CASX)
        </text>
      </svg>
    </div>
  );
}

export default function LossOfControlDiagnosticInterface() {
  const systemNames = systemsIndex.systems.map((s) => s.name);
  const [selected, setSelected] = useState<string>("");
  const [comparison, setComparison] = useState<string>("");
  const [showAll, setShowAll] = useState<boolean>(true);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const effectiveComparison =
    selected && comparison === selected
      ? systemNames.find((n) => n !== selected) ?? ""
      : comparison;

  const data = selected ? systemsData[selected] : null;
  const comparisonData = effectiveComparison ? systemsData[effectiveComparison] : null;
  const boundary = data ? getBoundaryStatus(data.agii, data.casx) : "";
  const comp = data && comparisonData ? comparativeExplanation(data, comparisonData) : null;

  const systems = useMemo(() => {
    return systemNames.map((name) => ({
      name,
      x: systemsData[name].agii,
      y: systemsData[name].casx,
      size: bubbleSize(systemsData[name].trajectory),
      isSelected: name === selected,
      isComparison: name === effectiveComparison && effectiveComparison !== selected,
    }));
  }, [systemNames, selected, effectiveComparison]);

  const displayedSystems = showAll ? systems : systems.filter((s) => s.isSelected || s.isComparison);
  const comparisonOptions = systemNames.filter((n) => n !== selected);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-500">AI System Risk Map</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">AGII–CASX–T Diagnostic</h1>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Compare persistent agency pressure, deployable power, and trajectory across AI systems, agents, and scenarios.
            </p>
          </div>

          <div className="grid gap-3 w-full md:w-auto">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600" htmlFor="system-picker">Analyze system:</label>
              <select id="system-picker" value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2 bg-white w-full min-w-[240px]">
                <option value="">Select a system to analyze…</option>
                {systemNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600" htmlFor="comparison-picker">Compare to:</label>
              <select id="comparison-picker" value={effectiveComparison} onChange={(e) => setComparison(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2 bg-white w-full min-w-[240px]">
                {comparisonOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
        </header>

        {!data ? (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="text-slate-500">Choose a model, system, or scenario from the picker to view its risk profile and compare it to another entry.</div>
          </section>
        ) : (
          <>
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">System</div>
                <div className="text-2xl font-semibold text-slate-900">{selected}</div>
                <div className="text-sm text-slate-500 mt-2">Summary</div>
                <div className="text-lg font-medium text-slate-900">{data.summary}</div>
              </div>

              {comparisonData ? (
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Key difference</div>
                    <div className="font-semibold text-slate-900">{compareHeadline(selected, effectiveComparison, data, comparisonData)}</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoStrip title="Structural difference" body={`AGII ${formatDelta(comparisonData.agii - data.agii)} · CASX ${formatDelta(comparisonData.casx - data.casx)}`} />
                    <InfoStrip title="Why different: AGII" body={comp?.agii ?? ""} />
                    <InfoStrip title="Why different: CASX" body={comp?.casx ?? ""} />
                  </div>
                  <InfoStrip title="Primary difference driver" body={comp?.driver ?? ""} />
                </div>
              ) : null}

              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard label={`${selected} · AGII`} value={data.agii.toFixed(1)} subtitle="Persistent Agency Pressure" />
                <MetricCard label={`${selected} · CASX`} value={data.casx.toFixed(1)} subtitle="Power in Action" />
                <MetricCard label={`${selected} · Trajectory`} value={data.trajectory} subtitle={`Boundary: ${boundary}`} />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <ExplanationCard title="AGII" block={data.explanation.agii} />
                <ExplanationCard title="CASX" block={data.explanation.casx} />
                <ExplanationCard title="Trajectory" block={data.explanation.trajectory} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InfoStrip title="Primary driver" body={data.primaryDriver} />
                <InfoStrip title="Primary constraint" body={data.primaryConstraint} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InfoStrip title="Increase risk ↗" body={data.changes.increase} />
                <InfoStrip title="Decrease risk ↙" body={data.changes.decrease} />
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold">Risk map</h2>
                  <div className="text-sm text-slate-500">Selected system in blue, comparison system in purple</div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-900">
                  <input type="checkbox" checked={!showAll} onChange={(e) => setShowAll(!e.target.checked)} className="h-4 w-4" />
                  Focus on pair
                </label>
              </div>
              <RiskMap systems={displayedSystems} activeLabel={activeLabel} setActiveLabel={setActiveLabel} />
              <div className="mt-2 text-xs text-slate-500">Hover points on desktop, or tap points on mobile, to reveal labels.</div>
              {displayedSystems.some((s) => s.x >= 3 && s.y >= 3) ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">Note.</span> A soft halo marks systems in the upper-right quadrant: high persistent agency pressure and high power in action. The halo is a visual caution, not a separate score, and does not by itself encode humanity-scale reach or existential impact.
                </div>
              ) : null}
            </section>
          </>
        )}

        <footer className="text-sm text-slate-500 pt-2">
          Framework based on Joe Carlsmith, “When should we worry about AI power-seeking?” and William Leiss & Richard Smith, “From Tool to Actor” (2026).
        </footer>
      </div>
    </div>
  );
}
