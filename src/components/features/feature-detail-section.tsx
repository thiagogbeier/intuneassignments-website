"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Card, CardContent } from "~/components/ui/card";
import type { FeaturesData } from "~/types/features";

interface FeatureDetailSectionProps {
  data: FeaturesData;
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">No data found.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureDetailSection({ data }: FeatureDetailSectionProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Feature Details</h2>

        <Accordion type="multiple" className="space-y-2">
          {/* Multi Admin Approval */}
          <AccordionItem value="approval-policies" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Multi Admin Approval Policies ({data.approvalPolicies.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Policy Name", "Policy Type", "Platform", "Included Groups", "Status"]}
                rows={data.approvalPolicies.map((p) => [
                  p.displayName ?? "—",
                  p.policyType ?? "—",
                  p.policyPlatform ?? "N/A",
                  (p.approverGroupDisplayNames ?? []).join(", ") || "—",
                  p.status ?? "Active",
                ])}
              />

              {/* Expandable group member details */}
              {data.approvalPolicies.map((p) =>
                (p.approverGroups ?? []).map((g) => (
                  <div key={`${p.id}-${g.id}`} className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      📂 {p.displayName} — Group: {g.displayName} ({g.members.length} member{g.members.length !== 1 ? "s" : ""})
                    </p>
                    {g.members.length > 0 ? (
                      <SimpleTable
                        headers={["Display Name", "User Principal Name"]}
                        rows={g.members.map((m) => [
                          m.displayName,
                          m.userPrincipalName ?? "—",
                        ])}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic ml-4">No members found or insufficient permissions.</p>
                    )}
                  </div>
                )),
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Custom Roles */}
          <AccordionItem value="custom-roles" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Custom Roles ({data.customRoles.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Role Name", "Description", "Is Built-In"]}
                rows={data.customRoles.map((r) => [
                  r.displayName,
                  r.description ?? "—",
                  r.isBuiltIn ? "Yes" : "No",
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Scope Tags */}
          <AccordionItem value="scope-tags" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Scope Tags ({data.scopeTags.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Tag Name", "Description", "ID"]}
                rows={data.scopeTags.map((t) => [
                  t.displayName,
                  t.description ?? "—",
                  t.id,
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Compliance Partners */}
          <AccordionItem value="compliance-partners" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Compliance Partners ({data.compliancePartners.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Partner Name", "State"]}
                rows={data.compliancePartners.map((p) => [
                  p.displayName ?? "—",
                  p.partnerState ?? "unknown",
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* BitLocker Encryption Policies */}
          <AccordionItem value="bitlocker-encryption" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              BitLocker Encryption Policies ({data.diskEncryptionPolicies.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Policy Name", "Description", "Assigned"]}
                rows={data.diskEncryptionPolicies.map((p) => [
                  p.displayName ?? "—",
                  p.description ?? "—",
                  p.isAssigned ? "Yes" : "No",
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Cloud PKI */}
          <AccordionItem value="cloud-pki" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Cloud PKI Certificate Authorities ({data.cloudPKICAs.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["CA Name", "Type", "Common Name", "Status", "Issuance", "Expiration"]}
                rows={data.cloudPKICAs.map((ca) => [
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
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Diagnostic Settings */}
          <AccordionItem value="diagnostic-settings" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Diagnostic Settings ({data.diagnosticSettings.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Name", "Storage Account", "Event Hub", "Log Analytics Workspace"]}
                rows={data.diagnosticSettings.map((d) => [
                  d.name ?? d.id,
                  d.storageAccountId ?? "—",
                  d.eventHubAuthorizationRuleId ?? "—",
                  d.workspaceId ?? "—",
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          {/* MS Tunnel Gateway */}
          <AccordionItem value="tunnel-gateway" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              MS Tunnel Gateway ({data.tunnelGateway.sites.length} site(s), {data.tunnelGateway.servers.length} server(s))
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Sites</h4>
                <SimpleTable
                  headers={["Site", "Upgrade Type", "Available Upgrade", "Server Configuration", "Created Date"]}
                  rows={data.tunnelGateway.sites.map((s) => [
                    s.displayName ?? "—",
                    s.upgradeAutomatically ? "Automatic" : "Manual",
                    s.upgradeAvailable ?? "—",
                    s.microsoftTunnelConfiguration?.displayName ?? "—",
                    s.createdDateTime
                      ? new Date(s.createdDateTime).toLocaleDateString()
                      : "—",
                  ])}
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Servers</h4>
                <SimpleTable
                  headers={["Server", "Site", "Server Configuration", "Last Check-in"]}
                  rows={data.tunnelGateway.servers.map((s) => [
                    s.displayName ?? "—",
                    s.siteName ?? "—",
                    s.serverConfigurationName ?? "—",
                    s.lastCheckinDateTime
                      ? new Date(s.lastCheckinDateTime).toLocaleString()
                      : "—",
                  ])}
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Health Status</h4>
                <SimpleTable
                  headers={["Status", "Name", "Site", "Last Check-in"]}
                  rows={data.tunnelGateway.healthStatuses.map((h) => [
                    h.status,
                    h.serverName,
                    h.siteName,
                    h.lastCheckin,
                  ])}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Connectors */}
          <AccordionItem value="connectors" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Connectors ({data.connectors.domainJoinConnectors.length + data.connectors.ndesConnectors.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Name", "Type", "Created Date"]}
                rows={[
                  ...data.connectors.domainJoinConnectors.map((c) => [
                    c.displayName ?? "—",
                    "Domain Join Connector",
                    c.lastConnectionDateTime
                      ? new Date(c.lastConnectionDateTime).toLocaleDateString()
                      : "—",
                  ]),
                  ...data.connectors.ndesConnectors.map((c) => [
                    c.displayName ?? "—",
                    "NDES Connector",
                    c.lastConnectionDateTime
                      ? new Date(c.lastConnectionDateTime).toLocaleDateString()
                      : "—",
                  ]),
                ]}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Intune Admins */}
          <AccordionItem value="intune-admins" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">
              Intune Admins ({data.intuneAdmins.length})
            </AccordionTrigger>
            <AccordionContent>
              <SimpleTable
                headers={["Display Name", "User Principal Name", "Role", "Assignment Type", "Scope"]}
                rows={data.intuneAdmins.map((a) => [
                  a.displayName,
                  a.userPrincipalName,
                  a.roleName,
                  a.assignmentType,
                  a.scope,
                ])}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
