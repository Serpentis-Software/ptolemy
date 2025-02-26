import {
    $derived,
    type Component,
    type IntrinsicRawElementAttributes,
    mapProps,
    type Prop,
    type PropertiesAreSignals,
    type PropertiesMightBeSignals,
} from '@serpentis/ptolemy-core';
import {
    type ElementCssClasses,
    type ElementCssStyles,
    GlobalCssClass,
    stylesheet,
} from '@serpentis/ptolemy-web';

import { combineStyles } from '../../internal/combineStyles.js';
import {
    breakpointNameToSizeMap,
    type BreakpointSizeName,
} from '../../stylesheets/internal/constants.js';

type OverridableHtmlAttributes = Exclude<
    IntrinsicRawElementAttributes<'div'>,
    'id'
>;

export interface ContainerProps {
    id?: string | undefined;

    children?: JSX.Element | undefined;

    size?: BreakpointSizeName | undefined;

    style?: ElementCssStyles | undefined;
    class?: ElementCssClasses | undefined;

    passthrough?: Prop<
        PropertiesMightBeSignals<OverridableHtmlAttributes | undefined>,
        PropertiesAreSignals<OverridableHtmlAttributes | undefined>
    >;
}

export const Container: Component<ContainerProps> = ({
    id,
    children,
    size,
    class: classProp,
    style,
    passthrough: {
        class: classFromPassthroughProps,
        style: styleFromPassthroughProps,
        ...passthroughProps
    } = {},
}) => {
    const sizeStyle: ElementCssStyles = {
        'max-width': size
            ? $derived(() =>
                  size.value
                      ? `${breakpointNameToSizeMap[size.value]}px`
                      : undefined,
              )
            : undefined,
    };

    return (
        <div
            id={id}
            class={[css, classFromPassthroughProps, classProp]}
            style={combineStyles(sizeStyle, style, styleFromPassthroughProps)}
            {...passthroughProps}
        >
            {children}
        </div>
    );
};

const css = new GlobalCssClass({
    className: 'container',
    content: stylesheet`
        margin: 0 auto;
    `,
});

Container.propMappings = {
    passthrough: (input) =>
        input !== undefined
            ? mapProps<
                  PropertiesAreSignals<OverridableHtmlAttributes | undefined>
              >(undefined, input)
            : undefined,
};
