import { AsyncLocalStorage } from 'node:async_hooks';
const requestAuthStorage = new AsyncLocalStorage();
export function withKalendrioRequestAuth(auth, fn) {
    return requestAuthStorage.run(auth, fn);
}
export function getKalendrioRequestAuth() {
    return requestAuthStorage.getStore();
}
