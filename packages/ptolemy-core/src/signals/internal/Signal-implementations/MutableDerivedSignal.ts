import { type DerivationCallback } from '../../$derived.js';
import { announceMutatingSignal, announceSignalUsage } from '../../ambient.js';
import { DerivedSignalOptions, type ReadWriteSignal } from '../../types.js';
import { PTOLEMY_IS_WRITABLE_SIGNAL } from '../markers.js';

import { DerivedSignal } from './DerivedSignal.js';

export class MutableDerivedSignal<T>
    extends DerivedSignal<T>
    implements ReadWriteSignal<T>
{
    constructor(
        calculation: DerivationCallback<T>,
        mutate: (value: T) => void,
        options?: DerivedSignalOptions,
    ) {
        super(calculation, options);

        this.#mutate = mutate;
    }

    #mutate: (value: T) => void;

    public get [PTOLEMY_IS_WRITABLE_SIGNAL]() {
        return true as const;
    }

    override get value(): T {
        // Weirdly, if you don't override the getter as well you end up with an undefined result
        // so this just duplicates the code in SignalBase.value
        announceSignalUsage(this);
        return this.peek();
    }

    override set value(value: T) {
        announceMutatingSignal(this);
        this.#mutate(value);
    }
}
