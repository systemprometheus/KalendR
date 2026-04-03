import { AsyncLocalStorage } from 'node:async_hooks';

export type KalendrioRequestAuth = {
  bearerToken?: string;
  sessionCookie?: string;
};

const requestAuthStorage = new AsyncLocalStorage<KalendrioRequestAuth>();

export function withKalendrioRequestAuth<T>(auth: KalendrioRequestAuth, fn: () => Promise<T>) {
  return requestAuthStorage.run(auth, fn);
}

export function getKalendrioRequestAuth() {
  return requestAuthStorage.getStore();
}
