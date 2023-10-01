import type { Signal } from './types.js';
import { isSignal } from './isSignal.js';

/**
 * If the parameter is a signal, call .value, otherwise return the parameter.
 *
 * Use this with Props<T>.
 * @param value
 * @returns
 */
export function valueOf<T>(value: T | Signal<T>): T {
    return isSignal(value) ? value.value : value;
}
