import { type Signal } from '../../signals/types.js';
import { type MightBeSignal } from '../misc.js';
import {
    type Prop,
    type PropertyMap,
    type PropInputFromParam,
    type PropParamFromRaw,
    type PropsParam,
} from '../propTypes.js';

// In an ideal world we might work out an alternative..
export type RemoveUndefined<T> = Exclude<T, undefined>;

type InputOutputPair<T> = readonly [MightBeSignal<T>, Signal<T>];

export type PropInputFromRaw<T> = PropInputFromParam<PropParamFromRaw<T>>;

export type PropertiesThatRequireMapping<TPropsRaw> = RemoveUndefined<
    {
        [Key in keyof TPropsRaw]: readonly [
            PropInputFromRaw<TPropsRaw[Key]>,
            PropParamFromRaw<TPropsRaw[Key]>,
        ] extends InputOutputPair<infer _S>
            ? never
            : Key;
    }[keyof TPropsRaw]
>;

export type PropOutputFromParam<TPropParam> = [TPropParam] extends [
    Prop<infer _Input, infer Output>,
]
    ? Output
    : [TPropParam] extends [Prop<infer _Input, infer Output> | undefined]
      ? Output | undefined
      : TPropParam;

export type PropOutputFromRaw<T> = PropOutputFromParam<PropParamFromRaw<T>>;

export type RequiredPropMappingsIfAny<TProps> = [
    PropertiesThatRequireMapping<TProps>,
] extends [never]
    ? unknown
    : { propMappings: PropertyMap<PropsParam<TProps>> };
