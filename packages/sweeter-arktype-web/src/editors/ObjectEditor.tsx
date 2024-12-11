import {
    $calc,
    $if,
    $lastGood,
    $mutable,
    $peek,
    $val,
    LocalizerHook,
    type ComponentInit,
} from '@captainpants/sweeter-core';
import { EditorSizesContext } from '../context/EditorSizesContext.js';
import {
    type ContextualValueCalculationContext,
    cast,
    categorizeProperties,
    StandardLocalValues,
    type UnknownPropertyModel,
    type UnknownModel,
    validate,
    asObject,
    type UnknownObjectModel,
    createDefault,
    UnknownType,
    introspect,
} from '@captainpants/arktype-modeling';
import { AmbientValuesContext } from '../context/AmbientValuesContext.js';
import { DraftHook } from '../hooks/DraftHook.js';
import { type EditorProps } from '../types.js';
import { GlobalCssClass, stylesheet } from '@captainpants/sweeter-web';
import { KnownPropertyEditorPart } from './KnownPropertyEditorPart.js';
import { Row, Column, Label, Box } from '@captainpants/sweeter-gummybear';
import { assertNotNullOrUndefined } from '@captainpants/sweeter-utilities';
import { IconProviderContext } from '../icons/context/IconProviderContext.js';
import { IconButton } from '../components/IconButton.js';
import { MapElementEditorPart } from './MapElementEditorPart.js';
import { ObjectEditorRenameMappedModal } from './ObjectEditorRenameMappedModal.js';
import { ObjectEditorAddMappedModal } from './ObjectEditorAddMappedModal.js';

export function ObjectEditor(
    { model, replace, local, idPath, indent, isRoot }: Readonly<EditorProps>,
    init: ComponentInit,
): JSX.Element {
    const typedModel = $lastGood(() => {
        return cast($val(model), asObject);
    });

    const ambient = init.getContext(AmbientValuesContext);
    const { indentWidth } = init.getContext(EditorSizesContext);
    const childIndent = $calc(() => $val(indent) + 1);

    const idGenerator = init.idGenerator;

    const { draft } = init.hook(
        DraftHook<UnknownObjectModel, UnknownObjectModel>,
        {
            model: typedModel,
            convertIn: (model) => model,
            convertOut: (draft) => {
                return {
                    success: true,
                    result: draft,
                };
            },
            onValid: async (validated) => {
                await $peek(replace)(validated);
            },
            validate: async (converted) => {
                const res = await validate(
                    typedModel.peek().type,
                    converted.value,
                );
                return res.success ? null : res.error;
            },
        },
    );

    const updatePropertyValue = async (
        property: string | symbol,
        value: UnknownModel,
    ): Promise<void> => {
        const newDraft = await draft
            .peek()
            .unknownSetProperty(property, value);

        draft.value = newDraft;
    };

    const onAdd = async (name: string, type: UnknownType) => {
        const propertyModel = createDefault(type);

        const newDraft = await draft
            .peek()
            .unknownSetProperty(name, propertyModel);

        draft.value = newDraft;
    };

    const onMoveProperty = async (from: string, to: string) => {
        const newDraft = await draft.peek().moveProperty(from, to, true);

        draft.value = newDraft;
    };

    const remove = async (name: string | symbol): Promise<void> => {
        const copy = await draft.peek().deleteProperty(name);

        draft.value = copy;
    };

    const renameKey = $mutable<string | null>(null);

    const startRename = (name: string) => {
        renameKey.value = name;
    };

    const calculationContext: ContextualValueCalculationContext = {
        ambient,
        local,
    };

    const owner = $calc(() => draft.value.value);

    const type = $calc(() => draft.value.type);

    const { Child } = init.getContext(IconProviderContext);

    const { localize } = init.hook(LocalizerHook);

    const catchallAllowedTypes = $calc(() => {
        const catchallType = draft.value.unknownGetCatchallType();

        if (!catchallType) {
            return undefined;
        }
        const options = introspect.tryGetUnionTypeInfo(catchallType)?.branches;
        if (options) {
            return options;
        } else {
            return [catchallType];
        }
    });

    const fixedContent = $calc(() => {
        // AVOID SUBSCRIBING TO SIGNALS AT ROOT
        // As it will rebuild the structure completely, and you will lose element focus/selection etc.
        // We necessarily subscribe to the type signal, as we use its structure to build the editor structure.

        const categorizedProperties = categorizeProperties(
            // SIGNAL HERE
            type.value,
            (property) => {
                const id = idGenerator.next(String(property.name));

                return {
                    property,
                    id,
                };
            },
        );

        const anyCategories = categorizedProperties.length > 0;

        const content = categorizedProperties.map(
            ({ category, properties }, categoryIndex) => {
                const propertyVisiblePerProperty = $calc(() => {
                    const individualVisibility = properties.map(
                        ({ property }) => {
                            const propertyModel =
                                draft.value.unknownGetProperty(property.name);
                            assertNotNullOrUndefined(propertyModel);

                            return (
                                propertyModel.valueModel.type
                                    .annotations()
                                    ?.getAssociatedValue(
                                        StandardLocalValues.Visible,
                                        owner,
                                        calculationContext,
                                    ) !== false
                            ); // likely values are notFound and false
                        },
                    );

                    return individualVisibility;
                });

                const anyVisibleInCategory = $calc(() =>
                    propertyVisiblePerProperty.value.some((x) => x),
                );

                // If no properties in the category are visible the whole category should be hidden
                return $if(anyVisibleInCategory, () => (
                    <div class={css.category} key={`cat-${categoryIndex}`}>
                        {anyCategories ? (
                            <Row>
                                <Column xl="auto">
                                    <Label
                                        style={{
                                            'font-weight': 'bold',
                                        }}
                                        class={css.categoryHeader}
                                        fillWidth
                                    >
                                        {category}
                                    </Label>
                                </Column>
                            </Row>
                        ) : undefined}
                        {/* Note that properties is based on the definition and not the model,
                            so will not be re-calculated when the model is updated. */}
                        {properties.map(({ property, id }, index) => {
                            return $if(
                                $calc(
                                    () =>
                                        propertyVisiblePerProperty.value[
                                            index
                                        ] ?? true,
                                ),
                                () => (
                                    <Row
                                        class={css.property}
                                        key={`prop-${String(property.name)}`}
                                    >
                                        <Column xs={4}>
                                            <Label for={id}>
                                                {property.propertyType
                                                    .annotations()
                                                    ?.displayName() ??
                                                    String(property.name)}
                                            </Label>
                                        </Column>
                                        <Column xs={8}>
                                            <KnownPropertyEditorPart
                                                owner={draft}
                                                id={id}
                                                property={property.name}
                                                value={$calc(
                                                    // NOTE: this depends on draft.value, so if that value changes it will get a new PropertyModel
                                                    // No other signals are referenced
                                                    () =>
                                                        draft.value.unknownGetProperty(
                                                            property.name,
                                                        )?.valueModel!,
                                                )}
                                                updateValue={
                                                    updatePropertyValue
                                                }
                                                indent={childIndent}
                                                ownerIdPath={idPath}
                                            />
                                        </Column>
                                    </Row>
                                ),
                            );
                        })}
                    </div>
                ));
            },
        );

        return content;
    });

    // TODO: this is subscribing to draft.value, which means that any changes will cause it to be rebuilt
    // this should come through $mapByIdentity (ideally).
    const mappedContent = $calc(() => {
        const entries = draft.value.unknownGetProperties();

        // TODO: rename button, column sizes
        const mappedProperties = entries.map((property) => ({
            property: property,
            render: () => {
                const name = property.name;
                const id = idGenerator.next(String(name));

                return (
                    <div>
                        <div class={css.propertyName}>
                            <Label for={id}>{String(name)}</Label>
                            {typeof name !== 'symbol' && (
                                <IconButton
                                    icon="Edit"
                                    onLeftClick={() => startRename(name)}
                                />
                            )}
                        </div>
                        <div>
                            <MapElementEditorPart
                                id={idGenerator.next(String(name))}
                                property={name}
                                value={property.valueModel}
                                updateElement={updatePropertyValue}
                                indent={childIndent}
                                ownerIdPath={idPath}
                            />
                        </div>
                        <div class={css.deleteButtonRow}>
                            <IconButton
                                icon="Delete"
                                hoverable
                                onLeftClick={() => {
                                    void remove(name);
                                }}
                            />
                        </div>
                    </div>
                );
            },
        }));

        return mappedProperties.map(({ render }) => (
            <div class={css.property}>{render()}</div>
        ));
    });

    const content = <>
        {$calc(() => {
            if (renameKey.value) {
                const visible = $mutable(true);

                // Note that a self to self doesn't do a
                // validate but does trigger onFinished
                const validate = async (to: string) => {
                    const property = draft.value.unknownGetProperty(to);
                    if (property !== undefined) {
                        return 'Property is already defined';
                    }

                    return null;
                };

                return (
                    <ObjectEditorRenameMappedModal
                        from={renameKey.value}
                        isOpen={visible}
                        validate={(_from, to) => validate(to)}
                        onCancelled={() => {
                            renameKey.value = null;
                        }}
                        onFinished={async (from, to) => {
                            await onMoveProperty(from, to);
                            renameKey.value = null;
                        }}
                    />
                );
            }
            return null;
        })}
        {$if(
            $calc(() => !$val(isRoot)),
            () => (
                <div
                    class={css.editorIndent}
                    style={{ width: indentWidth }}
                >
                    <Child />
                </div>
            ),
        )}
        <div>
            <div class={css.editorContainer}>
                {fixedContent}
            </div>
            <div class={css.editorContainer}>
                {mappedContent}
            </div>
            <div>
                {$calc(() => {
                    const catchallAllowedTypesResolved =
                        catchallAllowedTypes.value;
                    if (!catchallAllowedTypesResolved) {
                        return <></>;
                    }

                    return catchallAllowedTypesResolved.map(
                        (allowedType, index) => {
                            const title =
                                catchallAllowedTypesResolved.length ===
                                1
                                    ? localize('Add')
                                    : localize('Add {0}', [
                                            allowedType
                                                .annotations()
                                                ?.getBestDisplayName(),
                                        ]);

                            const isOpen = $mutable(false);

                            const validate = async (name: string) => {
                                const property =
                                    draft.value.unknownGetProperty(
                                        name,
                                    );
                                if (property !== undefined) {
                                    return 'Property is already defined';
                                }

                                return null;
                            };

                            return (
                                <>
                                    <ObjectEditorAddMappedModal
                                        isOpen={isOpen}
                                        type={allowedType}
                                        validate={validate}
                                        onCancelled={() =>
                                            (isOpen.value = false)
                                        }
                                        onFinished={onAdd}
                                    />
                                    <IconButton
                                        icon="Add"
                                        text={title}
                                        onLeftClick={() => {
                                            isOpen.value = true;
                                        }}
                                    />
                                </>
                            );
                        },
                    );
                })}
            </div>
        </div>
    </>

    return (
        <Box level={indent} class={css.editorOuter}>
            <div class={css.editorIndentContainer}>
                {content}
            </div>
        </Box>
    );
}

const css = {
    editorOuter: new GlobalCssClass({
        className: 'RigidObjectEditor-EditorOuter',
        content: stylesheet`
            display: flex;
            flex-direction: column;
            margin: 10px 0 10px 0;
        `,
    }),
    editorIndentContainer: new GlobalCssClass({
        className: 'RigidObjectEditor-EditorIndentContainer',
        content: stylesheet`
            display: flex;
            flex-direction: row;
        `,
    }),
    editorIndent: new GlobalCssClass({
        className: 'RigidObjectEditor-EditorIndent',
        content: stylesheet`
            padding-top: 14px;
            padding-left: 8px;
            svg: {
                opacity: 0.25;
            }
        `,
    }),
    editorContainer: new GlobalCssClass({
        className: 'RigidObjectEditor-EditorContainer',
        content: stylesheet`
            flex: 1;
        `,
    }),
    categoryHeader: new GlobalCssClass({
        className: 'RigidObjectEditor-CategoryHeader',
        content: stylesheet` 
            font-weight: 'bold';
            line-height: 2;
        `,
    }),
    category: new GlobalCssClass({ className: 'category' }),
    property: new GlobalCssClass({ className: 'property' }),
    propertyName: new GlobalCssClass({
        className: 'MapObjectEditor-PropertyName',
        content: stylesheet`
            display: flex;
            flex-direction: row;
            align-items: center;
        `,
    }),
    deleteButtonRow: new GlobalCssClass({
        className: 'MapObjectEditor-DeleteButtonRow',
        content: stylesheet`
             display: flex;
             flex-direction: row-reverse;
        `,
    })
};
