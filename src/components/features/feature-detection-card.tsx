"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import type { FeatureDetectionResult } from "~/types/features";

interface FeatureDetectionCardProps {
  features: FeatureDetectionResult[];
}

export function FeatureDetectionCard({ features }: FeatureDetectionCardProps) {
  const detected = features.filter((f) => f.status === "detected").length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Feature Summary</h2>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {detected}/{features.length} detected
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                f.status === "detected"
                  ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                  : "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
              }`}
            >
              {f.status === "detected" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.details}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
