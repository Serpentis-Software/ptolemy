import {
    asUnion,
    cast,
    createDefault,
    findUnionOptionIndexForValue,
    introspect,
    ModelFactory,
    type UnknownModel,
    UnknownType,
} from '@serpentis/ptolemy-arktype-modeling';
import { $derived, $if, $lastGood, $peek, $val } from '@serpentis/ptolemy-core';
import { idPaths } from '@serpentis/ptolemy-utilities';
import { Select } from '@serpentis/ptolemy-web-stardust';

import { EditorHost } from '../components/EditorHost.js';
import { type EditorProps } from '../types.js';

export function UnionEditor(props: Readonly<EditorProps>): JSX.Element;
export function UnionEditor({
    model,
    replace,
    idPath,
    indent,
}: Readonly<EditorProps>): JSX.Element {
    const typedModel = $lastGood(() => cast($val(model), asUnion));

    const type = $derived(() => typedModel.value.type);

    const alternatives = $derived(() => {
        // Only depends on 'type' signal
        const options = introspect.getUnionTypeInfo(type.value).branches;

        return options.map((alternative) => {
            return {
                label: alternative.annotations()?.getBestDisplayName(),
                type: alternative,
            };
        });
    });

    const selectOptions = $derived(() => {
        // Only depends on 'alternatives' signal
        return alternatives.value.map((x, index) => ({
            text: x.label,
            value: String(index),
        }));
    });

    const changeType = async (type: UnknownType): Promise<void> => {
        const defaultValue = createDefault(type);
        const defaultModel = await ModelFactory.createModel({
            value: defaultValue,
            schema: typedModel.peek().type,
        });
        await $peek(replace)(defaultModel);
    };

    const resolved = $derived(() => typedModel.value.unknownResolve());

    const replaceResolved = async (
        newResolvedModel: UnknownModel,
    ): Promise<void> => {
        const defaultModel = await typedModel
            .peek()
            .replace(newResolvedModel, false);
        await $peek(replace)(defaultModel);
    };

    const typeIndex = $derived(() =>
        findUnionOptionIndexForValue(typedModel.value.value, type.value),
    );

    const typeValue = $derived(
        () => (typeIndex.value ?? -1).toString(),
        (value) => {
            const index = Number(value);
            const type = alternatives.peek()[index]?.type;
            if (!type) return;
            void changeType(type);
        },
    );

    return (
        <div>
            <div>
                <Select
                    id={idPath}
                    bind:value={typeValue}
                    options={selectOptions}
                />
            </div>
            {$if(
                $derived(() => !introspect.isLiteralType(resolved.value.type)),
                () => (
                    <EditorHost
                        model={resolved}
                        replace={replaceResolved}
                        indent={indent}
                        idPath={$derived(() =>
                            idPaths.union($val(idPath), typeIndex.value ?? -1),
                        )}
                    />
                ),
            )}
        </div>
    );
}
