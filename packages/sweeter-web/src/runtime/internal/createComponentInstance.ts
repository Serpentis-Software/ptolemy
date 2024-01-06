import {
    subscribeToChanges,
    Context,
    initializeHook,
} from '@captainpants/sweeter-core';
import {
    type ComponentTypeConstraint,
    type UnsignalAll,
    type ComponentInit,
    type PropsWithIntrinsicAttributesFor,
} from '@captainpants/sweeter-core';
import { addMountedCallback, addUnMountedCallback } from './mounting.js';
import { type WebRuntime } from '../types.js';

const hookInitSymbol = Symbol('hook');

type ExtendedComponentInit = ComponentInit & {
    [hookInitSymbol]: Comment | undefined;
};

function createComponentInstanceInit<
    TComponentType extends ComponentTypeConstraint,
>(Component: TComponentType, webRuntime: WebRuntime): ExtendedComponentInit {
    // Use this to get the error context within callbacks
    const contextSnapshot = Context.createSnapshot();

    const init: ExtendedComponentInit = (hook, ...args) =>
        initializeHook(init, hook, ...args);

    init.isValid = true;
    init[hookInitSymbol] = undefined;

    function getOrCreateMagicComment(reason: string) {
        let hooks = init[hookInitSymbol];

        if (hooks) {
            hooks.textContent += `, ${reason}`;
        } else {
            hooks = init[hookInitSymbol] = document.createComment(
                `Hooks(${Component.name}): ${reason}`,
            );
        }
        return hooks;
    }

    init.onMount = (callback: () => (() => void) | void) => {
        if (!init.isValid) {
            throw new Error('onMount must only be called during init phase.');
        }

        const hooks = getOrCreateMagicComment('onMount');

        // This calls callAgainstErrorBoundary around callback and its resulting callback
        addMountedCallback(contextSnapshot, hooks, callback);
    };

    init.onUnMount = (callback: () => void) => {
        if (!init.isValid) {
            throw new Error('onUnMount must only be called during init phase.');
        }

        addUnMountedCallback(
            contextSnapshot,
            getOrCreateMagicComment('onUnMount'),
            callback,
        );
    };

    init.subscribeToChanges = <TArgs extends readonly unknown[]>(
        dependencies: [...TArgs],
        callback: (args: UnsignalAll<TArgs>) => void | (() => void),
        invokeOnSubscribe = true,
    ) => {
        if (!init.isValid) {
            throw new Error(
                'subscribeToChanges must only be called during init phase.',
            );
        }

        addMountedCallback(
            contextSnapshot,
            getOrCreateMagicComment('subscribeToChanges'),
            function subscribeChanges_onMount() {
                return subscribeToChanges(
                    dependencies,
                    callback,
                    invokeOnSubscribe,
                );
            },
        );
    };

    init.nextId = (basis?: string) => webRuntime.nextId(basis);

    init.runtime = webRuntime;

    // Not sure if this is really a valuable component in init as you can call Context.current
    // but it does indicate that you should capture the context values you need during init
    // and not later when the context stack is gone
    init.getContext = <T>(context: Context<T>): T => {
        if (init.isValid) {
            throw new Error(
                'getContext must only be called during init phase.',
            );
        }

        return context.getCurrent();
    };

    return init;
}

export function createComponentInstance<
    TComponentType extends ComponentTypeConstraint,
>(
    Component: TComponentType,
    props: PropsWithIntrinsicAttributesFor<TComponentType>,
    webRuntime: WebRuntime,
): JSX.Element {
    const init = createComponentInstanceInit(Component, webRuntime);

    const res = Component(props, init);

    // Makes all init calls throw from now on
    init.isValid = false;

    const hookElement = init[hookInitSymbol];

    if (hookElement) {
        return [res, hookElement];
    }
    // shortcut if we don't need to add in markers for mount callbacks.
    return res;
}
