import { type TypeMatcherRule } from '@serpentis/ptolemy-arktype-modeling';
import { Context } from '@serpentis/ptolemy-core';

import {
    type EditorComponentType,
    type EditorSettings,
    type ModalComponentType,
} from '../types.js';

export interface EditorRootContextType {
    settings: EditorSettings;
    Modal: ModalComponentType;
    rules: Array<TypeMatcherRule<EditorComponentType>>;
}

export const EditorRootContext = new Context<EditorRootContextType>(
    'EditorHost',
    {
        get settings(): EditorSettings {
            throw new TypeError('No context found.');
        },
        get Modal(): ModalComponentType {
            throw new TypeError('No context found.');
        },
        get rules(): Array<TypeMatcherRule<EditorComponentType>> {
            throw new TypeError('No context found.');
        },
    },
);
