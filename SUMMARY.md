# Intune Assignments Visualizer — Graph API Endpoints Summary

This document maps every Microsoft Graph API endpoint used in this application to the UI tab/feature that calls it.

> **API Version**: All endpoints use the **Microsoft Graph Beta API** (`/beta/`) unless noted otherwise.  
> **Auth**: All calls are made client-side using MSAL with delegated permissions.

---

## Quick Reference by UI Tab

| UI Tab | # of Endpoints | Primary Focus |
|--------|:--------------:|---------------|
| [Overview](#overview) | 14+ | All policy types aggregated |
| [Device Configs](#device-configs) | 3 | Configuration profiles, Settings Catalog, Admin Templates |
| [Compliance](#compliance) | 1 | Device compliance policies |
| [Endpoint Security](#endpoint-security) | 2 | Security intents + filtered Settings Catalog |
| [Apps](#apps) | 5 | Mobile apps, App Protection, App Configuration |
| [Scripts](#scripts) | 2 | Device management scripts, Proactive remediations |
| [Enrollment](#enrollment) | 2 | Autopilot profiles, ESP configurations |
| [Windows 365](#windows-365) | 2 | Cloud PC provisioning & user settings |
| [Other](#other) | — | Policies not matching other categories |
| [Dashboard](#dashboard-spotlight-search) | 3 | User, device, and group search |
| [Compare](#compare) | 14+ | Side-by-side assignment comparison |
| [Explorer](#explorer) | 14+ | Interactive assignment graph visualization |
| [Search](#search) | 3 | Unified search across users, devices, groups |

---

## Overview

Fetches **all** policy types and displays aggregated assignment data. Calls every policy endpoint listed below, plus group name resolution.

### All Policy Endpoints (called in parallel)

| # | Graph API Endpoint | HTTP | Purpose |
|---|-------------------|------|---------|
| 1 | `/deviceManagement/deviceConfigurations` | GET | Device configuration profiles |
| 2 | `/deviceManagement/deviceCompliancePolicies` | GET | Compliance policies |
| 3 | `/deviceAppManagement/mobileApps` | GET | Mobile apps (filtered: `isAssigned eq true`) |
| 3a | `/deviceAppManagement/mobileApps('{id}')/assignments` | GET | Per-app assignments (batched, 10 at a time) |
| 4 | `/deviceManagement/deviceManagementScripts` | GET | PowerShell scripts |
| 5 | `/deviceManagement/configurationPolicies` | GET | Settings Catalog policies |
| 6 | `/deviceManagement/groupPolicyConfigurations` | GET | Administrative Templates (Group Policy) |
| 7 | `/deviceAppManagement/androidManagedAppProtections` | GET | Android app protection |
| 8 | `/deviceAppManagement/iosManagedAppProtections` | GET | iOS app protection |
| 9 | `/deviceAppManagement/windowsManagedAppProtections` | GET | Windows app protection |
| 9a | `/deviceAppManagement/managedAppPolicies` | GET | Fallback for app protection |
| 10 | `/deviceAppManagement/mobileAppConfigurations` | GET | App configuration policies |
| 11 | `/deviceManagement/deviceHealthScripts` | GET | Proactive remediation scripts |
| 12 | `/deviceManagement/windowsAutopilotDeploymentProfiles` | GET | Autopilot deployment profiles |
| 13 | `/deviceManagement/deviceEnrollmentConfigurations` | GET | Enrollment Status Page (ESP) profiles |
| 14 | `/deviceManagement/virtualEndpoint/provisioningPolicies` | GET | Cloud PC provisioning policies |
| 15 | `/deviceManagement/virtualEndpoint/userSettings` | GET | Cloud PC user settings |
| 16 | `/deviceManagement/intents` | GET | Endpoint security intents |

### Supporting Endpoints (called as needed)

| # | Graph API Endpoint | HTTP | Purpose |
|---|-------------------|------|---------|
| 17 | `/directoryObjects/getByIds` | **POST** | Batch resolve group IDs → display names (up to 1000 per request) |
| 18 | `{any-policy-endpoint}/assignments` | GET | Fallback assignment fetch when `$expand=assignments` fails |

**Files**: `src/services/graph.ts`, `src/hooks/useIntuneData.ts`

---

## Device Configs

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/deviceConfigurations` | Classic device configuration profiles |
| `/deviceManagement/configurationPolicies` | Settings Catalog policies |
| `/deviceManagement/groupPolicyConfigurations` | Administrative Templates |

**Detail expansion** (when clicking a policy):
| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/configurationPolicies/{id}/settings` | Settings Catalog detailed settings |
| `/deviceManagement/groupPolicyConfigurations/{id}/definitionValues?$expand=definition` | Admin Template definitions |

---

## Compliance

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/deviceCompliancePolicies` | All device compliance policies with assignments |

---

## Endpoint Security

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/intents` | Security intents (Antivirus, Disk Encryption, Firewall, EDR, ASR, EPM) |
| `/deviceManagement/configurationPolicies` | Settings Catalog policies filtered by `templateFamily` for security categories |

Policies are categorized into sub-tabs (Antivirus, Disk Encryption, Firewall, etc.) based on their `templateFamily` property.

---

## Apps

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceAppManagement/mobileApps` | All assigned mobile applications |
| `/deviceAppManagement/mobileApps('{id}')/assignments` | Per-app assignment details |
| `/deviceAppManagement/androidManagedAppProtections` | Android app protection policies |
| `/deviceAppManagement/iosManagedAppProtections` | iOS app protection policies |
| `/deviceAppManagement/windowsManagedAppProtections` | Windows app protection policies |
| `/deviceAppManagement/mobileAppConfigurations` | App configuration policies |

> **Note**: Mobile apps use a filter of `isAssigned eq true` and fetch assignments in batches of 10 due to Graph API expand limitations.

---

## Scripts

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/deviceManagementScripts` | PowerShell device management scripts |
| `/deviceManagement/deviceHealthScripts` | Proactive remediation (health) scripts |

---

## Enrollment

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/windowsAutopilotDeploymentProfiles` | Windows Autopilot deployment profiles |
| `/deviceManagement/deviceEnrollmentConfigurations` | Enrollment Status Page (ESP) — filtered by `@odata.type` containing `EnrollmentCompletionPageConfiguration` |

---

## Windows 365

| Graph API Endpoint | Purpose |
|-------------------|---------|
| `/deviceManagement/virtualEndpoint/provisioningPolicies` | Cloud PC provisioning policies |
| `/deviceManagement/virtualEndpoint/userSettings` | Cloud PC user settings |

---

## Dashboard (Spotlight Search)

The dashboard includes a global search bar that queries users, devices, and groups in parallel.

| Graph API Endpoint | HTTP | Filter / Query | Purpose |
|-------------------|------|-----------------|---------|
| `/users` | GET | `startsWith(displayName,'{q}') or startsWith(mail,'{q}') or startsWith(userPrincipalName,'{q}')` / `$top=10` | Search users |
| `/deviceManagement/managedDevices` | GET | Client-side match on `deviceName` or `serialNumber` / `$top=200` | Search devices |
| `/groups` | GET | `startsWith(displayName,'{q}')` / `$top=10` | Search groups |

**File**: `src/services/graph.ts` → `searchAll()` (calls `searchUsers()` + `searchDevices()` in parallel)

---

## Compare

Side-by-side assignment comparison between two users, devices, or groups.

**Uses all 14+ policy endpoints** (same as Overview) to load assignments, plus:

| Graph API Endpoint | HTTP | Purpose |
|-------------------|------|---------|
| `/users/{userId}` | GET | Resolve user details for comparison subjects |
| `/users/{userId}/transitiveMemberOf` | GET | Get all groups (including nested) for a user |
| `/deviceManagement/managedDevices/{deviceId}` | GET | Resolve device details |
| `/devices(deviceId='{azureAdDeviceId}')/transitiveMemberOf` | GET | Get all groups for a device (via Azure AD device ID) |
| `/groups/{groupId}` | GET | Resolve group details |

---

## Explorer

Interactive graph visualization of assignment relationships (user/device → groups → policies).

**Uses all 14+ policy endpoints** (same as Overview), plus:

| Graph API Endpoint | HTTP | Purpose |
|-------------------|------|---------|
| `/users/{userId}/transitiveMemberOf` | GET | Map user → group memberships (transitive) |
| `/deviceManagement/managedDevices/{deviceId}` | GET | Lookup managed device → Azure AD device ID |
| `/devices(deviceId='{azureAdDeviceId}')/transitiveMemberOf` | GET | Map device → group memberships (transitive) |
| `/users`, `/deviceManagement/managedDevices`, `/groups` | GET | Unified search for entity selection |

---

## Search

Unified search across all entity types.

| Graph API Endpoint | HTTP | Filter | Purpose |
|-------------------|------|--------|---------|
| `/users` | GET | `startsWith` on displayName, mail, UPN | Find users |
| `/deviceManagement/managedDevices` | GET | Client-side string match | Find devices |
| `/groups` | GET | `startsWith(displayName,'{q}')` | Find groups |

---

## User & Device Detail Pages (`/assignments/[type]/[id]`)

When navigating to a specific user, device, or group's assignment detail page:

| Graph API Endpoint | HTTP | Purpose |
|-------------------|------|---------|
| `/users/{userId}` | GET | User details (name, email, job title, department) |
| `/users/{userId}/photo/$value` | GET | User profile photo (**uses v1.0**, direct REST fetch) |
| `/users/{userId}/transitiveMemberOf` | GET | All group memberships for assignment matching |
| `/deviceManagement/managedDevices/{deviceId}` | GET | Device details |
| `/devices(deviceId='{azureAdDeviceId}')/transitiveMemberOf` | GET | Device group memberships |
| `/groups/{groupId}` | GET | Group display name |
| All policy endpoints | GET | Load all policies to match assignments |

---

## Policy Configuration Details

When expanding/clicking a policy to see its settings:

| Policy Type | Detail Endpoint |
|------------|-----------------|
| Settings Catalog | `/deviceManagement/configurationPolicies/{id}/settings` |
| Admin Templates | `/deviceManagement/groupPolicyConfigurations/{id}/definitionValues?$expand=definition` |
| Device Configuration | `/deviceManagement/deviceConfigurations/{id}` |
| Compliance | `/deviceManagement/deviceCompliancePolicies/{id}` |
| Mobile Apps | `/deviceAppManagement/mobileApps/{id}` |
| Scripts | `/deviceManagement/deviceManagementScripts/{id}` |
| Health Scripts | `/deviceManagement/deviceHealthScripts/{id}` |
| App Config | `/deviceAppManagement/mobileAppConfigurations/{id}` |
| App Protection | `/deviceAppManagement/{platform}ManagedAppProtections/{id}` |
| Autopilot | `/deviceManagement/windowsAutopilotDeploymentProfiles/{id}` |
| ESP | `/deviceManagement/deviceEnrollmentConfigurations/{id}` |
| Cloud PC Provisioning | `/deviceManagement/virtualEndpoint/provisioningPolicies/{id}` |
| Cloud PC User Settings | `/deviceManagement/virtualEndpoint/userSettings/{id}` |

**File**: `src/services/policy-config.ts` → `fetchPolicyConfiguration()`

---

## Resilience & Performance

| Feature | Detail |
|---------|--------|
| **Retry logic** | Exponential backoff with jitter on 429 (throttled) and 5xx errors, max 3 retries |
| **Pagination** | Automatic `@odata.nextLink` following for all list endpoints |
| **Batch operations** | Group name resolution batches up to 1000 IDs per POST request |
| **App assignment batching** | Mobile app assignments fetched 10 at a time |
| **Client-side caching** | TanStack Query (`@tanstack/react-query`) for data caching and deduplication |

---

## Required API Permissions (Delegated)

| Permission | Used For |
|-----------|----------|
| `User.Read` | Sign-in and read own profile |
| `User.Read.All` | Search and read all user profiles |
| `GroupMember.Read.All` | Read group memberships and search groups |
| `DeviceManagementManagedDevices.Read.All` | Read managed device data |
| `DeviceManagementApps.Read.All` | Read mobile apps, app protection, app configuration |
| `DeviceManagementConfiguration.Read.All` | Read device configs, compliance, settings catalog, admin templates |
| `DeviceManagementServiceConfig.Read.All` | Read enrollment configs, Autopilot profiles, scripts |
| `CloudPC.Read.All` | Read Windows 365 Cloud PC policies and settings |
