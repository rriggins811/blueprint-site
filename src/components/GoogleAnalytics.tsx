"use client";

// GA4 base + page-view tracking. Reads NEXT_PUBLIC_GA_ID from env so the
// 3 sites (rss-site, blueprint-site, seniorsafe-site) can use a unified
// or per-domain measurement ID without code changes.

import Script from "next/script";

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
    </>
  );
}
