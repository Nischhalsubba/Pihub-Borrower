import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export function ProductRouteMotion({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return undefined;

    const media = gsap.matchMedia();

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const stage = element.querySelector<HTMLElement>('.route-stage') ?? element;
        const blocks = Array.from(stage.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
        const surfaces = Array.from(stage.querySelectorAll<HTMLElement>('[data-motion="surface"]'));
        if (!blocks.length) return;

        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        timeline.fromTo(
          blocks,
          { y: 12, willChange: 'transform' },
          {
            y: 0,
            duration: 0.42,
            stagger: 0.035,
            overwrite: 'auto',
            clearProps: 'transform,willChange',
          },
        );

        if (surfaces.length) {
          timeline.fromTo(
            surfaces,
            { scale: 0.995, willChange: 'transform' },
            {
              scale: 1,
              duration: 0.3,
              stagger: 0.025,
              overwrite: 'auto',
              clearProps: 'transform,willChange',
            },
            0.08,
          );
        }
      }, element);

      return () => context.revert();
    });

    media.add('(prefers-reduced-motion: reduce)', () => {
      const targets = element.querySelectorAll<HTMLElement>('.route-stage > *, [data-motion="surface"]');
      gsap.set(targets, { clearProps: 'transform,willChange' });
    });

    return () => media.revert();
  }, [routeKey]);

  return <div className="pihub-route-motion" ref={root} data-route-motion={routeKey}>{children}</div>;
}
