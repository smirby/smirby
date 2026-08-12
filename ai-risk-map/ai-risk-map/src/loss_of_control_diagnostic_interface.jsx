import { useMemo, useState } from "react";
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

type LabelBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

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

function RiskMap({ systems }: { systems: Point[] }) {
  const plotSize = 360;
  const pad = 26;

  const scaleX = (v: number) => pad + (v / 4) * (plotSize - pad * 2);
  const scaleY = (v: number) => plotSize - pad - (v / 4) * (plotSize - pad * 2);

  const horizontalY = scaleY(3);

  const quadrantReserved: LabelBox[] = [
    { x: scaleX(3) + 4, y: pad + 6, w: 120, h: 16 },         // Increasing risk regime
    { x: scaleX(0.45), y: scaleY(0.7) - 10, w: 50, h: 16 },  // Tools
    { x: scaleX(0.45), y: scaleY(3.55) - 10, w: 110, h: 16 },// Powerful systems
    { x: scaleX(3.1), y: scaleY(0.7) - 10, w: 90, h: 16 },   // Latent agents
    { x: scaleX(3.1), y: scaleY(3.55) - 10, w: 120, h: 16 }  // Autonomous systems
  ];

  const placedLabels: Array<{
    name: string;
    textX: number;
    textY: number;
    lineX1: number;
    lineY1: number;
    lineX2: number;
    lineY2: number;
    box: LabelBox;
  }> = [];

  const sortedSystems = [...systems].sort((a, b) => {
    const aPriority = (a.isSelected ? 2 : 0) + (a.isComparison ? 1 : 0);
    const bPriority = (b.isSelected ? 2 : 0) + (b.isComparison ? 1 : 0);
    return bPriority - aPriority;
  });

  for (const s of sortedSystems) {
    const cx = scaleX(s.x);
    const cy = scaleY(s.y);
    const radius = s.size / 2.8;

    const label = s.name;
    const fontSize = 11;
    const w = estimateLabelWidth(label, fontSize);
    const h = 14;

    const candidates = [
      { tx: cx + 10,      ty: cy - 10,     anchorX: cx + radius, anchorY: cy - radius }, // top-right
      { tx: cx + 10,      ty: cy + 18,     anchorX: cx + radius, anchorY: cy + radius }, // bottom-right
      { tx: cx - w - 10,  ty: cy - 10,     anchorX: cx - radius, anchorY: cy - radius }, // top-left
      { tx: cx - w - 10,  ty: cy + 18,     anchorX: cx - radius, anchorY: cy + radius }, // bottom-left
      { tx: cx - w / 2,   ty: cy - 14 - radius, anchorX: cx,     anchorY: cy - radius }, // above
      { tx: cx - w / 2,   ty: cy + 20 + radius / 2, anchorX: cx, anchorY: cy + radius }  // below
    ];

    let placed = null;

    for (const c of candidates) {
      const box: LabelBox = {
        x: clamp(c.tx, 4, plotSize - w - 4),
        y: clamp(c.ty - h + 2, 4, plotSize - h - 4),
        w,
        h
      };

      const collidesWithLabels = placedLabels.some((p) => boxesOverlap(box, p.box, 6));
      const collidesWithReserved = quadrantReserved.some((q) => boxesOverlap(box, q, 6));

      if (!collidesWithLabels && !collidesWithReserved) {
        placed = {
          name: label,
          textX: box.x,
          textY: box.y + h - 2,
          lineX1: c.anchorX,
          lineY1: c.anchorY,
          lineX2: box.x + 2,
          lineY2: box.y + h / 2,
          box
        };
        break;
      }
    }

    if (!placed) {
      // Fallback: only force labels for selected/comparison points
      if (s.isSelected || s.isComparison) {
        const box: LabelBox = {
          x: clamp(cx + 12, 4, plotSize - w - 4),
          y: clamp(cy - 24, 4, plotSize - h - 4),
          w,
          h
        };
        placed = {
          name: label,
          textX: box.x,
          textY: box.y + h - 2,
          lineX1: cx + radius,
          lineY1: cy,
          lineX2: box.x + 2,
          lineY2: box.y + h / 2,
          box
        };
      }
    }

    if (placed) placedLabels.push(placed);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 overflow-hidden">
      <svg viewBox={`0 0 ${plotSize} ${plotSize}`} className="w-full h-auto">
        <defs>
          <linearGradient id="riskGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#fecaca" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#fca5a5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.42" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={plotSize} height={plotSize} fill="#f8fafc" rx="20" />

        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line x1={scaleX(tick)} y1={pad} x2={scaleX(tick)} y2={plotSize - pad} stroke="#cbd5e1" strokeWidth="1" />
            <line x1={pad} y1={scaleY(tick)} x2={plotSize - pad} y2={scaleY(tick)} stroke="#cbd5e1" strokeWidth="1" />
          </g>
        ))}

        <rect x={scaleX(3)} y={pad} width={scaleX(4) - scaleX(3)} height={horizontalY - pad} fill="url(#riskGradient)" />
        <line x1={scaleX(3)} y1={pad} x2={scaleX(3)} y2={plotSize - pad} stroke="#dc2626" strokeDasharray="6 4" strokeWidth="2" />
        <line x1={pad} y1={horizontalY} x2={plotSize - pad} y2={horizontalY} stroke="#dc2626" strokeDasharray="6 4" strokeWidth="2" />

        <text x={scaleX(3) + 8} y={pad + 18} fontSize="11" fill="#991b1b" fontWeight="600">Increasing risk regime</text>
        <text x={scaleX(0.6)} y={scaleY(0.7)} fontSize="11" fill="#64748b">Tools</text>
        <text x={scaleX(0.45)} y={scaleY(3.55)} fontSize="11" fill="#64748b">Powerful systems</text>
        <text x={scaleX(3.12)} y={scaleY(0.7)} fontSize="11" fill="#64748b">Latent agents</text>
        <text x={scaleX(3.1)} y={scaleY(3.55)} fontSize="11" fill="#64748b">Autonomous systems</text>

        {systems.map((s) => {
          const cx = scaleX(s.x);
          const cy = scaleY(s.y);
          const radius = s.size / 2.8;
          return (
            <g key={s.name}>
              {s.isSelected ? <circle cx={cx} cy={cy} r={radius + 6} fill="#93c5fd" opacity="0.35" /> : null}
              {s.isComparison ? <circle cx={cx} cy={cy} r={radius + 6} fill="#ddd6fe" opacity="0.35" /> : null}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={s.isSelected ? "#1d4ed8" : s.isComparison ? "#7c3aed" : "#2563eb"}
                fillOpacity={s.isSelected || s.isComparison ? 0.92 : 0.55}
              />
            </g>
          );
        })}

        {placedLabels.map((l) => (
          <g key={`label-${l.name}`}>
            <line
              x1={l.lineX1}
              y1={l.lineY1}
              x2={l.lineX2}
              y2={l.lineY2}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <rect
              x={l.box.x - 3}
              y={l.box.y - 1}
              width={l.box.w + 6}
              height={l.box.h + 2}
              rx="4"
              fill="white"
              fillOpacity="0.9"
            />
            <text x={l.textX} y={l.textY} fontSize="11" fill="#0f172a">
              {l.name}
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
              <RiskMap systems={displayedSystems} />
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
