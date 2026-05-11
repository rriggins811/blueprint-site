"use client";

// Meta Pixel base code + PageView fire. Reads NEXT_PUBLIC_META_PIXEL_ID from
// env at build time. Mount once in app/layout.tsx — single pixel covers all
// routes via the SPA navigation. fbclid → _fbc cookie capture happens on
// every landing (handled by the useEffect below, which re-runs on each route
// change in the App Router).

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureFbclidOnLanding } from "@/lib/meta/pixel";

export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();

  // Capture ?fbclid=… on first paint of every route. captureFbclidOnLanding
  // no-ops if the cookie already exists, so it's safe to call repeatedly.
  useEffect(() => {
    captureFbclidOnLanding();
  }, [pathname]);

  if (!pixelId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[MetaPixel] NEXT_PUBLIC_META_PIXEL_ID not set");
    }
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
