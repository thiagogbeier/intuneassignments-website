"use client";

import { useIntuneFeatures } from "~/hooks/useIntuneFeatures";
import { FeatureDetectionCard } from "~/components/features/feature-detection-card";
import { FeatureDetailSection } from "~/components/features/feature-detail-section";
import { FeaturesExportButton } from "~/components/features/features-export-button";
import { Loader2, ShieldCheck } from "lucide-react";

export default function FeaturesPage() {
  const { data, isLoading, error } = useIntuneFeatures();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Detection</h1>
          <p className="text-muted-foreground mt-1">
            Scanning your Intune tenant for configured features&hellip;
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Querying Microsoft Graph API&hellip;
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Detection</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to scan features: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const detected = data.features.filter((f) => f.status === "detected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Feature Detection
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {detected}/{data.features.length} features detected
            {data.intuneAdmins.length > 0 &&
              ` · ${data.intuneAdmins.length} Intune admin(s)`}
          </p>
        </div>
        <FeaturesExportButton data={data} />
      </div>

      <FeatureDetectionCard features={data.features} />
      <FeatureDetailSection data={data} />
    </div>
  );
}
