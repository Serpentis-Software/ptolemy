import {
    type AmbientValueCallback,
    notFound,
} from '@serpentis/ptolemy-arktype-modeling';
import {
    $derived,
    $insertLocation,
    $val,
    type ComponentInit,
    type PropertiesMightBeSignals,
} from '@serpentis/ptolemy-core';

import { AmbientValuesContext } from '../context/AmbientValuesContext.js';

export type AmbientValuesProps = PropertiesMightBeSignals<{
    callback: AmbientValueCallback | undefined;
    children?: () => JSX.Element;
}>;

export function AmbientValues(
    { callback: newCallback, children }: AmbientValuesProps,
    init: ComponentInit,
): JSX.Element {
    const existingContext = init.getContext(AmbientValuesContext);

    const ambientValueCallback = $derived<AmbientValueCallback>(() => {
        const newCallbackResolved = $val(newCallback);
        const existingContextResolved = $val(existingContext);

        // Shortcut for the 'do nothing' flow variation
        if (!newCallbackResolved) {
            return existingContextResolved;
        }

        return {
            get: (name: string): unknown => {
                const result = newCallbackResolved.get(name);

                if (result !== notFound) {
                    return result;
                }

                return existingContextResolved.get(name);
            },
            parent: $val(existingContext).get,
        };
    });

    return AmbientValuesContext.invokeWith(
        ambientValueCallback,
        $insertLocation(),
        () => {
            // $derived is here is partly to capture the execution context (which includes the AmbientValuesContext)
            return $derived(() => {
                return $val(children)?.();
            });
        },
    );
}
