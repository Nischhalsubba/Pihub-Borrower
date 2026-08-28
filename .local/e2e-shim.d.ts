declare module '@playwright/test' {
  export const expect: any;
  export const test: any;
  export const devices: any;
  export function defineConfig(config: any): any;
}
declare module '@axe-core/playwright' {
  const AxeBuilder: any;
  export default AxeBuilder;
}
declare const Buffer: { from(value: string): any };
