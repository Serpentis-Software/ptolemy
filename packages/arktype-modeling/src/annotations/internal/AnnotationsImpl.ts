import { descend } from '@captainpants/sweeter-utilities';

import {
    type Annotations,
    type AnyTypeConstraint,
    type ContextualValueCalculationCallback,
    type ContextualValueCalculationContext,
    isModel,
    serializeSchemaForDisplay,
} from '../../index.js';
import { shallowMatchesStructure } from '../../utility/validate.js';
import { safeParse } from '../../utility/parse.js';
import { type type } from 'arktype';
import { AnnotationsBuilderImpl } from './AnnotationBuilderImpl.js';
import { schemas } from './schemas.js';

export class AnnotationsImpl<TSchema extends AnyTypeConstraint>
    implements Annotations
{
    constructor(
        schema: TSchema,
        attributes: Map<string, unknown> | undefined,
        labels: Set<string> | undefined,
        associatedValues:
            | Map<string, ContextualValueCalculationCallback>
            | undefined,
        ambientValues:
            | Map<string, ContextualValueCalculationCallback>
            | undefined,
    ) {
        this.#schema = schema;
        this.#attributes = attributes;
        this.#labels = labels;
        this.#associatedValues = associatedValues;
        this.#ambientValues = ambientValues;
    }

    #schema: TSchema;
    #attributes: Map<string, unknown> | undefined;
    #labels: Set<string> | undefined;
    #associatedValues:
        | Map<string, ContextualValueCalculationCallback>
        | undefined;
    #ambientValues: Map<string, ContextualValueCalculationCallback> | undefined;

    public attr(name: string, fallback: unknown): unknown {
        if (!this.#attributes) return fallback;
        if (!this.#attributes.has(name)) return fallback;

        return this.#attributes.get(name);
    }

    public getAttrValidated<TValueArkType extends AnyTypeConstraint>(
        name: string,
        valueSchema: TValueArkType,
        fallback: type.infer<TValueArkType>,
    ): type.infer<TValueArkType> {
        if (!this.#attributes) return fallback;
        if (!this.#attributes.has(name)) return fallback;

        const value = this.#attributes.get(name);

        const parsed = safeParse(value, valueSchema);
        if (parsed.success) return parsed.data;
        return fallback;
    }

    public label(name: string, val: boolean = true): this {
        const set = this.#labels ?? (this.#labels = new Set());

        if (val) {
            set.add(name);
        } else {
            set.delete(name);
        }
        return this;
    }

    public hasLabel(name: string): boolean {
        if (!this.#labels) return false;

        return this.#labels.has(name);
    }

    public category(): string | null;
    public category(): string | null {
        const res = this.attr('property:category', undefined);
        const parsed = safeParse(res, schemas.propertyCategory);
        if (parsed.success) {
            return parsed.data;
        }
        return null;
    }

    public displayName(): string | null {
        const res = this.attr('displayName', undefined);
        const parsed = safeParse(res, schemas.displayName);
        if (parsed.success) {
            return parsed.data;
        }
        return null;
    }
    public getBestDisplayName(): string {
        const displayName = this.displayName();
        if (displayName) return displayName;
        return serializeSchemaForDisplay(this.#schema);
    }

    public visible(): boolean {
        return this.getAttrValidated(
            'property:visible',
            schemas.propertyVisible,
            true,
        );
    }

    #getAssociatedValueTyped(
        name: string,
        value: type.infer<TSchema>,
        context: ContextualValueCalculationContext,
    ) {
        const found = this.#associatedValues?.get(name);

        if (!found) {
            return undefined;
        }

        return found(value, context);
    }

    public getAssociatedValue(
        name: string,
        value: unknown,
        context: ContextualValueCalculationContext,
    ) {
        if (
            !shallowMatchesStructure(
                this.#schema,
                value,
                true,
                descend.defaultDepth,
            )
        ) {
            // slightly more helpful error message, only incur cost if there is a failure.
            if (isModel(value)) {
                throw new Error(
                    'Value was a model -- expected the value to be passed, you may be missing a .value',
                );
            }
            throw new Error('Incorrect type value provided.');
        }

        return this.#getAssociatedValueTyped(name, value, context);
    }

    #getAmbientValueTyped(
        name: string,
        value: type.infer<TSchema>,
        context: ContextualValueCalculationContext,
    ) {
        const found = this.#ambientValues?.get(name);

        if (!found) {
            return undefined;
        }

        return found(value, context);
    }

    public getAmbientValue(
        name: string,
        value: unknown,
        context: ContextualValueCalculationContext,
    ) {
        if (
            !shallowMatchesStructure(
                this.#schema,
                value,
                true,
                descend.defaultDepth,
            )
        ) {
            // slightly more helpful error message, only incur cost if there is a failure.
            if (isModel(value)) {
                throw new Error(
                    'Value was a model -- expected the value to be passed, you may be missing a .value',
                );
            }
            throw new Error('Incorrect type value provided.');
        }

        return this.#getAmbientValueTyped(name, value, context);
    }

    createBuilder(): AnnotationsBuilderImpl {
        return new AnnotationsBuilderImpl(
            this.#attributes ? new Map(this.#attributes.entries()) : undefined,
            this.#labels ? new Set(this.#labels) : undefined,
            this.#associatedValues
                ? new Map(this.#associatedValues.entries())
                : undefined,
            this.#ambientValues
                ? new Map(this.#ambientValues.entries())
                : undefined,
        );
    }
}
