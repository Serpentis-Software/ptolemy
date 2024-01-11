import { type ComponentInit, type Signal } from '@captainpants/sweeter-core';
import { type ValidationListener } from '../types.js';
import { ValidationContainerContext } from '../context/ValidationContainerContext.js';

export function ValidationListenerHook(
    init: ComponentInit,
    listener: ValidationListener,
    valid: Signal<boolean>,
): void {
    const { register, unregister, validityChanged } = init.getContext(
        ValidationContainerContext,
    );

    let wasValid: boolean | null = null;

    init.onMount(() => {
        register(listener);

        return () => unregister(listener);
    });

    init.subscribeToChanges(
        [valid],
        ([valid]) => {
            // If this is a new control OR the valid value changed
            if (wasValid === null || wasValid !== valid) {
                validityChanged(listener, valid);
            }
            wasValid = valid;
        },
        true,
    );
}
