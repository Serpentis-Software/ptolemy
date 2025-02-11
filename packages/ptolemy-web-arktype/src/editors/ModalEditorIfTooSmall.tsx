import { $derived, $mutable, $val, Component } from '@serpentis/ptolemy-core';

import { MeasuredBox } from '../components/MeasuredBox.js';
import { type EditorProps } from '../types.js';

import { ModalEditor } from './ModalEditor.js';

export type ConditionalModelEditorProps = EditorProps & { minWidth?: number };

export const ModalEditorIfTooSmall: Component<ConditionalModelEditorProps> = ({
    minWidth = 200,
    next,
    ...passthrough
}) => {
    const measuredWidth = $mutable(0);
    const useModal = $derived(() => {
        const minWidthResolved = $val(minWidth);

        const result =
            // minWidgthResolved === undefined is not a sensible condition, but if it is the case then we never use a modal
            minWidthResolved !== undefined &&
            measuredWidth.value <= minWidthResolved;

        return result;
    });

    const content = $derived(() => {
        const useModelResolved = $val(useModal);

        if (useModelResolved) {
            // Wrap in a model
            return <ModalEditor next={next} {...passthrough} />;
        }

        return $val(next)(passthrough);
    });

    return (
        <MeasuredBox
            onInitialLayout={(w) => {
                measuredWidth.value = w;
            }}
            onLayout={(w) => {
                measuredWidth.value = w;
            }}
        >
            {content}
        </MeasuredBox>
    );
};
