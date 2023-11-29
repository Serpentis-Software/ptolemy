import type {
    ComponentInit,
    MightBeSignal,
    PropertiesMightBeSignals,
} from '../types.js';
import { $calc, $mutable, $val, type Signal } from '../signals/index.js';
import { SuspenseContext } from './SuspenseContext.js';
import { getRuntime } from '../index.js';

export type AsyncProps<T> = PropertiesMightBeSignals<{
    loadData: (abort: AbortSignal) => Promise<T>;
    children: (data: Signal<T>) => JSX.Element;
}>;

export function Async<T>(
    props: AsyncProps<T>,
    init: ComponentInit,
): JSX.Element;
export function Async<T>(
    { loadData: callback, children }: AsyncProps<T>,
    init: ComponentInit,
): JSX.Element {
    const suspenseContext = SuspenseContext.getCurrent();

    const data = $mutable<
        | { resolution: 'LOADING' }
        | { resolution: 'SUCCESS'; result: T }
        | { resolution: 'ERROR'; error: unknown }
    >({
        resolution: 'LOADING',
    });

    const resolution = $calc(() => data.value.resolution); // So that our result $calc can subscribe to just the resolution type, not the value/error

    const latestResult: Signal<T> = $calc<T>(() => {
        if (data.value.resolution === 'SUCCESS') {
            return data.value.result;
        } else if (data.value.resolution === 'ERROR') {
            throw data.value.error;
        } else if (!latestResult.inited) {
            throw new TypeError(
                'Incorrectly using the value Signal in Async before it has a result.',
            );
        } else {
            // Keep most recent value
            return latestResult.peek();
        }
    });

    async function reload(
        callback: (abort: AbortSignal) => Promise<T>,
        signal: AbortSignal,
    ) {
        // Consider this step might need to be optional
        if (data.value.resolution !== 'LOADING') {
            data.value = { resolution: 'LOADING' };
        }

        const revertSuspenseBlock = suspenseContext.startBlocking();
        signal.addEventListener('abort', function abortCallback() {
            revertSuspenseBlock();
        });

        try {
            const result = await callback(signal);

            if (signal.aborted) {
                return; // don't store result if aborted
            }

            data.value = { resolution: 'SUCCESS', result };
        } catch (ex) {
            if (signal.aborted) {
                return; // don't store result if aborted
            }

            data.value = { resolution: 'ERROR', error: ex };
        } finally {
            revertSuspenseBlock();
        }
    }

    init.subscribeToChanges(
        [callback],
        function Async_subscribeToChanges([callback]) {
            const abortController = new AbortController();
            reload(callback, abortController.signal);

            return () => {
                abortController.abort();
            };
        },
        true,
    );

    return $calc(() => {
        if (resolution.value === 'LOADING') {
            // Suspense should be showing
            return undefined;
        } else {
            return $val(children)(latestResult);
        }
    });
}

export function $async<T>(
    loadData: MightBeSignal<(abort: AbortSignal) => Promise<T>>,
    render: MightBeSignal<(data: Signal<T>) => JSX.Element>,
) {
    return getRuntime().jsx(Async<T>, { loadData, children: render });
}
