import { Client } from "@microsoft/microsoft-graph-client";
import type {
  ApprovalPolicy,
  ApprovalPolicyGroup,
  ApprovalPolicyGroupMember,
  RoleDefinition,
  RoleScopeTag,
  CompliancePartner,
  DiskEncryptionPolicy,
  WindowsLapsPolicy,
  CloudPKICertificateAuthority,
  DiagnosticSetting,
  RoleAssignment,
  IntuneAdmin,
  TunnelGatewayData,
  TunnelSite,
  TunnelServer,
  TunnelConfiguration,
  TunnelHealthStatus,
  ConnectorsData,
  NdesConnector,
  DomainJoinConnector,
} from "~/types/features";

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getClient(token: string) {
  return Client.init({ authProvider: (done) => done(null, token) });
}

interface GraphPage<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

async function fetchBeta<T>(
  token: string,
  endpoint: string,
): Promise<T[]> {
  const client = getClient(token);
  let request = client.api(endpoint).version("beta");
  let retries = 0;

  const doGet = async (req: any, ep: string): Promise<GraphPage<T>> => {
    while (true) {
      try {
        return await req.get();
      } catch (err: any) {
        retries++;
        const is429 = err?.statusCode === 429;
        const is5xx = err?.statusCode >= 500 && err?.statusCode < 600;
        if ((is429 || is5xx) && retries <= 3) {
          await sleep(1000 * Math.pow(2, retries - 1) + Math.random() * 500);
          continue;
        }
        throw err;
      }
    }
  };

  try {
    const res = await doGet(request, endpoint);
    let values = res.value ?? [];
    let next = res["@odata.nextLink"];
    while (next) {
      try {
        const nr = await doGet(client.api(next), next);
        values = values.concat(nr.value ?? []);
        next = nr["@odata.nextLink"];
      } catch {
        break;
      }
    }
    return values;
  } catch (err: any) {
    const is403 =
      err?.statusCode === 403 || err?.code === "Authorization_RequestDenied";
    if (is403) {
      console.warn(`[features] 403 on ${endpoint} — permission denied, skipping`);
      return [];
    }
    const is404 = err?.statusCode === 404;
    if (is404) {
      console.warn(`[features] 404 on ${endpoint} — endpoint not found, skipping`);
      return [];
    }
    console.error(`[features] Failed to fetch ${endpoint}`, err?.statusCode, err?.message ?? err);
    return [];
  }
}

// ─── Individual fetchers ────────────────────────────────────────────────────

export async function fetchApprovalPolicies(
  token: string,
): Promise<ApprovalPolicy[]> {
  const policies = await fetchBeta<ApprovalPolicy>(
    token,
    "/deviceManagement/operationApprovalPolicies",
  );

  // Resolve approver group names and members
  const client = getClient(token);
  for (const policy of policies) {
    const groupIds = policy.approverGroupIds ?? [];
    if (groupIds.length === 0) continue;

    const resolvedGroups: ApprovalPolicyGroup[] = [];
    for (const gid of groupIds) {
      try {
        const group = await client
          .api(`/groups/${gid}`)
          .version("beta")
          .select("displayName")
          .get();

        let members: ApprovalPolicyGroupMember[] = [];
        try {
          const membersResp = await client
            .api(`/groups/${gid}/members`)
            .version("beta")
            .select("displayName,userPrincipalName")
            .top(50)
            .get();
          members = (membersResp.value ?? []).map(
            (m: { displayName?: string; userPrincipalName?: string }) => ({
              displayName: m.displayName ?? "Unknown",
              userPrincipalName: m.userPrincipalName ?? "",
            }),
          );
        } catch {
          // members fetch may fail due to permissions
        }

        resolvedGroups.push({
          id: gid,
          displayName: group.displayName ?? gid,
          members,
        });
      } catch {
        resolvedGroups.push({ id: gid, displayName: gid, members: [] });
      }
    }

    policy.approverGroups = resolvedGroups;
    policy.approverGroupDisplayNames = resolvedGroups.map((g) => g.displayName);
    // Mark status as Active since the policy exists and has approvers
    if (!policy.status || policy.status === "unknown") {
      policy.status = resolvedGroups.length > 0 ? "Active" : "—";
    }
  }

  return policies;
}

export async function fetchRoleDefinitions(
  token: string,
): Promise<RoleDefinition[]> {
  return fetchBeta<RoleDefinition>(
    token,
    "/deviceManagement/roleDefinitions",
  );
}

export async function fetchScopeTags(
  token: string,
): Promise<RoleScopeTag[]> {
  return fetchBeta<RoleScopeTag>(
    token,
    "/deviceManagement/roleScopeTags",
  );
}

export async function fetchCompliancePartners(
  token: string,
): Promise<CompliancePartner[]> {
  return fetchBeta<CompliancePartner>(
    token,
    "/deviceManagement/complianceManagementPartners",
  );
}

export async function fetchDiskEncryptionPolicies(
  token: string,
): Promise<DiskEncryptionPolicy[]> {
  const client = getClient(token);
  const resolved: DiskEncryptionPolicy[] = [];

  const isDiskEncryption = (item: any): boolean => {
    const templateFamily =
      item.templateReference?.templateFamily ?? "";
    const templateDisplayName =
      (item.templateDisplayName ?? "").toLowerCase();
    const templateId = (item.templateId ?? "").toLowerCase();

    return (
      templateFamily === "endpointSecurityDiskEncryption" ||
      templateDisplayName.includes("disk encryption") ||
      templateDisplayName.includes("bitlocker") ||
      templateId.includes("diskencryption") ||
      templateId.includes("bitlocker")
    );
  };

  async function fetchAll(endpoint: string): Promise<any[]> {
    try {
      const res = await client.api(endpoint).version("beta").get();
      const items = (res.value ?? []) as any[];
      let nextLink = res["@odata.nextLink"];
      while (nextLink) {
        try {
          const nr = await client.api(nextLink).get();
          items.push(...(nr.value ?? []));
          nextLink = nr["@odata.nextLink"];
        } catch { break; }
      }
      return items;
    } catch (err: any) {
      const is403 =
        err?.statusCode === 403 || err?.code === "Authorization_RequestDenied";
      if (is403) console.warn(`[features] 403 on ${endpoint} — skipping`);
      else console.error(`[features] Failed ${endpoint}`, err?.statusCode, err?.message);
      return [];
    }
  }

  // Check both sources: configurationPolicies (Settings Catalog) and intents (legacy)
  const [configPolicies, intents] = await Promise.all([
    fetchAll("/deviceManagement/configurationPolicies"),
    fetchAll("/deviceManagement/intents"),
  ]);

  const diskEncFromConfig = configPolicies.filter(isDiskEncryption);
  const diskEncFromIntents = intents.filter(isDiskEncryption);

  console.log(
    `[features] Disk encryption: ${diskEncFromConfig.length} from configPolicies, ${diskEncFromIntents.length} from intents`,
  );

  const allDiskEnc = [...diskEncFromConfig, ...diskEncFromIntents];

  for (const p of allDiskEnc) {
    let assignments: any[] = [];
    // configurationPolicies use a different assignments endpoint than intents
    const basePath = p.templateReference
      ? `/deviceManagement/configurationPolicies/${p.id}/assignments`
      : `/deviceManagement/intents/${p.id}/assignments`;
    try {
      const aRes = await client.api(basePath).version("beta").get();
      assignments = aRes.value ?? [];
    } catch {
      // ignore
    }

    resolved.push({
      id: p.id,
      displayName: p.displayName ?? p.name ?? "Unnamed",
      description: p.description ?? "",
      templateId: p.templateId ?? p.templateReference?.templateId,
      isAssigned: assignments.length > 0,
      assignments,
    });
  }

  return resolved;
}

// ─── Windows LAPS ────────────────────────────────────────────────────────────

export async function fetchWindowsLapsPolicies(
  token: string,
): Promise<WindowsLapsPolicy[]> {
  const client = getClient(token);
  const resolved: WindowsLapsPolicy[] = [];

  const isLaps = (item: any): boolean => {
    const templateFamily =
      item.templateReference?.templateFamily ?? "";
    const templateDisplayName =
      (item.templateDisplayName ?? "").toLowerCase();
    const name = (item.displayName ?? "").toLowerCase();
    const templateId =
      (item.templateReference?.templateId ?? item.templateId ?? "").toLowerCase();

    return (
      templateFamily === "endpointSecurityAccountProtection" ||
      templateDisplayName.includes("laps") ||
      templateDisplayName.includes("account protection") ||
      templateDisplayName.includes("local admin password") ||
      name.includes("laps") ||
      templateId.includes("accountprotection") ||
      templateId.includes("laps")
    );
  };

  try {
    let items: any[] = [];
    const res = await client
      .api("/deviceManagement/configurationPolicies")
      .version("beta")
      .get();
    items = res.value ?? [];
    let nextLink = res["@odata.nextLink"];
    while (nextLink) {
      try {
        const nr = await client.api(nextLink).get();
        items.push(...(nr.value ?? []));
        nextLink = nr["@odata.nextLink"];
      } catch {
        break;
      }
    }

    const lapsPolicies = items.filter(isLaps);
    console.log(
      `[features] Windows LAPS: ${lapsPolicies.length} from configPolicies`,
    );

    for (const p of lapsPolicies) {
      let assignments: any[] = [];
      try {
        const aRes = await client
          .api(`/deviceManagement/configurationPolicies/${p.id}/assignments`)
          .version("beta")
          .get();
        assignments = aRes.value ?? [];
      } catch {
        // ignore
      }

      resolved.push({
        id: p.id,
        displayName: p.displayName ?? "Unnamed",
        description: p.description ?? "",
        templateId: p.templateReference?.templateId ?? p.templateId,
        isAssigned: assignments.length > 0,
        assignments,
      });
    }
  } catch (err: any) {
    const is403 =
      err?.statusCode === 403 || err?.code === "Authorization_RequestDenied";
    if (is403) console.warn("[features] 403 on configPolicies (LAPS) — skipping");
    else console.error("[features] Failed LAPS fetch", err?.statusCode, err?.message);
  }

  return resolved;
}

export async function fetchCloudPKICAs(
  token: string,
): Promise<CloudPKICertificateAuthority[]> {
  return fetchBeta<CloudPKICertificateAuthority>(
    token,
    "/deviceManagement/cloudCertificationAuthority",
  );
}

export async function fetchDiagnosticSettings(
  armToken: string | null,
): Promise<DiagnosticSetting[]> {
  if (!armToken) {
    console.warn("[features] No ARM token — skipping diagnostic settings");
    return [];
  }

  // Intune diagnostic settings use the microsoft.insights sub-provider on the
  // microsoft.intune tenant-level resource.  Try several known endpoint shapes.
  const endpoints = [
    // microsoft.insights sub-provider (standard Azure Monitor pattern)
    "https://management.azure.com/providers/microsoft.intune/providers/microsoft.insights/diagnosticSettings?api-version=2021-05-01-preview",
    "https://management.azure.com/providers/microsoft.intune/providers/microsoft.insights/diagnosticSettings?api-version=2017-05-01-preview",
    // Direct provider path (older API versions)
    "https://management.azure.com/providers/microsoft.intune/diagnosticSettings?api-version=2017-04-01",
    "https://management.azure.com/providers/microsoft.intune/diagnosticSettings?api-version=2021-05-01-preview",
    // AAD/Entra ID diagnostic settings (sometimes used for Intune logs)
    "https://management.azure.com/providers/microsoft.aadiam/diagnosticSettings?api-version=2017-04-01-preview",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${armToken}` },
      });

      if (!res.ok) {
        console.log(`[features] Diagnostic settings endpoint ${res.status}: ${url.split("?")[0]}`);
        if (res.status === 404) continue;
        if (res.status === 403) {
          console.warn("[features] 403 on ARM diagnostic settings — permission denied");
          return [];
        }
        continue;
      }

      const data = await res.json();
      const settings = (data.value ?? (Array.isArray(data) ? data : [])) as any[];

      console.log(`[features] Diagnostic settings: ${settings.length} found via ${url.split("?")[0]}`);

      return settings.map((s: any) => ({
        id: s.id ?? "",
        name: s.name ?? s.id ?? "—",
        storageAccountId: s.properties?.storageAccountId ?? null,
        eventHubAuthorizationRuleId:
          s.properties?.eventHubAuthorizationRuleId ?? null,
        workspaceId: s.properties?.workspaceId ?? null,
        logAnalyticsDestinationType:
          s.properties?.logAnalyticsDestinationType ?? null,
        marketplacePartnerId:
          s.properties?.marketplacePartnerId ?? null,
      }));
    } catch (err: any) {
      console.warn("[features] Failed to fetch ARM diagnostic settings", err?.message);
    }
  }

  console.warn("[features] All diagnostic settings endpoints returned no data");
  return [];
}

// ─── MS Tunnel Gateway ──────────────────────────────────────────────────────

export async function fetchTunnelGateway(
  token: string,
): Promise<TunnelGatewayData> {
  const client = getClient(token);
  const empty: TunnelGatewayData = { sites: [], servers: [], configurations: [], healthStatuses: [] };

  async function getAll<T>(endpoint: string): Promise<T[]> {
    try {
      const res = await client.api(endpoint).version("beta").get();
      const items = (res.value ?? []) as T[];
      let nextLink = res["@odata.nextLink"];
      while (nextLink) {
        try {
          const nr = await client.api(nextLink).get();
          items.push(...((nr.value ?? []) as T[]));
          nextLink = nr["@odata.nextLink"];
        } catch { break; }
      }
      return items;
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 403 || code === 404) {
        console.warn(`[features] ${code} on ${endpoint} — skipping`);
        return [];
      }
      console.error(`[features] Failed ${endpoint}`, code, err?.message);
      return [];
    }
  }

  // Fetch sites, configurations in parallel
  const [sites, configurations] = await Promise.all([
    getAll<TunnelSite>("/deviceManagement/microsoftTunnelSites"),
    getAll<TunnelConfiguration>("/deviceManagement/microsoftTunnelConfigurations"),
  ]);

  if (sites.length === 0) return empty;

  const configMap = new Map(configurations.map((c) => [c.id, c.displayName ?? "—"]));

  // Fetch servers for each site
  const allServers: TunnelServer[] = [];
  const healthStatuses: TunnelHealthStatus[] = [];

  for (const site of sites) {
    const servers = await getAll<any>(
      `/deviceManagement/microsoftTunnelSites/${site.id}/microsoftTunnelServers`,
    );

    for (const s of servers) {
      const configName = site.microsoftTunnelConfiguration?.id
        ? configMap.get(site.microsoftTunnelConfiguration.id) ?? "—"
        : "—";

      allServers.push({
        id: s.id,
        displayName: s.displayName ?? "—",
        tunnelServerHealthStatus: s.tunnelServerHealthStatus ?? "unknown",
        lastCheckinDateTime: s.lastCheckinDateTime,
        siteName: site.displayName ?? "—",
        siteId: site.id,
        serverConfigurationName: configName,
      });

      healthStatuses.push({
        status: s.tunnelServerHealthStatus ?? "unknown",
        serverName: s.displayName ?? "—",
        siteName: site.displayName ?? "—",
        lastCheckin: s.lastCheckinDateTime
          ? new Date(s.lastCheckinDateTime).toLocaleString()
          : "—",
      });
    }
  }

  console.log(
    `[features] Tunnel Gateway: ${sites.length} site(s), ${allServers.length} server(s), ${configurations.length} config(s)`,
  );

  return { sites, servers: allServers, configurations, healthStatuses };
}

// ─── Connectors ──────────────────────────────────────────────────────────────

export async function fetchConnectors(
  token: string,
): Promise<ConnectorsData> {
  const [ndesConnectors, domainJoinConnectors] = await Promise.all([
    fetchBeta<NdesConnector>(token, "/deviceManagement/ndesConnectors"),
    fetchBeta<DomainJoinConnector>(
      token,
      "/deviceManagement/domainJoinConnectors",
    ),
  ]);

  console.log(
    `[features] Connectors: ${ndesConnectors.length} NDES, ${domainJoinConnectors.length} Domain Join`,
  );

  return { ndesConnectors, domainJoinConnectors };
}

export async function fetchRoleAssignments(
  token: string,
): Promise<RoleAssignment[]> {
  const client = getClient(token);

  try {
    // Fetch role assignments with the role definition expanded
    const res = await client
      .api("/deviceManagement/roleAssignments")
      .version("beta")
      .expand("roleDefinition")
      .get();

    const assignments = (res.value ?? []) as any[];

    // Handle pagination
    let nextLink = res["@odata.nextLink"];
    while (nextLink) {
      try {
        const nr = await client.api(nextLink).get();
        assignments.push(...(nr.value ?? []));
        nextLink = nr["@odata.nextLink"];
      } catch { break; }
    }

    return assignments as RoleAssignment[];
  } catch (err: any) {
    const is403 =
      err?.statusCode === 403 || err?.code === "Authorization_RequestDenied";
    if (is403) {
      console.warn("[features] 403 on roleAssignments — skipping");
      return [];
    }
    console.error("[features] Failed to fetch roleAssignments", err?.statusCode, err?.message);
    return [];
  }
}

// ─── Intune admins resolution ───────────────────────────────────────────────

export async function resolveIntuneAdmins(
  token: string,
  roleAssignments: RoleAssignment[],
  roleDefinitions: RoleDefinition[],
  scopeTags: import("~/types/features").RoleScopeTag[],
): Promise<IntuneAdmin[]> {
  const client = getClient(token);
  const admins: IntuneAdmin[] = [];
  const roleMap = new Map(roleDefinitions.map((r) => [r.id, r.displayName]));
  const scopeTagMap = new Map(scopeTags.map((t) => [t.id, t.displayName]));

  // Cache for resolved groups to avoid duplicate calls
  const groupNameCache = new Map<string, string>();
  const groupMemberCache = new Map<string, { displayName: string; userPrincipalName: string }[]>();

  async function resolveGroupName(groupId: string): Promise<string> {
    if (groupNameCache.has(groupId)) return groupNameCache.get(groupId)!;
    try {
      const g = await client
        .api(`/groups/${groupId}`)
        .version("beta")
        .select("displayName")
        .get();
      const name = g?.displayName ?? groupId;
      groupNameCache.set(groupId, name);
      return name;
    } catch {
      groupNameCache.set(groupId, groupId);
      return groupId;
    }
  }

  async function resolveGroupMembers(groupId: string): Promise<{ displayName: string; userPrincipalName: string }[]> {
    if (groupMemberCache.has(groupId)) return groupMemberCache.get(groupId)!;
    try {
      const res = await client
        .api(`/groups/${groupId}/members`)
        .version("beta")
        .select("displayName,userPrincipalName")
        .top(100)
        .get();
      const members = (res.value ?? [])
        .filter((m: any) => m["@odata.type"] === "#microsoft.graph.user")
        .map((m: any) => ({
          displayName: m.displayName ?? "Unknown",
          userPrincipalName: m.userPrincipalName ?? "—",
        }));
      groupMemberCache.set(groupId, members);
      return members;
    } catch {
      groupMemberCache.set(groupId, []);
      return [];
    }
  }

  function resolveScopeDisplay(ra: RoleAssignment): string {
    // Try to resolve scope tag IDs to names
    const scopes = ra.resourceScopes ?? [];
    if (scopes.length === 0) return "All";

    const resolved = scopes.map((s) => scopeTagMap.get(s) ?? s);
    return resolved.join(", ");
  }

  for (const ra of roleAssignments) {
    const roleName =
      ra.roleDefinition?.displayName ??
      roleMap.get(ra.roleDefinition?.id ?? "") ??
      ra.displayName ??
      "Unknown Role";

    const scope = resolveScopeDisplay(ra);

    // The Intune roleAssignments API has "members" as an array of principal IDs (strings)
    // These can be user IDs or group IDs. We need to try resolving them.
    const memberIds: string[] = Array.isArray(ra.members)
      ? ra.members.map((m: any) => (typeof m === "string" ? m : m.id ?? m))
      : (ra.scopeMembers ?? []);

    console.log(
      `[features] Role "${roleName}": members=${JSON.stringify(ra.members?.slice?.(0, 3))}, scopeMembers=${JSON.stringify(ra.scopeMembers?.slice?.(0, 3))}, resourceScopes=${JSON.stringify(ra.resourceScopes?.slice?.(0, 3))}`,
    );

    if (memberIds.length === 0) {
      // No members on this assignment
      continue;
    }

    for (const principalId of memberIds) {
      if (typeof principalId !== "string") continue;

      // Use directoryObjects to resolve in one call (avoids noisy 404s on /users/)
      try {
        const obj = await client
          .api(`/directoryObjects/${principalId}`)
          .version("beta")
          .get();

        const odataType = obj?.["@odata.type"] ?? "";
        console.log(`[features] Resolved ${principalId} → type=${odataType}, name=${obj?.displayName}`);

        if (odataType.includes("user")) {
          admins.push({
            displayName: obj.displayName ?? "Unknown",
            userPrincipalName: obj.userPrincipalName ?? "—",
            roleName,
            assignmentType: "Direct",
            scope,
          });
        } else if (odataType.includes("group")) {
          const groupName = obj.displayName ?? principalId;
          groupNameCache.set(principalId, groupName);
          const members = await resolveGroupMembers(principalId);

          if (members.length > 0) {
            for (const m of members) {
              admins.push({
                displayName: m.displayName,
                userPrincipalName: m.userPrincipalName,
                roleName,
                assignmentType: `Indirect (Group: ${groupName})`,
                scope,
              });
            }
          } else {
            admins.push({
              displayName: groupName,
              userPrincipalName: "—",
              roleName,
              assignmentType: "Group (no members resolved)",
              scope,
            });
          }
        } else if (odataType.includes("servicePrincipal")) {
          admins.push({
            displayName: obj.displayName ?? "Service Principal",
            userPrincipalName: "—",
            roleName,
            assignmentType: "Service Principal",
            scope,
          });
        }
        // Skip other types silently (scope tags, etc.)
      } catch (resolveErr: any) {
        // ID not found in directory — likely a scope tag or deleted object, skip silently
        console.log(`[features] Could not resolve ${principalId}: ${resolveErr?.statusCode ?? resolveErr?.message}`);
      }
    }
  }

  return admins;
}
