import { SignalBase } from './SignalBase';
import { SignalState } from './SignalState';
import { callAndReturnDependencies } from './ambient';
import { Signal } from './types';

function wrap<T>(callback: () => T): () => SignalState<T> {
    return () => {
        try {
            const result = callback();
            return { mode: 'SUCCESS', value: result };
        } catch (ex) {
            return { mode: 'ERROR', error: ex };
        }
    };
}

export class CalculatedSignal<T> extends SignalBase<T> {
    constructor(calculation: () => T) {
        const wrapped = wrap(calculation);

        const { result: initialValue, dependencies } =
            callAndReturnDependencies(wrapped, true);

        super(initialValue);

        this.#calculation = wrapped;
        this.#dependencies = dependencies;

        this.#attach();
    }

    #calculation: () => SignalState<T>;
    #dependencies: Set<Signal<unknown>>;

    /**
     * Bound as its used as its passed to .listen calls.
     */
    #dependencyListener = () => {
        this.#recalculate();
    };

    #recalculate() {
        const { result, dependencies: nextDependencies } =
            callAndReturnDependencies(this.#calculation, true);

        this.#detachExcept(nextDependencies);
        this.#attach();

        this.#dependencies = nextDependencies;

        this._set(result);
    }

    #attach() {
        for (const dep of this.#dependencies) {
            dep.listen(this.#dependencyListener);
        }
    }

    #detachExcept(set: Set<Signal<unknown>>) {
        for (const dep of this.#dependencies) {
            if (!set.has(dep)) {
                dep.unlisten(this.#dependencyListener);
            }
        }
    }
}

export function calc<T>(calculation: () => T): CalculatedSignal<T> {
    return new CalculatedSignal(calculation);
}
