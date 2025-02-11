import {
    type ContextSnapshot,
    subscribeToChanges,
} from '@serpentis/ptolemy-core';
import { arrayExcept } from '@serpentis/ptolemy-utilities';

import { type ElementCssClasses } from '../../IntrinsicAttributes.js';
import { addMountedCallback } from '../../runtime/internal/mounting.js';
import { type WebRuntime } from '../../runtime/types.js';
import { createCssClassSignal } from '../../styles/createCssClassSignal.js';
import { GlobalCssClass } from '../../styles/GlobalCssClass.js';

export function bindDOMClassProp(
    contextSnapshot: ContextSnapshot,
    ele: HTMLElement | SVGElement,
    class_: ElementCssClasses,
    webRuntime: WebRuntime,
) {
    const classSignal = createCssClassSignal(class_);

    let previousReferencedClasses: GlobalCssClass[] | undefined;

    addMountedCallback(contextSnapshot, ele, () => {
        const unsubscribe = subscribeToChanges(
            [classSignal],
            ([thisTime]) => {
                const thisTimeReferencedClasses = thisTime.filter(
                    (x): x is GlobalCssClass => x instanceof GlobalCssClass,
                );

                // If there was previous results we need to work out what items were added/removed
                if (previousReferencedClasses) {
                    const added = arrayExcept(
                        thisTimeReferencedClasses,
                        previousReferencedClasses,
                    );
                    const removed = arrayExcept(
                        previousReferencedClasses,
                        thisTimeReferencedClasses,
                    );

                    for (const addedItem of added) {
                        webRuntime.addStylesheet(addedItem);
                    }
                    for (const removedItem of removed) {
                        webRuntime.removeStylesheet(removedItem);
                    }
                }
                // there was no previous result, so we add them all (and skip any diffing)
                else {
                    for (const addedItem of thisTimeReferencedClasses) {
                        webRuntime.addStylesheet(addedItem);
                    }
                }

                const className = thisTime
                    .map((x) =>
                        typeof x === 'string'
                            ? x
                            : webRuntime.getPrefixedClassName(x),
                    )
                    .join(' ');

                if (className) {
                    ele.setAttribute('class', className);
                } else {
                    ele.removeAttribute('class');
                }

                // save (for change detection)
                previousReferencedClasses = thisTimeReferencedClasses;
            },
            true,
        );

        return () => {
            unsubscribe();

            if (previousReferencedClasses) {
                for (const removedItem of previousReferencedClasses) {
                    webRuntime.removeStylesheet(removedItem);
                }

                // Note that an element can be mounted and remounted - so its important that this be updated
                previousReferencedClasses = undefined;
            }
        };
    });
}
