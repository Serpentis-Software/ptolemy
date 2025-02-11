import { type StackTrace } from '@serpentis/ptolemy-utilities';

import {
    type PTOLEMY_IS_CONSTANT_SIGNAL,
    type PTOLEMY_IS_SIGNAL,
    type PTOLEMY_IS_WRITABLE_SIGNAL,
} from './internal/markers.js';
import { type SignalState } from './SignalState.js';

export type SignalListener<T> = (
    next: SignalState<T>,
    previous: SignalState<T>,
    trigger: Signal<unknown> | undefined,
) => void;

export interface DebugListenerInfo {
    liveCount: number;
    getDetail(): string;
}

/**
 * Basically Signal<T> without the .value property, so that we can share all other functionality between Signal<T> and
 * ReadWriteSignal<T>, but have a different specification for .value. This is mostly because Unfortunately you cannot
 * expand a readonly property on a base interface to a read/write property on a derived interface.
 */
export interface SignalCommon<T> {
    /**
     * Get the current value of the signal without subscribing for updates. If the result of the signal
     * is an exception, it is rethrown.
     */
    peek(): T;

    /**
     * Gets the current state of the signal, which might be an exception.
     * @param ensureInit defaults to true - ensure that the signal is inialized
     */
    peekState(ensureInit?: boolean): SignalState<T>;

    /**
     * Use this to check if a signal has been initialized. This can be useful in a $derived that references itself.
     */
    readonly inited: boolean;
    /**
     * Use this to check if the signal is currently in a failed state, which means .peek()/.value would throw if called.
     */
    readonly failed: boolean;

    /**
     * Add a callback to be invoked when the signal's value changes.
     * @param listener
     */
    listen(listener: SignalListener<T>): () => void;

    /**
     * Add a callback to be invoked when the signal's value changes. The reference to listener is held via WeakRef.
     * @param listener
     */
    listenWeak(listener: SignalListener<T>): () => void;

    /**
     * Remove a callback that has previously been registered.
     * @param listener
     */
    unlisten(listener: SignalListener<T>): void;

    /**
     * Remove a callback that has previously been registered.
     * @param listener
     */
    unlistenWeak(listener: SignalListener<T>): void;

    /**
     * Remove all listeners.
     */
    clearListeners(): void;

    // == DEBUGGING ==

    /**
     * Globally unique id of signal, used only for debugging.
     */
    readonly debugId: number;

    /**
     * If enabled, this will contain a stack trace created in the constructor of the signature, allowing
     * you to work out where the signal was created.
     */
    readonly createdAtStack?: StackTrace;

    /**
     * Associate location information with the signal for debugging. This is readable via this.getDebugIdentity()
     * @param name
     * @param sourceFile
     * @param sourceMethod
     * @param row
     * @param col
     */
    identify(
        name: string,
        sourceFile?: string,
        sourceMethod?: string,
        row?: number,
        col?: number,
    ): this;

    /**
     * Marks that this signal should not be annotated with information about where it was created. This is used by the rollup plugin.
     */
    doNotIdentify(): this;

    /**
     * Retrieve declaration information about the signal if present.
     */
    getDebugIdentity(): string;

    /**
     * Retrieve information about listeners that are currently registered.
     */
    getDebugListenerInfo(): DebugListenerInfo;

    /**
     * Gets a JSON tree of dependents of the current signal.
     */
    debugGetListenerTree(): DebugDependencyNode;
}

export interface Signal<T> extends SignalCommon<T> {
    /**
     * Marker used for type assertions
     */
    readonly [PTOLEMY_IS_SIGNAL]: true;

    /**
     * Get the current value of the signal and subscribe for updates. If the result of the signal
     * is an exception, it is rethrown.
     */
    readonly value: T;
}

export interface WritableSignal<T> extends SignalCommon<T> {
    readonly [PTOLEMY_IS_WRITABLE_SIGNAL]: true;

    // there is no way to mark this as write only, but logically it is
    value: T;
}

export interface ConstantSignal<T> extends Signal<T> {
    readonly [PTOLEMY_IS_CONSTANT_SIGNAL]: true;
}

export interface ReadWriteSignal<T> extends Signal<T>, WritableSignal<T> {
    value: T;
}

export type Unsignal<T> = T extends Signal<infer S> ? S : T;
export type UnsignalAll<T extends readonly unknown[] | object> = {
    [Key in keyof T]: Unsignal<T[Key]>;
};

export type CallbackDelayedRunner = (callback: () => void) => void;

export type SignalUpdateValuesAreEqualCallback<T> = (from: T, to: T) => boolean;

export interface DerivedSignalOptions {
    /**
     * If this AbortSignal is aborted then the calculated signal 'release' - meaning that it stops being updated when
     * its dependencies are updated.
     *
     * This is probably not that useful to regular users, but helpful when building infrastucture
     * and you e.g. want to invalidate a signal that is no longer relevant, but don't want accidental breakages down the chain.
     *
     * This was originally implemented for the For component.
     */
    release?: AbortSignal;
}

export type DebugDependencyNode =
    | {
          type: 'signal';
          signal: Signal<unknown>;
          dependents: DebugDependencyNode[];
      }
    | {
          type: 'listener';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          listener: (...args: readonly any[]) => any;
          addedAtStack: StackTrace | undefined;
      };
