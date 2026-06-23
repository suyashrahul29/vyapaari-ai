// Knowledge & Grounding layer — the "fourth agent" from the Master Doc §7.2.
// In production this would be a full RAG pipeline over live documents.
// For the MVP: curated, hardcoded MSME context injected into the Advisor at call time.

export const MSME_KNOWLEDGE = `
=== MSME LOAN SCHEMES (India 2025) ===
• PMEGP (PM Employment Generation Programme): Up to ₹50L manufacturing / ₹20L services — 15–35% government subsidy. Apply via nationalized banks.
• MUDRA Loans (no collateral): Shishu ≤₹50k · Kishor ₹50k–5L · Tarun ₹5L–10L. PSU banks, small finance banks, MFIs.
• CGTMSE: Credit guarantee scheme — collateral-free term loans up to ₹2Cr for MSMEs.
• Stand-Up India: ₹10L–1Cr for SC/ST/women entrepreneurs. One loan per branch.
• SIDBI Direct: Working capital + term loans at 8.9–12% for registered MSMEs.
• TReDS: Trade receivables discounting — sell invoices to get cash faster (good for B2B sellers).
• Typical rates 2025: PSU banks 8.5–11% · Private banks 10–14% · NBFCs 14–18% · Microfinance 18–24%.

=== GST FOR SMALL BUSINESSES ===
• Mandatory registration: turnover > ₹40L (goods) or ₹20L (services); ₹10L for NE/hill states.
• Composition scheme: 1–6% flat tax, no input credit — good for traders under ₹1.5Cr turnover.
• Input Tax Credit (ITC): GST paid on raw material/purchases offsets GST collected on sales.
• E-invoicing mandatory for businesses over ₹5Cr turnover.

=== BUSINESS HEALTH BENCHMARKS ===
• Gross margin (healthy): Trading 15–25% · Manufacturing 25–40% · Services 40–60%.
• Cash runway (safe zone): 3+ months of operating expenses.
• Dangerous single-customer credit exposure: > 40% of your cash owed by one customer.
• Typical B2B payment terms India: 30–60 days; > 90 days = collections problem.
• Inventory days (healthy): 30–45 days for most trading businesses.
• Debt service ratio: Monthly EMI should stay below 20–25% of monthly gross profit.

=== KEY FORMULAS (used by calculator tools) ===
• Credit exposure % = Customer owed ÷ Cash on hand × 100
• EMI (flat) = Principal × monthly rate × (1+rate)^months ÷ ((1+rate)^months − 1)
• Runway months = Cash on hand ÷ Monthly net burn
• Breakeven units = Fixed costs ÷ (Price per unit − Variable cost per unit)
• Gross margin % = (Revenue − COGS) ÷ Revenue × 100
`.trim();
