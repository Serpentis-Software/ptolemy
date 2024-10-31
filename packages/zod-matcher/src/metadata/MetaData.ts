import { z } from 'zod';
import { ContextualValueCalculationCallback, ContextualValueCalculationContext, ReadonlySignalLike, notFound } from '..';
import { descend } from '@captainpants/sweeter-utilities';
import { shallowMatchesStructure } from '../models/validate';

const weakMap = new WeakMap<z.ZodType, MetaData<any>>();

const schemas = {
    displayName: z.string(),
    propertyCategory: z.string(),
    propertyVisible: z.boolean()
}

export interface MetaData<TZodType extends z.ZodTypeAny> {
    attr(name: string, value: unknown): this;

    getAttr(name: string, fallback: unknown): unknown;
    getAttrValidated<TValueZodType extends z.ZodTypeAny>(name: string, valueSchema: TValueZodType, fallback: z.infer<TValueZodType>): z.infer<TValueZodType>;

    label(name: string, val?: boolean): this;
    hasLabel(name: string): boolean;
    
    category(category: string | null): this;
    category(): string | null;

    displayName(displayName: string | null): this;
    displayName(): string | null;
    getBestDisplayName(): string;

    visible(visibility: boolean): this;
    visible(): boolean;
    
    withLocalValue(name: string, callback: ContextualValueCalculationCallback<any>): this;
    withLocalValue(name: string, value: unknown): this;
    
    withAmbientValue(name: string, callback: ContextualValueCalculationCallback<any>): this;
    withAmbientValue(name: string, value: unknown): this;

    getLocalValue(
        name: string,
        value: z.infer<TZodType>,
        context: ContextualValueCalculationContext,
    ): unknown;

    getLocalValueForUnknown(
        name: string,
        value: unknown,
        context: ContextualValueCalculationContext,
    ): unknown;

    getAmbientValue(
        name: string,
        value: z.infer<TZodType>,
        context: ContextualValueCalculationContext,
    ): unknown;

    getAmbientValueForUnknown(
        name: string,
        value: unknown,
        context: ContextualValueCalculationContext,
    ): unknown;

    endMeta(): TZodType;
};
