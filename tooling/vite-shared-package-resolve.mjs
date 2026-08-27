import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * Resolve peer dependencies used by source files in /packages from the
 * consuming application. The independent apps currently retain their own
 * lockfiles while the repository moves toward one root lockfile, so normal
 * Node resolution starting in packages/ui cannot see app-local node_modules.
 */
export const sharedPackageResolve = appConfigUrl => {
  const appDirectory = path.dirname(fileURLToPath(appConfigUrl));
  const requireFromApp = createRequire(path.join(appDirectory, 'package.json'));
  const resolve = specifier => requireFromApp.resolve(specifier);

  return {
    alias: [
      { find: /^react$/, replacement: resolve('react') },
      { find: /^react\/jsx-runtime$/, replacement: resolve('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: resolve('react/jsx-dev-runtime') },
      { find: /^react-dom$/, replacement: resolve('react-dom') },
      { find: /^react-dom\/client$/, replacement: resolve('react-dom/client') },
      { find: /^react-router-dom-v6$/, replacement: resolve('react-router-dom-v6') },
      { find: /^gsap$/, replacement: resolve('gsap') },
    ],
    dedupe: ['react', 'react-dom'],
  };
};
