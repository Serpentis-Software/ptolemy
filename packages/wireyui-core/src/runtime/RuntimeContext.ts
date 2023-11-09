import { Context } from '../context/Context.js';
import { type RuntimeRootHostElement } from '../types.js';

export interface RuntimeContext {
    renderOffscreen(content: JSX.Element): JSX.Element;
    start(
        target: RuntimeRootHostElement,
        render: () => JSX.Element,
    ): () => void;
}

const noImplementation = () => {
    throw new TypeError('No RuntimeContext set');
};

export const RuntimeContext = new Context<RuntimeContext>('Runtime', {
    start: noImplementation,
    renderOffscreen: noImplementation,
});
