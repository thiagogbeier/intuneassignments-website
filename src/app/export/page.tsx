"use client";

import { useIntunePolicies, useLoadingState } from "~/hooks/useIntuneData";
import { LoadingCard } from "~/components/ui/loading-card";
import { ExportPreview } from "~/components/export/export-preview";

export default function ExportPage() {
  const { data: policies, isLoading, error } = useIntunePolicies();
  const loadingState = useLoadingState();

  if (isLoading) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Report</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to load policies: {error.message}
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
          Generate a self-contained HTML report of all your Intune assignments.
        </p>
      </div>
      <ExportPreview policies={policies ?? []} />
    </div>
  );
}
