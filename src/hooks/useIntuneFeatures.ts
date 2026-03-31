"use client";

import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "~/config/authConfig";
import { useCallback } from "react";
import type { FeaturesData, FeatureDetectionResult } from "~/types/features";
import {
  fetchApprovalPolicies,
  fetchRoleDefinitions,
  fetchScopeTags,
  fetchCompliancePartners,
  fetchDiskEncryptionPolicies,
  fetchWindowsLapsPolicies,
  fetchCloudPKICAs,
  fetchDiagnosticSettings,
  fetchTunnelGateway,
  fetchConnectors,
  fetchRoleAssignments,
  resolveIntuneAdmins,
} from "~/services/features-graph";

export function useIntuneFeatures() {
  const { instance, accounts } = useMsal();

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [instance, accounts]);

  const getArmToken = useCallback(async (): Promise<string | null> => {
    const account = accounts[0];
    if (!account) return null;
    try {
      const response = await instance.acquireTokenSilent({
        scopes: ["https://management.azure.com/user_impersonation"],
        account,
      });
      return response.accessToken;
    } catch {
      console.warn("[features] Could not acquire ARM token — diagnostic settings will be skipped");
      return null;
    }
  }, [instance, accounts]);

  return useQuery<FeaturesData>({
    queryKey: ["intuneFeatures"],
    queryFn: async (): Promise<FeaturesData> => {
      const token = await getAccessToken();
      const armToken = await getArmToken();

      // Parallel fetch all feature data
      const [
        approvalPolicies,
        allRoles,
        scopeTags,
        compliancePartners,
        diskEncryptionPolicies,
        windowsLapsPolicies,
        cloudPKICAs,
        diagnosticSettings,
        tunnelGateway,
        connectors,
        roleAssignments,
      ] = await Promise.all([
        fetchApprovalPolicies(token),
        fetchRoleDefinitions(token),
        fetchScopeTags(token),
        fetchCompliancePartners(token),
        fetchDiskEncryptionPolicies(token),
        fetchWindowsLapsPolicies(token),
        fetchCloudPKICAs(token),
        fetchDiagnosticSettings(armToken),
        fetchTunnelGateway(token),
        fetchConnectors(token),
        fetchRoleAssignments(token),
      ]);

      const customRoles = allRoles.filter((r) => !r.isBuiltIn);
      const intuneAdmins = await resolveIntuneAdmins(
        token,
        roleAssignments,
        allRoles,
        scopeTags,
      );

      // Build feature detection results
      const features: FeatureDetectionResult[] = [
        {
          id: "multi-admin-approval",
          name: "Multi Admin Approval",
          status: approvalPolicies.length > 0 ? "detected" : "not_detected",
          details:
            approvalPolicies.length > 0
              ? `${approvalPolicies.length} approval policy(ies)`
              : "No approval policies found",
        },
        {
          id: "custom-roles",
          name: "Custom Roles",
          status: customRoles.length > 0 ? "detected" : "not_detected",
          details:
            customRoles.length > 0
              ? `${customRoles.length} custom role(s) out of ${allRoles.length} total`
              : "No custom roles found",
        },
        {
          id: "scope-tags",
          name: "Scope Tags Configured",
          status:
            scopeTags.filter((t) => t.displayName !== "Default").length > 0
              ? "detected"
              : "not_detected",
          details: `${scopeTags.length} scope tag(s) (including Default)`,
        },
        {
          id: "compliance-partners",
          name: "Partner Compliance Management",
          status: compliancePartners.length > 0 ? "detected" : "not_detected",
          details:
            compliancePartners.length > 0
              ? `${compliancePartners.length} partner(s) configured`
              : "No compliance partners found",
        },
        {
          id: "bitlocker-encryption",
          name: "BitLocker Encryption",
          status:
            diskEncryptionPolicies.length > 0 ? "detected" : "not_detected",
          details:
            diskEncryptionPolicies.length > 0
              ? `${diskEncryptionPolicies.length} policy(ies), ${diskEncryptionPolicies.filter((p) => p.isAssigned).length} assigned`
              : "No disk encryption policies found",
        },
        {
          id: "windows-laps",
          name: "Windows LAPS",
          status:
            windowsLapsPolicies.length > 0 ? "detected" : "not_detected",
          details:
            windowsLapsPolicies.length > 0
              ? `${windowsLapsPolicies.length} policy(ies), ${windowsLapsPolicies.filter((p) => p.isAssigned).length} assigned`
              : "No Windows LAPS policies found",
        },
        {
          id: "cloud-pki",
          name: "Cloud PKI",
          status: cloudPKICAs.length > 0 ? "detected" : "not_detected",
          details:
            cloudPKICAs.length > 0
              ? `${cloudPKICAs.length} CA(s) configured`
              : "No Cloud PKI CAs found",
        },
        {
          id: "diagnostic-settings",
          name: "Diagnostic Settings",
          status: diagnosticSettings.length > 0 ? "detected" : "not_detected",
          details:
            diagnosticSettings.length > 0
              ? `${diagnosticSettings.length} setting(s) configured`
              : "No diagnostic settings found",
        },
        {
          id: "tunnel-gateway",
          name: "MS Tunnel Gateway",
          status:
            tunnelGateway.sites.length > 0 ? "detected" : "not_detected",
          details:
            tunnelGateway.sites.length > 0
              ? `${tunnelGateway.sites.length} site(s), ${tunnelGateway.servers.length} server(s)`
              : "No Tunnel Gateway configured",
        },
        {
          id: "connectors",
          name: "Connectors",
          status:
            connectors.ndesConnectors.length > 0 ||
            connectors.domainJoinConnectors.length > 0
              ? "detected"
              : "not_detected",
          details:
            connectors.ndesConnectors.length > 0 ||
            connectors.domainJoinConnectors.length > 0
              ? `${connectors.domainJoinConnectors.length} Domain Join, ${connectors.ndesConnectors.length} NDES`
              : "No connectors found",
        },
      ];

      const detected = features.filter((f) => f.status === "detected").length;
      console.log(
        `[features] Detection complete: ${detected}/${features.length} features detected, ${intuneAdmins.length} admin(s)`,
      );

      return {
        features,
        approvalPolicies,
        customRoles,
        allRoles,
        scopeTags,
        compliancePartners,
        diskEncryptionPolicies,
        cloudPKICAs,
        diagnosticSettings,
        tunnelGateway,
        connectors,
        windowsLapsPolicies,
        intuneAdmins,
      };
    },
    enabled: accounts.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
