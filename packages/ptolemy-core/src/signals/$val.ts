import { announceSignalUsage } from './ambient.js';
import { isSignal } from './isSignal.js';
import { type Signal, type UnsignalAll } from './types.js';

/**
 * If the parameter is a signal, access the value via signal.value (and therefore subscribe), otherwise return the parameter unchanged.
 *
 * Use this with Props<T>.
 * @param value
 * @returns
 */
export function $val<T>(value: T | Signal<T>): T {
    return isSignal(value) ? value.value : value;
}

/**
 * Explicitly track a signal, ignoring what its actual value is.
 * @param value
 */
export function $subscribe<T>(value: T | Signal<T>): void {
    if (isSignal(value)) {
        announceSignalUsage(value);
    }
}
export function $peek<T>(value: T | Signal<T>): T {
    return isSignal(value) ? value.peek() : value;
}

export function $valElements<TArgs extends readonly unknown[]>(
    values: [...TArgs],
): UnsignalAll<[...TArgs]> {
    return values.map((x) => $val(x)) as UnsignalAll<[...TArgs]>;
}

export function $valProperties<TObj extends Readonly<Record<string, unknown>>>(
    source: TObj,
): UnsignalAll<TObj> {
    const result = {} as Record<string, unknown>;

    for (const key of Object.keys(source)) {
        result[key] = $val(source[key]);
    }

    return result as UnsignalAll<TObj>;
}
