import type { PolicyData } from "~/types/graph";

// ─── Category helpers (shared with dashboard) ───────────────────────────────

export interface ReportCategory {
  id: string;
  label: string;
  filter: (p: PolicyData) => boolean;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "all",
    label: "All Policies",
    filter: () => true,
  },
  {
    id: "deviceConfig",
    label: "Device Configurations",
    filter: (p) =>
      p.type === "Device Configuration" ||
      p.type === "Settings Catalog" ||
      p.type === "Administrative Template",
  },
  {
    id: "compliance",
    label: "Compliance Policies",
    filter: (p) => p.type === "Compliance Policy",
  },
  {
    id: "endpointSecurity",
    label: "Endpoint Security",
    filter: (p) => p.type.startsWith("Endpoint Security"),
  },
  {
    id: "apps",
    label: "Applications",
    filter: (p) =>
      p.type === "Application" ||
      p.type === "App Protection Policy" ||
      p.type === "App Configuration Policy",
  },
  {
    id: "scripts",
    label: "Scripts",
    filter: (p) =>
      p.type === "Script" || p.type === "Proactive Remediation Script",
  },
  {
    id: "enrollment",
    label: "Enrollment",
    filter: (p) =>
      p.type === "Autopilot Profile" || p.type === "Enrollment Status Page",
  },
  {
    id: "cloudpc",
    label: "Windows 365",
    filter: (p) =>
      p.type === "Cloud PC Provisioning Policy" ||
      p.type === "Cloud PC User Setting",
  },
  {
    id: "other",
    label: "Other",
    filter: (p) =>
      ![
        "Device Configuration",
        "Settings Catalog",
        "Administrative Template",
        "Compliance Policy",
        "Application",
        "App Protection Policy",
        "App Configuration Policy",
        "Script",
        "Proactive Remediation Script",
        "Autopilot Profile",
        "Enrollment Status Page",
        "Cloud PC Provisioning Policy",
        "Cloud PC User Setting",
      ].includes(p.type) && !p.type.startsWith("Endpoint Security"),
  },
];

// ─── Badge helpers ──────────────────────────────────────────────────────────

function badgeClass(status: PolicyData["assignmentStatus"]): string {
  switch (status) {
    case "All Users":
      return "badge-all-users";
    case "All Devices":
      return "badge-all-devices";
    case "Group":
      return "badge-group";
    case "Exclude":
      return "badge-exclude";
    default:
      return "badge-none";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Table row builder ──────────────────────────────────────────────────────

function buildTableRows(policies: PolicyData[]): string {
  if (policies.length === 0) {
    return `<tr>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>`;
  }

  return policies
    .map(
      (p) => `
        <tr>
          <td>${escapeHtml(p.name)}</td>
          <td><span class="badge ${badgeClass(p.assignmentStatus)}">${escapeHtml(p.assignmentStatus)}</span></td>
          <td>${p.assignedTo.length > 0 ? escapeHtml(p.assignedTo.join("; ")) : "Not Assigned"}</td>
          <td>${escapeHtml(p.type)}</td>
          <td>${escapeHtml(p.platform ?? "N/A")}</td>
        </tr>`,
    )
    .join("\n");
}

// ─── Tab builder ────────────────────────────────────────────────────────────

function buildTab(
  cat: ReportCategory,
  policies: PolicyData[],
  index: number,
): string {
  const filtered = policies.filter(cat.filter);
  const isFirst = index === 0;
  const activeClass = isFirst ? "active" : "";
  const showClass = isFirst ? "show active" : "";

  return `
    <li class="nav-item" role="presentation">
      <button class="nav-link ${activeClass}" id="${cat.id}-tab" data-bs-toggle="tab"
        data-bs-target="#${cat.id}" type="button" role="tab"
        aria-controls="${cat.id}" aria-selected="${isFirst}">
        ${escapeHtml(cat.label)} <span class="badge bg-secondary ms-1">${filtered.length}</span>
      </button>
    </li>`;
}

function buildTabPane(
  cat: ReportCategory,
  policies: PolicyData[],
  index: number,
): string {
  const filtered = policies.filter(cat.filter);
  const isFirst = index === 0;
  const showClass = isFirst ? "show active" : "";

  return `
    <div class="tab-pane fade ${showClass}" id="${cat.id}" role="tabpanel" aria-labelledby="${cat.id}-tab">
      <div class="table-container">
        <table class="table table-striped policy-table">
          <thead>
            <tr>
              <th>Policy Name</th>
              <th>Assignment Type</th>
              <th>Assigned To</th>
              <th>Type</th>
              <th>Platform</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(filtered)}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── Compute stats ──────────────────────────────────────────────────────────

function computeStats(policies: PolicyData[]) {
  const total = policies.length;
  const allUsers = policies.filter(
    (p) => p.assignmentStatus === "All Users",
  ).length;
  const allDevices = policies.filter(
    (p) => p.assignmentStatus === "All Devices",
  ).length;
  const group = policies.filter(
    (p) => p.assignmentStatus === "Group",
  ).length;
  const unassigned = policies.filter(
    (p) => p.assignmentStatus === "None",
  ).length;

  return { total, allUsers, allDevices, group, unassigned };
}

// ─── Compute type counts for bar chart ──────────────────────────────────────

function computeTypeCounts(policies: PolicyData[]) {
  // Skip "all" and "other" for the bar chart
  return REPORT_CATEGORIES.filter((c) => c.id !== "all" && c.id !== "other").map(
    (cat) => ({
      label: cat.label,
      count: policies.filter(cat.filter).length,
    }),
  );
}

// ─── Main generator ─────────────────────────────────────────────────────────

export interface ReportOptions {
  /** Which categories to include. Defaults to all. */
  categories?: string[];
}

export function generateHtmlReport(
  policies: PolicyData[],
  options?: ReportOptions,
): string {
  const enabledIds = options?.categories ?? REPORT_CATEGORIES.map((c) => c.id);
  const cats = REPORT_CATEGORIES.filter((c) => enabledIds.includes(c.id));

  const stats = computeStats(policies);
  const typeCounts = computeTypeCounts(policies);
  const generatedAt = new Date().toLocaleString();

  const chartLabels = JSON.stringify(typeCounts.map((t) => t.label));
  const chartData = JSON.stringify(typeCounts.map((t) => t.count));

  const tabHeaders = cats.map((c, i) => buildTab(c, policies, i)).join("\n");
  const tabPanes = cats.map((c, i) => buildTabPane(c, policies, i)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Intune Assignment Report</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css" rel="stylesheet" />
  <link href="https://cdn.datatables.net/buttons/2.4.2/css/buttons.bootstrap5.min.css" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet" />
  <style>
    :root {
      --bg-color: #f5f7fa; --text-color: #000; --card-bg: #fff;
      --table-bg: #fff; --hover-bg: #f8f9fa; --border-color: #dee2e6;
      --summary-bg: #f8f9fa; --input-bg: #fff; --input-border: #dee2e6;
      --muted-text: #6c757d; --search-bg: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      --thead-bg: #f8f9fa; --stat-color: #0d6efd; --table-stripe: rgba(0,0,0,.02);
    }
    [data-theme="dark"] {
      --bg-color: #1a1a1a; --text-color: #e0e0e0; --card-bg: #2d2d2d;
      --table-bg: #2d2d2d; --hover-bg: #3d3d3d; --border-color: #404040;
      --summary-bg: #2d2d2d; --input-bg: #3d3d3d; --input-border: #555;
      --muted-text: #aaa; --search-bg: linear-gradient(135deg, #2d2d2d 0%, #333 100%);
      --thead-bg: #383838; --stat-color: #6ea8fe; --table-stripe: rgba(255,255,255,.03);
    }
    body { padding: 20px; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background-color: var(--bg-color); color: var(--text-color); transition: background-color .3s ease, color .3s ease; }
    .card { margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,.1); border-radius: 10px; background-color: var(--card-bg) !important; transition: transform .2s, background-color .3s ease; border-color: var(--border-color) !important; color: var(--text-color) !important; }
    .card:hover { transform: translateY(-2px); }
    .card-body { background-color: transparent !important; color: var(--text-color) !important; }
    .card-title { color: var(--text-color) !important; }
    .card-text { color: var(--stat-color) !important; }
    .badge-all-users { background-color: #28a745; color: white; padding: 5px 10px; border-radius: 15px; }
    .badge-all-devices { background-color: #17a2b8; color: white; padding: 5px 10px; border-radius: 15px; }
    .badge-group { background-color: #ffc107; color: black; padding: 5px 10px; border-radius: 15px; }
    .badge-none { background-color: #dc3545; color: white; padding: 5px 10px; border-radius: 15px; }
    .badge-exclude { background-color: #6c757d; color: white; padding: 5px 10px; border-radius: 15px; }
    .summary-card { background-color: var(--summary-bg) !important; border: none; }
    .table-container { margin-top: 20px; background: var(--table-bg); padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,.05); transition: background-color .3s ease; }
    .table { color: var(--text-color) !important; background-color: transparent !important; }
    .table thead th { color: var(--text-color) !important; background-color: var(--thead-bg) !important; border-color: var(--border-color) !important; }
    .table td { border-color: var(--border-color) !important; color: var(--text-color) !important; }
    .table-striped > tbody > tr:nth-of-type(odd) > * { background-color: var(--table-stripe) !important; color: var(--text-color) !important; --bs-table-bg-type: transparent; }
    .table-striped > tbody > tr:nth-of-type(even) > * { background-color: transparent !important; color: var(--text-color) !important; }
    .table tbody tr:hover td { background-color: var(--hover-bg) !important; }
    .dataTables_wrapper { color: var(--text-color) !important; }
    .dataTables_info, .dataTables_length, .dataTables_filter label { color: var(--text-color) !important; }
    .dataTables_length select, .dataTables_filter input { background-color: var(--input-bg) !important; color: var(--text-color) !important; border-color: var(--input-border) !important; }
    .dataTables_paginate .page-link { background-color: var(--card-bg) !important; color: var(--text-color) !important; border-color: var(--border-color) !important; }
    .dataTables_paginate .page-item.active .page-link { background-color: #0d6efd !important; color: white !important; border-color: #0d6efd !important; }
    .dt-buttons .btn { background-color: var(--card-bg) !important; color: var(--text-color) !important; border-color: var(--border-color) !important; }
    .dt-buttons .btn:hover { background-color: var(--hover-bg) !important; }
    .nav-tabs { margin-bottom: 20px; border-bottom: 2px solid var(--border-color); }
    .nav-tabs .nav-link { border: none; color: var(--muted-text); padding: 10px 20px; margin-right: 5px; border-radius: 5px 5px 0 0; }
    .nav-tabs .nav-link:hover { color: var(--text-color); }
    .nav-tabs .nav-link.active { color: #0d6efd; border-bottom: 2px solid #0d6efd; font-weight: 500; background-color: transparent; }
    .tab-content { padding: 20px; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 10px 10px; background-color: var(--card-bg); }
    .chart-container { margin: 10px 0; padding: 15px; background: var(--card-bg); border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,.05); height: 300px; display: flex; justify-content: center; align-items: center; }
    .policy-table { width: 100% !important; }
    .policy-table thead th { background-color: var(--thead-bg) !important; font-weight: 600; }
    .report-header { background: linear-gradient(135deg, #0d6efd 0%, #0099ff 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,.1); position: relative; }
    .report-header h1 { margin: 0; font-weight: 300; }
    .report-header p { margin: 10px 0 0 0; opacity: .9; }
    .theme-toggle { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; transition: transform .3s ease; }
    .theme-toggle:hover { transform: scale(1.1); }
    .summary-stat { text-align: center; padding: 20px; }
    .summary-stat h3 { font-size: 2rem; font-weight: 300; margin: 10px 0; color: var(--stat-color); }
    .summary-stat p, .text-muted { color: var(--muted-text) !important; }
    .search-box { margin: 20px 0; padding: 20px; background: var(--search-bg); border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,.05); }
    .search-box input, .form-control { background-color: var(--input-bg) !important; color: var(--text-color) !important; border: 2px solid var(--input-border); transition: border-color .3s ease; }
    .search-box input:focus, .form-control:focus { border-color: #0d6efd; box-shadow: 0 0 0 .2rem rgba(13,110,253,.25); }
    .form-select, #assignmentTypeFilter { border: 2px solid var(--input-border); border-radius: 5px; padding: 8px; transition: all .3s ease; background-color: var(--input-bg) !important; color: var(--text-color) !important; }
    .form-select:focus, #assignmentTypeFilter:focus { border-color: #0d6efd; box-shadow: 0 0 0 .2rem rgba(13,110,253,.25); outline: none; }
    .form-label { color: var(--text-color); margin-bottom: .5rem; font-weight: 500; }
    @media print {
      body { background-color: white !important; color: black !important; }
      .card, .table-container, .tab-content { background-color: white !important; color: black !important; box-shadow: none !important; }
      .theme-toggle, .buttons-collection { display: none !important; }
      .table { color: black !important; }
      .table thead th { color: black !important; background-color: #f8f9fa !important; }
    }
  </style>
</head>
<body>
  <div class="container-fluid">
    <!-- Header -->
    <div class="report-header">
      <button class="theme-toggle" onclick="document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? '' : 'dark')">
        <i class="fas fa-moon"></i>
      </button>
      <h1><i class="fas fa-clipboard-check me-2"></i>Intune Assignment Report</h1>
      <p>Generated on ${escapeHtml(generatedAt)} &bull; ${stats.total} policies</p>
    </div>

    <!-- Summary Cards -->
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="card summary-card">
          <div class="card-body">
            <h5 class="card-title">Summary</h5>
            <div class="row">
              <div class="col">
                <div class="card text-center summary-card">
                  <div class="card-body summary-stat">
                    <i class="fas fa-layer-group mb-3" style="font-size:2rem;color:#0d6efd"></i>
                    <h5 class="card-title">Total Policies</h5>
                    <h3 class="card-text">${stats.total}</h3>
                    <p class="text-muted small">Total configured policies</p>
                  </div>
                </div>
              </div>
              <div class="col">
                <div class="card text-center summary-card">
                  <div class="card-body summary-stat">
                    <i class="fas fa-users mb-3" style="font-size:2rem;color:#28a745"></i>
                    <h5 class="card-title">All Users</h5>
                    <h3 class="card-text">${stats.allUsers}</h3>
                    <p class="text-muted small">Assigned to all users</p>
                  </div>
                </div>
              </div>
              <div class="col">
                <div class="card text-center summary-card">
                  <div class="card-body summary-stat">
                    <i class="fas fa-laptop mb-3" style="font-size:2rem;color:#17a2b8"></i>
                    <h5 class="card-title">All Devices</h5>
                    <h3 class="card-text">${stats.allDevices}</h3>
                    <p class="text-muted small">Assigned to all devices</p>
                  </div>
                </div>
              </div>
              <div class="col">
                <div class="card text-center summary-card">
                  <div class="card-body summary-stat">
                    <i class="fas fa-object-group mb-3" style="font-size:2rem;color:#ffc107"></i>
                    <h5 class="card-title">Group Assigned</h5>
                    <h3 class="card-text">${stats.group}</h3>
                    <p class="text-muted small">Assigned to specific groups</p>
                  </div>
                </div>
              </div>
              <div class="col">
                <div class="card text-center summary-card">
                  <div class="card-body summary-stat">
                    <i class="fas fa-exclamation-triangle mb-3" style="font-size:2rem;color:#dc3545"></i>
                    <h5 class="card-title">Unassigned</h5>
                    <h3 class="card-text">${stats.unassigned}</h3>
                    <p class="text-muted small">Not assigned to any target</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="row">
          <div class="col-md-6">
            <div class="chart-container">
              <canvas id="policyDistributionChart"></canvas>
            </div>
          </div>
          <div class="col-md-6">
            <div class="chart-container">
              <canvas id="policyTypesChart"></canvas>
            </div>
          </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          var ctx1 = document.getElementById("policyDistributionChart").getContext("2d");
          new Chart(ctx1, {
            type: "pie",
            data: {
              labels: ["All Users", "All Devices", "Group Assigned", "Unassigned"],
              datasets: [{
                data: [${stats.allUsers}, ${stats.allDevices}, ${stats.group}, ${stats.unassigned}],
                backgroundColor: ["#28a745", "#17a2b8", "#ffc107", "#dc3545"],
                hoverOffset: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { position: "bottom", labels: { font: { size: 10 } } },
                title: { display: true, text: "Policy Assignment Distribution", font: { size: 14 } }
              }
            }
          });

          var ctx2 = document.getElementById("policyTypesChart").getContext("2d");
          new Chart(ctx2, {
            type: "bar",
            data: {
              labels: ${chartLabels},
              datasets: [{
                label: "Number of Policies",
                data: ${chartData},
                backgroundColor: ["#4e73df","#1cc88a","#36b9cc","#f6c23e","#e74a3b","#858796","#5a5c69","#2e59d9"]
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { display: false }, title: { display: true, text: "Policy Types Distribution", font: { size: 14 } } },
              scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
            }
          });
        </script>
      </div>
    </div>

    <!-- Search / Filter -->
    <div class="search-box">
      <div class="row align-items-end">
        <div class="col-md-6">
          <div class="form-group">
            <label for="groupSearch">Search by Group Name:</label>
            <input type="text" class="form-control" id="groupSearch" placeholder="Enter group name..." />
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="assignmentTypeFilter" class="form-label">Filter by Assignment Type:</label>
            <select class="form-select" id="assignmentTypeFilter">
              <option value="all">All Types</option>
              <option value="All Users">All Users</option>
              <option value="All Devices">All Devices</option>
              <option value="Group">Group</option>
              <option value="None">None</option>
              <option value="Exclude">Exclude</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs" id="assignmentTabs" role="tablist">
      ${tabHeaders}
    </ul>

    <div class="tab-content" id="assignmentTabContent">
      ${tabPanes}
    </div>
  </div>

  <!-- Scripts -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.bootstrap5.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js"></script>
  <script>
    jQuery(document).ready(function () {
      var tables = jQuery(".policy-table").DataTable({
        dom: "Blfrtip",
        buttons: ["copyHtml5", "excelHtml5", "csvHtml5"],
        pageLength: 25,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
        order: [[0, "asc"]]
      });

      // Assignment Type Filter
      jQuery("#assignmentTypeFilter").on("change", function () {
        var filterValue = jQuery(this).val();
        jQuery(".policy-table").each(function () {
          var dt = jQuery(this).DataTable();
          if (filterValue === "all") {
            dt.search("").columns().search("").draw();
          } else {
            dt.column(1).search(filterValue, false, false).draw();
          }
        });
      });

      // Group Search
      jQuery("#groupSearch").on("keyup", function () {
        var searchValue = jQuery(this).val();
        jQuery(".policy-table").each(function () {
          jQuery(this).DataTable().column(2).search(searchValue).draw();
        });
      });
    });
  </script>
</body>
</html>`;
}

// ─── Download helper ────────────────────────────────────────────────────────

export function downloadHtmlReport(html: string, filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `intune-assignment-report-${date}.html`;
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
