import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PolicyData } from "~/types/graph";
import type { FeaturesData } from "~/types/features";
import { REPORT_CATEGORIES } from "./report-generator";

// ─── Colors ──────────────────────────────────────────────────────────────────

const BLUE: [number, number, number] = [0, 120, 212];
const DARK: [number, number, number] = [26, 26, 46];
const GRAY: [number, number, number] = [102, 102, 102];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [248, 249, 250];
const BORDER: [number, number, number] = [233, 236, 239];

// ─── Helpers ────────────────────────────────────────────────────────────────

function str(text: unknown): string {
  return text == null ? "" : String(text);
}

function computeStats(policies: PolicyData[]) {
  const total = policies.length;
  const allUsers = policies.filter((p) => p.assignmentStatus === "All Users").length;
  const allDevices = policies.filter((p) => p.assignmentStatus === "All Devices").length;
  const group = policies.filter((p) => p.assignmentStatus === "Group").length;
  const unassigned = policies.filter((p) => p.assignmentStatus === "None").length;
  return { total, allUsers, allDevices, group, unassigned };
}

/** Adds a section heading with a blue underline. Returns new Y position. */
function addHeading(
  doc: jsPDF,
  text: string,
  y: number,
  level: 2 | 3 = 2,
): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 30) {
    doc.addPage();
    y = 15;
  }
  if (level === 2) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(text, 14, y);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(14, y + 1.5, 196, y + 1.5);
    return y + 8;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.text(text, 14, y);
  return y + 6;
}

/** Adds a table via autoTable and returns new Y position. */
function addTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
): number {
  if (rows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("No data found.", 14, startY);
    return startY + 6;
  }
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak", textColor: DARK },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    tableLineColor: BORDER,
    tableLineWidth: 0.1,
  });
  return (doc as any).lastAutoTable.finalY + 6;
}

// ─── Stat cards ─────────────────────────────────────────────────────────────

function drawStatCards(doc: jsPDF, y: number, stats: ReturnType<typeof computeStats>): number {
  const cards = [
    { label: "Total Policies", value: stats.total, color: [13, 110, 253] as [number, number, number] },
    { label: "All Users", value: stats.allUsers, color: [40, 167, 69] as [number, number, number] },
    { label: "All Devices", value: stats.allDevices, color: [23, 162, 184] as [number, number, number] },
    { label: "Group Assigned", value: stats.group, color: [255, 193, 7] as [number, number, number] },
    { label: "Unassigned", value: stats.unassigned, color: [220, 53, 69] as [number, number, number] },
  ];
  const cardW = 34;
  const gap = 3;
  const startX = 14;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    const x = startX + i * (cardW + gap);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...card.color);
    doc.text(String(card.value), x + cardW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(card.label, x + cardW / 2, y + 15, { align: "center" });
  }
  return y + 24;
}

// ─── Bar chart ──────────────────────────────────────────────────────────────

function drawBarChart(
  doc: jsPDF,
  y: number,
  items: { label: string; count: number }[],
): number {
  const max = Math.max(...items.map((i) => i.count), 1);
  const barH = 5;
  const gap = 2;
  const labelW = 50;
  const trackW = 110;
  const startX = 14;

  for (const item of items) {
    const pct = item.count / max;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 51, 51);
    doc.text(item.label, startX + labelW - 2, y + barH - 1, { align: "right" });

    doc.setFillColor(...BORDER);
    doc.roundedRect(startX + labelW, y, trackW, barH, 1, 1, "F");

    if (pct > 0) {
      doc.setFillColor(...BLUE);
      doc.roundedRect(startX + labelW, y, trackW * pct, barH, 1, 1, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(String(item.count), startX + labelW + trackW + 3, y + barH - 1);
    y += barH + gap;
  }
  return y + 4;
}

// ─── Main export function ───────────────────────────────────────────────────

export async function generateAndDownloadPdf(
  policies: PolicyData[],
  features: FeaturesData,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const stats = computeStats(policies);
  const generatedAt = new Date().toLocaleString();
  const date = new Date().toISOString().slice(0, 10);
  let y = 15;

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLUE);
  doc.text("Intune Assignment Report", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Generated: ${generatedAt}  ·  ${stats.total} policies`, 14, y);
  y += 10;

  // ── Dashboard Overview ──
  y = addHeading(doc, "Dashboard Overview", y, 2);
  y = drawStatCards(doc, y, stats);
  y += 2;

  y = addHeading(doc, "Policy Types Distribution", y, 3);
  const cats = REPORT_CATEGORIES.filter((c) => c.id !== "all" && c.id !== "other");
  const typeCounts = cats.map((cat) => ({
    label: cat.label,
    count: policies.filter(cat.filter).length,
  }));
  y = drawBarChart(doc, y, typeCounts);

  // ── Policy Inventory ──
  doc.addPage();
  y = 15;
  y = addHeading(doc, "Policy Inventory", y, 2);

  for (const cat of REPORT_CATEGORIES) {
    if (cat.id === "all") continue;
    const filtered = policies.filter(cat.filter);
    if (filtered.length === 0) continue;
    y = addHeading(doc, `${cat.label} (${filtered.length})`, y, 3);
    const rows = filtered.map((p) => [
      str(p.name),
      str(p.assignmentStatus),
      p.assignedTo.length > 0 ? p.assignedTo.join("; ") : "Not Assigned",
      str(p.platform ?? "N/A"),
    ]);
    y = addTable(doc, ["Policy Name", "Assignment", "Assigned To", "Platform"], rows, y);
  }

  // ── Feature Detection ──
  doc.addPage();
  y = 15;
  const detected = features.features.filter((f) => f.status === "detected").length;
  y = addHeading(doc, "Feature Detection", y, 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(
    `${detected}/${features.features.length} features detected` +
      (features.intuneAdmins.length > 0 ? `  ·  ${features.intuneAdmins.length} Intune admin(s)` : ""),
    14,
    y,
  );
  y += 6;
  y = addTable(
    doc,
    ["Feature", "Status", "Details"],
    features.features.map((f) => [
      str(f.name),
      f.status === "detected" ? "Yes" : "No",
      str(f.details),
    ]),
    y,
  );

  // Approval policies
  if (features.approvalPolicies.length > 0) {
    y = addHeading(doc, `Multi Admin Approval Policies (${features.approvalPolicies.length})`, y, 3);
    y = addTable(
      doc,
      ["Policy Name", "Policy Type", "Platform", "Included Groups", "Status"],
      features.approvalPolicies.map((p) => [
        str(p.displayName ?? "—"),
        str(p.policyType ?? "—"),
        str(p.policyPlatform ?? "N/A"),
        (p.approverGroupDisplayNames ?? []).join(", ") || "—",
        str(p.status ?? "Active"),
      ]),
      y,
    );
  }

  // Custom roles
  if (features.customRoles.length > 0) {
    y = addHeading(doc, `Custom Roles (${features.customRoles.length})`, y, 3);
    y = addTable(
      doc,
      ["Role Name", "Description", "Is Built-In"],
      features.customRoles.map((r) => [str(r.displayName), str(r.description ?? ""), r.isBuiltIn ? "Yes" : "No"]),
      y,
    );
  }

  // Scope tags
  y = addHeading(doc, `Scope Tags (${features.scopeTags.length})`, y, 3);
  y = addTable(
    doc,
    ["Tag Name", "Description", "ID"],
    features.scopeTags.map((t) => [str(t.displayName), str(t.description ?? ""), str(t.id)]),
    y,
  );

  // Compliance partners
  if (features.compliancePartners.length > 0) {
    y = addHeading(doc, `Compliance Partners (${features.compliancePartners.length})`, y, 3);
    y = addTable(
      doc,
      ["Partner Name", "State"],
      features.compliancePartners.map((p) => [str(p.displayName ?? "—"), str(p.partnerState ?? "unknown")]),
      y,
    );
  }

  // Cloud PKI CAs
  if (features.cloudPKICAs.length > 0) {
    y = addHeading(doc, `Cloud PKI CAs (${features.cloudPKICAs.length})`, y, 3);
    y = addTable(
      doc,
      ["CA Name", "Type", "Status"],
      features.cloudPKICAs.map((ca) => [
        str(ca.displayName ?? "—"),
        str(ca.cloudCertificationAuthorityType ?? "—"),
        str(ca.certificationAuthorityStatus ?? "—"),
      ]),
      y,
    );
  }

  // Windows LAPS
  if (features.windowsLapsPolicies.length > 0) {
    y = addHeading(doc, `Windows LAPS Policies (${features.windowsLapsPolicies.length})`, y, 3);
    y = addTable(
      doc,
      ["Policy Name", "Description", "Assigned"],
      features.windowsLapsPolicies.map((p) => [str(p.displayName ?? "—"), str(p.description ?? "—"), p.isAssigned ? "Yes" : "No"]),
      y,
    );
  }

  // Tunnel gateway
  if (features.tunnelGateway.sites.length > 0) {
    y = addHeading(doc, `MS Tunnel Gateway Sites (${features.tunnelGateway.sites.length})`, y, 3);
    y = addTable(
      doc,
      ["Site", "Upgrade Type", "Configuration"],
      features.tunnelGateway.sites.map((s) => [
        str(s.displayName ?? "—"),
        s.upgradeAutomatically ? "Automatic" : "Manual",
        str(s.microsoftTunnelConfiguration?.displayName ?? "—"),
      ]),
      y,
    );
  }

  // Connectors
  const connectorRows = [
    ...features.connectors.domainJoinConnectors.map((c) => [
      str(c.displayName ?? "—"),
      "Domain Join",
      c.lastConnectionDateTime ? new Date(c.lastConnectionDateTime).toLocaleDateString() : "—",
    ]),
    ...features.connectors.ndesConnectors.map((c) => [
      str(c.displayName ?? "—"),
      "NDES",
      c.lastConnectionDateTime ? new Date(c.lastConnectionDateTime).toLocaleDateString() : "—",
    ]),
  ];
  if (connectorRows.length > 0) {
    y = addHeading(doc, `Connectors (${connectorRows.length})`, y, 3);
    y = addTable(doc, ["Name", "Type", "Last Connection"], connectorRows, y);
  }

  // Intune admins
  if (features.intuneAdmins.length > 0) {
    y = addHeading(doc, `Intune Admins (${features.intuneAdmins.length})`, y, 3);
    y = addTable(
      doc,
      ["Display Name", "UPN", "Role", "Assignment Type", "Scope"],
      features.intuneAdmins.map((a) => [str(a.displayName), str(a.userPrincipalName), str(a.roleName), str(a.assignmentType), str(a.scope)]),
      y,
    );
  }

  // ── Footer on last page ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Generated by Intune Assignment Checker — all data processed client-side", 105, pageH - 8, {
    align: "center",
  });

  doc.save(`intune-full-report-${date}.pdf`);
}
