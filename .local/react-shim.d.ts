declare namespace React {
  type ReactNode = any;
  interface FormEvent<T = Element> { preventDefault(): void; currentTarget: T; target: EventTarget & T; }
  interface ChangeEvent<T = Element> { target: EventTarget & T; currentTarget: EventTarget & T; }
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
}

declare module 'react' {
  export = React;
  export as namespace React;
  export default React;
  export type ReactNode = React.ReactNode;
  export type FormEvent<T = Element> = React.FormEvent<T>;
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
  export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, React.Dispatch<React.SetStateAction<S | undefined>>];
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T = undefined>(): { current: T | undefined };
  export function useDeferredValue<T>(value: T): T;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export interface Context<T> { Provider: any; }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function lazy<T>(factory: () => Promise<{ default: T }>): T;
  export const Suspense: any;
  export const StrictMode: any;
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module 'react-dom/client' {
  const ReactDOM: { createRoot(element: Element): { render(node: any): void } };
  export default ReactDOM;
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const Navigate: any;
  export const NavLink: any;
  export const Link: any;
  export const Route: any;
  export const Routes: any;
  export function useNavigate(): (to: string, options?: any) => void;
  export function useLocation(): { pathname: string };
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
}

declare namespace JSX {
  interface IntrinsicAttributes { key?: any; }
  interface IntrinsicElements { [elemName: string]: any; }
}
