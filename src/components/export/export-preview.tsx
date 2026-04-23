"use client";

import { useState, useMemo, useCallback } from "react";
import {
  FileDown,
  FileText,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import type { PolicyData } from "~/types/graph";
import type { FeaturesData } from "~/types/features";
import {
  REPORT_CATEGORIES,
  generateHtmlReport,
  downloadHtmlReport,
} from "~/services/report-generator";
import { generateAndDownloadPdf } from "~/services/pdf-report-generator";

interface ExportPreviewProps {
  policies: PolicyData[];
  features: FeaturesData | null;
  featuresLoading: boolean;
}

export function ExportPreview({ policies, features, featuresLoading }: ExportPreviewProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(REPORT_CATEGORIES.map((c) => c.id)),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfDone, setIsPdfDone] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const categoryCounts = useMemo(
    () =>
      REPORT_CATEGORIES.map((cat) => ({
        ...cat,
        count: policies.filter(cat.filter).length,
      })),
    [policies],
  );

  const selectedPolicyCount = useMemo(() => {
    const seen = new Set<string>();
    for (const cat of REPORT_CATEGORIES) {
      if (!selectedCategories.has(cat.id)) continue;
      for (const p of policies) {
        if (cat.filter(p)) seen.add(p.id);
      }
    }
    return seen.size;
  }, [policies, selectedCategories]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsDone(false);
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedCategories((prev) => {
      const allSelected = REPORT_CATEGORIES.every((c) => prev.has(c.id));
      return allSelected
        ? new Set<string>()
        : new Set(REPORT_CATEGORIES.map((c) => c.id));
    });
    setIsDone(false);
  }, []);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    // Small timeout to let the spinner render
    setTimeout(() => {
      try {
        const html = generateHtmlReport(policies, {
          categories: Array.from(selectedCategories),
        });
        downloadHtmlReport(html);
        setIsDone(true);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  }, [policies, selectedCategories]);

  const handleGeneratePdf = useCallback(async () => {
    if (!features) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      await generateAndDownloadPdf(policies, features);
      setIsPdfDone(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfError(
        err instanceof Error ? err.message : "PDF generation failed",
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [policies, features]);

  const allSelected = REPORT_CATEGORIES.every((c) =>
    selectedCategories.has(c.id),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Category selection */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Report Sections</h2>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-primary hover:underline"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {categoryCounts.map((cat) => (
              <label
                key={cat.id}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedCategories.has(cat.id)
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{cat.label}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {cat.count}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary & generate */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Report Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sections</dt>
                <dd className="font-medium">
                  {selectedCategories.size} / {REPORT_CATEGORIES.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Policies included</dt>
                <dd className="font-medium">{selectedPolicyCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-medium">HTML (self-contained)</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {isDone ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Report downloaded!
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors w-full justify-center"
                >
                  <RotateCcw className="h-4 w-4" />
                  Download Again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || selectedCategories.size === 0}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating&hellip;
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Generate &amp; Download Report
                  </>
                )}
              </button>
            )}

            {selectedCategories.size === 0 && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Select at least one section to export.
              </p>
            )}
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-3">Full PDF Report</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Exports all policies + feature detection data as a single PDF.
            </p>
            {pdfError ? (
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-destructive">
                  {pdfError}
                </p>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={!features}
                  className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors w-full justify-center disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : isPdfDone ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  PDF downloaded!
                </p>
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors w-full justify-center"
                >
                  <RotateCcw className="h-4 w-4" />
                  Download Again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf || !features || featuresLoading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PDF&hellip;
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate &amp; Download PDF
                  </>
                )}
              </button>
            )}
            {featuresLoading && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                Loading features data&hellip;
              </p>
            )}
            {!featuresLoading && !features && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Features data unavailable. PDF export disabled.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          The report is generated entirely in your browser. No data is sent to
          any server. The HTML file includes Bootstrap, DataTables, and Chart.js
          via CDN for interactive tables and visualizations.
        </p>
      </div>
    </div>
  );
}
