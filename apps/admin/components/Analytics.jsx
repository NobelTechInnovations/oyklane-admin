import Script from "next/script";
import { GA_ID, META_PIXEL_ID } from "@/lib/track";

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
// Set in Super admin ▸ Tracking: the pixel (and GA4) load from there, so
// changing them needs no new build. The Vercel variables still work.
const RUNTIME = `(function(){if(window.__oyTrack)return;window.__oyTrack=1;fetch(${JSON.stringify(API)}+"/api/public/tracking").then(function(r){return r.json()}).then(function(c){if(c.metaPixelId&&!window.fbq){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',c.metaPixelId);fbq('track','PageView');}}).catch(function(){})})();`;

/** GA4 and the Meta pixel for Oyklane's own funnel (lib/track.js): from
 * Super admin ▸ Tracking, or the Vercel variables when those are set. */
export function Analytics() {
  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`}
          </Script>
        </>
      )}
      {!META_PIXEL_ID && (
        <Script id="oy-tracking" strategy="afterInteractive">
          {RUNTIME}
        </Script>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(META_PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
