import { calc } from '../index.js';
import { Signal } from '../signals/types.js';

export interface ShowProps {
    if: Signal<boolean>;
    children: () => JSX.Element;
}

export function Show(props: ShowProps): JSX.Element {
    const showCalculation = (): JSX.Element => {
        if (props.if.value) {
            return props.children();
        }
        return undefined;
    };

    return calc(showCalculation);
}
