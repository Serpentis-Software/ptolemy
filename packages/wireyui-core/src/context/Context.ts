import { allContexts } from './internal/allContexts.js';
import { saveAllContext } from './saveAllContext.js';

// Simplest way to get the tests working as the symbols aren't yet common
import '../polyfills/dispose-missing-symbols.js';

export class Context<T> implements Disposable {
    constructor(name: string, current: T) {
        this.name = name;
        this.id = Symbol(name);
        this.current = current;

        allContexts.add(this);
    }

    readonly name: string;

    readonly id: symbol;

    current: T;

    replace(value: T): Disposable {
        const saved = this.current;

        this.current = value;

        return {
            [Symbol.dispose]: () => {
                this.current = saved;
            },
        };
    }

    invoke(value: T, callback: () => void): void {
        using _ = this.replace(value);

        callback();
    }

    /**
     * Intended to use with pattern resume.from(await promise); this will store all current context
     * when .resume is accessed, and restore it when the from method.
     */
    static get resume() {
        const saved = saveAllContext();
        return {
            with<T>(result: T): T {
                saved.restore();
                return result;
            },
        };
    }

    [Symbol.dispose](): void {
        allContexts.delete(this);
    }
}
