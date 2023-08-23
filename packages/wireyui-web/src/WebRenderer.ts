import { JSXElement } from "@captainpants/wireyui-core";

/**
 * Placeholder interface for future options to be provided to the root.
 */
export interface WebRendererOptions {

}

export class WebRenderer{
    #options: WebRendererOptions;

    constructor(options?: WebRendererOptions) {
        this.#options = options ?? {};
    }

    render(element: Element, rootComponent: JSXElement) {
        throw 'Something';
    }
}
