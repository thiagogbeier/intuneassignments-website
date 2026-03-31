// ─── Types for Intune Feature Detection ─────────────────────────────────────

export interface ApprovalPolicyGroupMember {
  displayName: string;
  userPrincipalName?: string;
}

export interface ApprovalPolicyGroup {
  id: string;
  displayName: string;
  members: ApprovalPolicyGroupMember[];
}

export interface ApprovalPolicy {
  id: string;
  displayName: string;
  policyType?: string;
  policyPlatform?: string;
  approverGroupIds?: string[];
  approverGroupDisplayNames?: string[];
  approverGroups?: ApprovalPolicyGroup[];
  status?: string;
}

export interface RoleDefinition {
  id: string;
  displayName: string;
  description?: string;
  isBuiltIn: boolean;
  rolePermissions?: { resourceActions: { allowedResourceActions: string[] }[] }[];
}

export interface RoleScopeTag {
  id: string;
  displayName: string;
  description?: string;
}

export interface CompliancePartner {
  id: string;
  displayName?: string;
  partnerState?: string;
}

export interface DiskEncryptionPolicy {
  id: string;
  displayName?: string;
  description?: string;
  templateId?: string;
  isAssigned?: boolean;
  assignments?: { id: string; target?: any }[];
}

export interface WindowsLapsPolicy {
  id: string;
  displayName?: string;
  description?: string;
  templateId?: string;
  isAssigned?: boolean;
  assignments?: { id: string; target?: any }[];
}

export interface CloudPKICertificateAuthority {
  id: string;
  displayName?: string;
  cloudCertificationAuthorityType?: string;
  issuerCommonName?: string;
  certificationAuthorityStatus?: string;
  validityStartDateTime?: string;
  validityEndDateTime?: string;
}

export interface DiagnosticSetting {
  id: string;
  name?: string;
  storageAccountId?: string;
  eventHubAuthorizationRuleId?: string;
  workspaceId?: string;
  logAnalyticsDestinationType?: string;
  marketplacePartnerId?: string;
}

export interface RoleAssignment {
  id: string;
  displayName?: string;
  roleDefinition?: { displayName?: string; id?: string };
  scopeMembers?: string[];
  scopeType?: string;
  resourceScopes?: string[];
  members?: { displayName?: string; userPrincipalName?: string }[];
}

export interface IntuneAdmin {
  displayName: string;
  userPrincipalName: string;
  roleName: string;
  assignmentType: string;
  scope: string;
}

// ─── MS Tunnel Gateway Types ────────────────────────────────────────────────

export interface TunnelSite {
  id: string;
  displayName?: string;
  upgradeAutomatically?: boolean;
  upgradeAvailable?: string;
  microsoftTunnelConfiguration?: { id?: string; displayName?: string };
  createdDateTime?: string;
}

export interface TunnelServer {
  id: string;
  displayName?: string;
  tunnelServerHealthStatus?: string;
  lastCheckinDateTime?: string;
  siteName?: string;
  siteId?: string;
  serverConfigurationName?: string;
}

export interface TunnelConfiguration {
  id: string;
  displayName?: string;
  description?: string;
  network?: string;
  dnsServers?: string[];
  listenPort?: number;
}

export interface TunnelHealthStatus {
  status: string;
  serverName: string;
  siteName: string;
  lastCheckin: string;
}

export interface TunnelGatewayData {
  sites: TunnelSite[];
  servers: TunnelServer[];
  configurations: TunnelConfiguration[];
  healthStatuses: TunnelHealthStatus[];
}

// ─── Connectors ──────────────────────────────────────────────────────────────

export interface NdesConnector {
  id: string;
  displayName?: string;
  state?: string;
  lastConnectionDateTime?: string;
}

export interface DomainJoinConnector {
  id: string;
  displayName?: string;
  lastConnectionDateTime?: string;
  state?: string;
  location?: string;
}

export interface ConnectorsData {
  ndesConnectors: NdesConnector[];
  domainJoinConnectors: DomainJoinConnector[];
}

export type FeatureStatus = "detected" | "not_detected" | "error";

export interface FeatureDetectionResult {
  id: string;
  name: string;
  status: FeatureStatus;
  details: string;
  data?: unknown;
}

export interface FeaturesData {
  features: FeatureDetectionResult[];
  approvalPolicies: ApprovalPolicy[];
  customRoles: RoleDefinition[];
  allRoles: RoleDefinition[];
  scopeTags: RoleScopeTag[];
  compliancePartners: CompliancePartner[];
  diskEncryptionPolicies: DiskEncryptionPolicy[];
  cloudPKICAs: CloudPKICertificateAuthority[];
  diagnosticSettings: DiagnosticSetting[];
  intuneAdmins: IntuneAdmin[];
  tunnelGateway: TunnelGatewayData;
  connectors: ConnectorsData;
  windowsLapsPolicies: WindowsLapsPolicy[];
}
