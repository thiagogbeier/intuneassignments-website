import type { FeaturesData } from "~/types/features";

function esc(text: unknown): string {
  const s = text == null ? "" : String(text);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusIcon(detected: boolean): string {
  return detected ? "✅ Yes" : "❌ No";
}

function tableHtml(headers: string[], rows: unknown[][]): string {
  if (rows.length === 0) {
    return `<p><em>No data found.</em></p>`;
  }

  const ths = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const trs = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`,
    )
    .join("\n");

  return `<table><thead><tr>${ths}</tr></thead><tbody>\n${trs}\n</tbody></table>`;
}

export function generateFeaturesHtmlReport(data: FeaturesData): string {
  const generatedAt = new Date().toLocaleString();
  const detected = data.features.filter((f) => f.status === "detected").length;

  // Feature detection table
  const featureRows = data.features.map((f) => [
    f.name,
    statusIcon(f.status === "detected"),
    f.details,
  ]);

  // Approval policies table
  const approvalRows = data.approvalPolicies.map((p) => [
    p.displayName ?? "—",
    p.policyType ?? "—",
    p.policyPlatform ?? "N/A",
    (p.approverGroupDisplayNames ?? []).join(", ") || "—",
    p.status ?? "Active",
  ]);

  // Approval group member detail HTML
  const approvalGroupDetails = data.approvalPolicies
    .flatMap((p) =>
      (p.approverGroups ?? []).map((g) => {
        const memberRows = g.members.map((m) => [
          m.displayName,
          m.userPrincipalName ?? "—",
        ]);
        return `<p>📂 <strong>${esc(p.displayName)}</strong> — Group: ${esc(g.displayName)} (${g.members.length} member${g.members.length !== 1 ? "s" : ""})</p>\n${memberRows.length > 0 ? tableHtml(["Display Name", "User Principal Name"], memberRows) : "<p><em>No members found.</em></p>"}`;
      }),
    )
    .join("\n");

  // Custom roles table
  const roleRows = data.customRoles.map((r) => [
    r.displayName,
    r.description ?? "",
    r.isBuiltIn ? "Yes" : "No",
  ]);

  // Scope tags table
  const tagRows = data.scopeTags.map((t) => [
    t.displayName,
    t.description ?? "",
    t.id,
  ]);

  // Compliance partners table
  const partnerRows = data.compliancePartners.map((p) => [
    p.displayName ?? "—",
    p.partnerState ?? "unknown",
  ]);

  // Cloud PKI CAs table
  const caRows = data.cloudPKICAs.map((ca) => [
    ca.displayName ?? "—",
    ca.cloudCertificationAuthorityType ?? "—",
    ca.issuerCommonName ?? "—",
    ca.certificationAuthorityStatus ?? "—",
    ca.validityStartDateTime
      ? new Date(ca.validityStartDateTime).toLocaleDateString()
      : "—",
    ca.validityEndDateTime
      ? new Date(ca.validityEndDateTime).toLocaleDateString()
      : "—",
  ]);

  // Diagnostic settings table
  const diagRows = data.diagnosticSettings.map((d) => [
    d.name ?? d.id,
    d.storageAccountId ?? "—",
    d.eventHubAuthorizationRuleId ?? "—",
    d.workspaceId ?? "—",
  ]);

  // Tunnel Gateway tables
  const tunnelSiteRows = data.tunnelGateway.sites.map((s) => [
    s.displayName ?? "—",
    s.upgradeAutomatically ? "Automatic" : "Manual",
    s.upgradeAvailable ?? "—",
    s.microsoftTunnelConfiguration?.displayName ?? "—",
    s.createdDateTime ? new Date(s.createdDateTime).toLocaleDateString() : "—",
  ]);
  const tunnelServerRows = data.tunnelGateway.servers.map((s) => [
    s.displayName ?? "—",
    s.siteName ?? "—",
    s.serverConfigurationName ?? "—",
    s.lastCheckinDateTime ? new Date(s.lastCheckinDateTime).toLocaleString() : "—",
  ]);
  const tunnelHealthRows = data.tunnelGateway.healthStatuses.map((h) => [
    h.status,
    h.serverName,
    h.siteName,
    h.lastCheckin,
  ]);

  // Intune admins table
  const adminRows = data.intuneAdmins.map((a) => [
    a.displayName,
    a.userPrincipalName,
    a.roleName,
    a.assignmentType,
    a.scope,
  ]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Intune Feature Detection Report</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f5f6fa; padding: 32px; max-width: 1400px; margin: 0 auto; }
h1 { font-size: 1.8rem; margin-bottom: 4px; color: #0078d4; }
h2 { font-size: 1.4rem; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #0078d4; color: #1a1a2e; }
h3 { font-size: 1.1rem; margin: 18px 0 8px; color: #333; }
p.meta { color: #666; font-size: 0.9rem; margin-bottom: 18px; }
.cards { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px; }
.card { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.08); min-width: 180px; flex: 1; }
.card h3 { margin: 0 0 8px; font-size: 1rem; color: #0078d4; border: none; }
.card p { font-size: 0.9rem; margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.85rem; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
th { background: #0078d4; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
td { padding: 6px 10px; border-bottom: 1px solid #eee; }
tr:nth-child(even) td { background: #f9fafb; }
tr:hover td { background: #e8f0fe; }
em { color: #888; }
@media print { body { padding: 12px; } .cards { page-break-inside: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>Intune Feature Detection Report</h1>
<p class="meta">Generated: ${esc(generatedAt)}</p>

<h2>Summary</h2>
<div class="cards">
  <div class="card">
    <h3>Feature Detection</h3>
    <p>${detected}/${data.features.length} features detected</p>
    <p>Intune Admins: ${data.intuneAdmins.length}</p>
  </div>
</div>

<h2>Feature Detection</h2>
${tableHtml(["Feature", "Status", "Details"], featureRows)}

${data.approvalPolicies.length > 0 ? `<h3>Multi Admin Approval Policies (${data.approvalPolicies.length})</h3>
${tableHtml(["Policy Name", "Policy Type", "Platform", "Included Groups", "Status"], approvalRows)}
${approvalGroupDetails}` : ""}

${data.customRoles.length > 0 ? `<h3>Custom Roles (${data.customRoles.length})</h3>
${tableHtml(["Role Name", "Description", "Is Built-In"], roleRows)}` : ""}

<h3>Scope Tags (${data.scopeTags.length})</h3>
${tableHtml(["Tag Name", "Description", "ID"], tagRows)}

${data.compliancePartners.length > 0 ? `<h3>Compliance Partners (${data.compliancePartners.length})</h3>
${tableHtml(["Partner Name", "State"], partnerRows)}` : ""}

${data.cloudPKICAs.length > 0 ? `<h3>Cloud PKI Certificate Authorities (${data.cloudPKICAs.length})</h3>
${tableHtml(["CA Name", "Type", "Common Name", "Status", "Issuance", "Expiration"], caRows)}` : ""}

${data.diagnosticSettings.length > 0 ? `<h3>Diagnostic Settings (${data.diagnosticSettings.length})</h3>
${tableHtml(["Name", "Storage Account", "Event Hub", "Log Analytics Workspace"], diagRows)}` : ""}

${data.tunnelGateway.sites.length > 0 ? `<h3>MS Tunnel Gateway</h3>
<h4>Sites (${data.tunnelGateway.sites.length})</h4>
${tableHtml(["Site", "Upgrade Type", "Available Upgrade", "Server Configuration", "Created Date"], tunnelSiteRows)}
<h4>Servers (${data.tunnelGateway.servers.length})</h4>
${tableHtml(["Server", "Site", "Server Configuration", "Last Check-in"], tunnelServerRows)}
<h4>Health Status</h4>
${tableHtml(["Status", "Name", "Site", "Last Check-in"], tunnelHealthRows)}` : ""}

${data.intuneAdmins.length > 0 ? `<h3>Intune Admins (${data.intuneAdmins.length})</h3>
${tableHtml(["Display Name", "User Principal Name", "Role", "Assignment Type", "Scope"], adminRows)}` : ""}

<p style="margin-top:32px;color:#888;font-size:0.8rem;text-align:center;">Generated by Intune Assignments Visualizer</p>
</body>
</html>`;
}

export function downloadFeaturesReport(html: string, filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `intune-features-report-${date}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
