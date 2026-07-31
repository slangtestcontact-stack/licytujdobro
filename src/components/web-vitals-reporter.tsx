"use client";

import { useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

const SUPPORTED_METRICS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export function WebVitalsReporter() {
  const sentIds = useRef(new Set<string>());

  useReportWebVitals((metric) => {
    if (
      !SUPPORTED_METRICS.has(metric.name) ||
      !Number.isFinite(metric.value) ||
      metric.value < 0 ||
      sentIds.current.has(metric.id)
    ) {
      return;
    }

    sentIds.current.add(metric.id);

    const payload = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/metrics/web-vitals",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }

    void fetch("/api/metrics/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  });

  return null;
}
