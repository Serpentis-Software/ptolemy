import { GlobalCssClass } from './GlobalCssClass.js';
import { isStylesheetContentGenerator } from './isStylesheetContentGenerator.js';
import {
    type AbstractGlobalCssClass,
    type AbstractGlobalCssStylesheet,
    type GlobalStyleSheetContentGeneratorContext,
    type StylesheetContentGenerator,
} from './types.js';

export type StylesheetParametersType =
    | AbstractGlobalCssClass
    | StylesheetContentGenerator
    | string
    | number
    | StylesheetParametersType[];

/**
 * Template string function.
 *
 * Creates a StylesheetContentGenerator based on a templated string, where you can use GlobalCssClass references in style selectors.
 * @param template
 * @param params
 * @returns
 */
export function stylesheet(
    template: TemplateStringsArray,
    ...params: StylesheetParametersType[]
): StylesheetContentGenerator {
    // TODO: if params.length is zero, we can safely cache the result based on the template reference in a WeakMap.

    const result: StylesheetContentGenerator = {
        generate: (context) => {
            const res: string[] = [];
            const last = template.length - 1;
            for (let i = 0; i < template.length; ++i) {
                res.push(template[i]!);

                if (i !== last) {
                    const param = params[i]!;

                    processParam(param, res, context);
                }
            }
            return res.join('');
        },
        getReferencedStylesheets: () => {
            const references: AbstractGlobalCssStylesheet[] = [];
            for (const param of params) {
                if (param instanceof GlobalCssClass) {
                    references.push(param);
                } else if (isStylesheetContentGenerator(param)) {
                    const refsFromNestedGenerator =
                        param.getReferencedStylesheets();
                    if (refsFromNestedGenerator) {
                        references.push(...refsFromNestedGenerator);
                    }
                }
            }
            return references;
        },
    };

    return result;
}
function processParam(
    param: StylesheetParametersType,
    res: string[],
    context: GlobalStyleSheetContentGeneratorContext,
): void {
    if (Array.isArray(param)) {
        for (const item of param) {
            processParam(item, res, context);
        }
    } else if (typeof param === 'number') {
        res.push(String(param));
    } else if (typeof param === 'string') {
        res.push(param);
    } else if (isStylesheetContentGenerator(param)) {
        res.push(param.generate(context));
    } else {
        res.push(context.getPrefixedClassName(param));
    }
}
