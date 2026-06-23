// Action/compute tools. LLMs are unreliable at exact arithmetic, so the Advisor
// calls these and uses the returned numbers verbatim. This is the "grounded, not
// guessed" guardrail (Master Doc §9).

// Coerce any non-finite result (Infinity/-Infinity/NaN, e.g. from a divide-by-zero
// or bad input) to a JSON-safe fallback so JSON.stringify never silently emits null.
function safe(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function emi(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return safe(Math.round(principal / months));
  const f = Math.pow(1 + r, months);
  return safe(Math.round((principal * r * f) / (f - 1)));
}

// How many months the business can run on current cash given monthly net burn.
// Burn <= 0 means it never runs out; 0 is the JSON-safe sentinel for "no burn".
export function runwayMonths(cashOnHand: number, monthlyNetBurn: number): number {
  if (monthlyNetBurn <= 0) return 0;
  return safe(Math.round((cashOnHand / monthlyNetBurn) * 10) / 10);
}

export function breakevenUnits(fixedCosts: number, pricePerUnit: number, varCostPerUnit: number): number {
  const contribution = pricePerUnit - varCostPerUnit;
  if (contribution <= 0) return 0;
  return safe(Math.ceil(fixedCosts / contribution));
}

export function marginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return safe(Math.round(((revenue - cost) / revenue) * 1000) / 10);
}

// Credit exposure to one customer as a % of cash on hand — the metric that makes
// the Sharma demo land.
export function creditExposurePct(owed: number, cashOnHand: number): number {
  if (cashOnHand <= 0) return 0;
  return safe(Math.round((owed / cashOnHand) * 1000) / 10);
}

// The tool registry the Advisor node can call. Keep names/args simple so the LLM
// can request them by JSON.
export type ToolName =
  | "emi"
  | "runwayMonths"
  | "breakevenUnits"
  | "marginPct"
  | "creditExposurePct";

export type ToolCall = { tool: ToolName; args: Record<string, number> };
export type ToolResult = { tool: ToolName; args: Record<string, number>; result: number };

export function runTool(call: ToolCall): ToolResult {
  const a = call.args;
  let result: number;
  switch (call.tool) {
    case "emi": result = emi(a.principal, a.annualRatePct, a.months); break;
    case "runwayMonths": result = runwayMonths(a.cashOnHand, a.monthlyNetBurn); break;
    case "breakevenUnits": result = breakevenUnits(a.fixedCosts, a.pricePerUnit, a.varCostPerUnit); break;
    case "marginPct": result = marginPct(a.revenue, a.cost); break;
    case "creditExposurePct": result = creditExposurePct(a.owed, a.cashOnHand); break;
    default: result = 0;
  }
  return { tool: call.tool, args: a, result: safe(result) };
}

export const TOOL_CATALOG = `
Available calculator tools (call them instead of doing math yourself):
- creditExposurePct{owed, cashOnHand}  -> exposure to one customer as % of cash
- runwayMonths{cashOnHand, monthlyNetBurn} -> months the business can survive
- emi{principal, annualRatePct, months} -> monthly EMI for a loan
- breakevenUnits{fixedCosts, pricePerUnit, varCostPerUnit}
- marginPct{revenue, cost}
`.trim();
