import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function PlatformRouteMotion({ routeKey, children }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (!root.current) return undefined;
    const media = gsap.matchMedia();

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        // Keep route content fully opaque while it moves into place. Fading the
        // entire route temporarily blended text with its background and could
        // drop otherwise-compliant Investor colors below WCAG contrast ratios.
        gsap.fromTo(root.current,
          { y: 8 },
          {
            y: 0,
            duration: 0.24,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'transform',
          });
      }, root);
      return () => context.revert();
    });

    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(root.current, { clearProps: 'all' });
    });

    return () => media.revert();
  }, [routeKey]);

  return <div className="ph-route-stage" ref={root} data-route={routeKey}>{children}</div>;
}
