"use client";

import { useIntunePolicies, useLoadingState } from "~/hooks/useIntuneData";
import { useIntuneFeatures } from "~/hooks/useIntuneFeatures";
import { LoadingCard } from "~/components/ui/loading-card";
import { ExportPreview } from "~/components/export/export-preview";

export default function ExportPage() {
  const { data: policies, isLoading: policiesLoading, error: policiesError } = useIntunePolicies();
  const { data: features, isLoading: featuresLoading, error: featuresError } = useIntuneFeatures();
  const loadingState = useLoadingState();

  // Only block UI on policies loading — features loads in background for PDF
  if (policiesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Report</h1>
          <p className="text-muted-foreground mt-1">
            Loading policies to generate your report&hellip;
          </p>
        </div>
        <LoadingCard
          stage={loadingState.stage}
          progress={loadingState.progress}
          details={loadingState.details}
        />
      </div>
    );
  }

  if (policiesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Report</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to load policies: {policiesError.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Report</h1>
        <p className="text-muted-foreground mt-1">
          Generate an HTML or PDF report of all your Intune assignments and features.
        </p>
      </div>
      <ExportPreview
        policies={policies ?? []}
        features={featuresError ? null : (features ?? null)}
        featuresLoading={featuresLoading}
      />
    </div>
  );
}
