import { SignalBase } from './SignalBase.js';
import { announceMutatingSignal, announceSignalUsage } from '../../ambient.js';
import { writableSignalMarker } from '../markers.js';
import { type ReadWriteSignal } from '../../types.js';
import { SignalState } from '../../SignalState.js';

export class MutableValueSignal<T>
    extends SignalBase<T>
    implements ReadWriteSignal<T>
{
    constructor(initialValue: T) {
        super(SignalState.success(initialValue));
    }

    readonly [writableSignalMarker] = true;

    override get value(): T {
        // Weirdly, if you don't override the getter as well you end up with an undefined result
        // so this just duplicates the code in SignalBase.value
        announceSignalUsage(this);
        return this.peek();
    }

    override set value(value: T) {
        announceMutatingSignal(this);
        super._updateAndAnnounce(SignalState.success(value));
    }

    update(value: T): void {
        this.value = value;
    }
}
