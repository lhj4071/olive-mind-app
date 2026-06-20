import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-theme="dawn" className="om-dawn-bg">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Dawn theme: token overrides + component moods (src/styles/olive-mind-dawn-theme.css) */}
        <style dangerouslySetInnerHTML={{ __html: dawnTheme }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const dawnTheme = `
/* ── Dawn base background ── */
html, body {
  background: linear-gradient(178deg, #F6EAD8 0%, #EFE0CC 52%, #E9DCC8 100%);
  background-attachment: fixed;
  min-height: 100%;
}

/* ── Token overrides ── */
[data-theme="dawn"] {
  --om-bg:            #F4E8D6;
  --om-card:          rgba(255,255,255,0.55);
  --om-card-raised:   rgba(255,255,255,0.66);
  --om-olive:         #637746;
  --om-olive-dark:    #45582F;
  --om-olive-faded:   rgba(99,119,70,0.15);
  --om-text:          #34372C;
  --om-text-muted:    #84826E;
  --om-dim:           #ABA897;
  --om-border:        #E7DDCB;
  --om-white:         #FFFFFF;
  --om-phq9:          #5C7C97;
  --om-gad7:          #B07F4E;
  --om-danger:        #BF6B6B;
  --om-accent:        #7A6FA8;
  --om-shadow-sm:     0 4px 16px rgba(82,70,38,0.06);
  --om-shadow-md:     0 8px 24px rgba(82,70,38,0.08);
  --om-shadow-lg:     0 14px 40px rgba(82,70,38,0.12);
}

/* ── Screen background ── */
.om-dawn-bg,
[data-theme="dawn"] .om-screen {
  background: linear-gradient(178deg, #F6EAD8 0%, #EFE0CC 52%, #E9DCC8 100%);
  background-attachment: fixed;
}

/* ── Cards → frosted glass ── */
[data-theme="dawn"] .om-card,
[data-theme="dawn"] .om-card-raised,
[data-theme="dawn"] .om-assess-card {
  background: rgba(255,255,255,0.55);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255,255,255,0.62);
  box-shadow: var(--om-shadow-md);
}

/* ── Tab bar → frosted glass ── */
[data-theme="dawn"] .om-tab-bar {
  background: rgba(255,255,255,0.60);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  border-top: 1px solid rgba(255,255,255,0.5);
}
[data-theme="dawn"] .om-tab-item        { color: #A7A48F; }
[data-theme="dawn"] .om-tab-item.active { color: var(--om-olive); }

/* ── Progress / slider tracks ── */
[data-theme="dawn"] .om-progress-track { background: rgba(99,119,70,0.16); }
[data-theme="dawn"] .om-slider-track   { background: rgba(58,64,46,0.10); }
[data-theme="dawn"] .om-slider-thumb   { background: #fff; box-shadow: var(--om-shadow-sm); }

/* ── Emotion tags → glass chips ── */
[data-theme="dawn"] .om-emotion-tag {
  background: rgba(255,255,255,0.45);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-color: rgba(255,255,255,0.6);
  color: var(--om-text-muted);
}
[data-theme="dawn"] .om-emotion-tag.selected {
  background: var(--om-olive-faded);
  color: var(--om-olive-dark);
  border-color: var(--om-olive);
}

[data-theme="dawn"] .om-section-label { color: var(--om-text-muted); }

[data-theme="dawn"] .om-btn-primary {
  box-shadow: 0 10px 24px rgba(80,100,50,0.28), inset 0 1px 0 rgba(255,255,255,0.28);
}

@media (prefers-reduced-motion: reduce) {
  .om-blob, .om-orb-ring { animation: none !important; }
}
`;
