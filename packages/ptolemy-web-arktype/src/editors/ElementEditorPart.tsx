import { type UnknownModel } from '@serpentis/ptolemy-arktype-modeling';
import {
    $derived,
    $peek,
    $val,
    type ComponentInit,
    LocalizerHook,
    type PropertiesMightBeSignals,
} from '@serpentis/ptolemy-core';
import { idPaths } from '@serpentis/ptolemy-utilities';

import { EditorHost } from '../components/EditorHost.js';

export type ElementEditorPartProps = PropertiesMightBeSignals<{
    index: number;
    elementModel: UnknownModel;
    updateElement: (index: number, value: UnknownModel) => Promise<void>;

    indent: number;
    ownerIdPath: string | undefined;
}>;

export function ElementEditorPart(
    props: ElementEditorPartProps,
    init: ComponentInit,
): JSX.Element;
export function ElementEditorPart(
    {
        index,
        elementModel,
        updateElement,
        indent,
        ownerIdPath,
    }: ElementEditorPartProps,
    init: ComponentInit,
): JSX.Element {
    const replace = async (value: UnknownModel) => {
        await $peek(updateElement)($peek(index), value);
    };

    const { localize } = init.hook(LocalizerHook);

    return (
        <EditorHost
            model={elementModel}
            replace={replace}
            propertyDisplayName={$derived(() =>
                localize('Element {0}', [$val(index) + 1]),
            )}
            indent={indent}
            idPath={$derived(() =>
                idPaths.index($val(ownerIdPath), $val(index)),
            )}
        />
    );
}
