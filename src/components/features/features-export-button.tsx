"use client";

import { useState, useCallback } from "react";
import { FileDown, CheckCircle2, Loader2 } from "lucide-react";
import type { FeaturesData } from "~/types/features";
import {
  generateFeaturesHtmlReport,
  downloadFeaturesReport,
} from "~/services/features-report-generator";

interface FeaturesExportButtonProps {
  data: FeaturesData;
}

export function FeaturesExportButton({ data }: FeaturesExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleExport = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const html = generateFeaturesHtmlReport(data);
        downloadFeaturesReport(html);
        setIsDone(true);
        setTimeout(() => setIsDone(false), 3000);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  }, [data]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating&hellip;
        </>
      ) : isDone ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Downloaded!
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export Report
        </>
      )}
    </button>
  );
}
