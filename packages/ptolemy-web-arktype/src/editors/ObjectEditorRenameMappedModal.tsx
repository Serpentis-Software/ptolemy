import { $derived, $mutable, type Component } from '@serpentis/ptolemy-core';
import { type TypedEvent } from '@serpentis/ptolemy-web';
import {
    Button,
    Column,
    Container,
    Input,
    Modal,
    Row,
} from '@serpentis/ptolemy-web-stardust';

export interface ObjectEditorRenameMappedModalProps {
    isOpen: boolean;

    from: string;

    validate: (from: string, to: string) => Promise<string | null>;

    onCancelled: () => void;
    onFinished: (from: string, to: string) => Promise<void>;
}

export const ObjectEditorRenameMappedModal: Component<
    ObjectEditorRenameMappedModalProps
> = ({ isOpen, from, validate, onCancelled, onFinished }) => {
    const title = $derived(() => {
        return `Renaming '${from.value}'`;
    });

    const to = $mutable('');
    const failedValidationMessage = $mutable<null | string>(null);

    const onCancelClicked = (
        evt: TypedEvent<HTMLButtonElement, MouseEvent>,
    ) => {
        if (evt.button === 0) {
            evt.preventDefault();

            // Reset
            to.value = '';
            failedValidationMessage.value = null;

            onCancel();
        }
    };

    const onCancel = () => {
        // Reset
        to.value = '';
        failedValidationMessage.value = null;

        onCancelled.peek();
    };

    const onOK = async (evt: TypedEvent<HTMLButtonElement, MouseEvent>) => {
        if (evt.button === 0) {
            evt.preventDefault();

            if (from.peek() !== to.peek()) {
                const validationResult = await validate.peek()(
                    from.peek(),
                    to.peek(),
                );

                failedValidationMessage.value = validationResult;

                if (validationResult) {
                    return;
                }
            }

            await onFinished.peek()(from.peek(), to.peek());
        }
    };

    // TODO: autofocus
    // TODO: binding to <input />.value still allows user input, despite the signal being not being updated..
    return (
        <Modal isOpen={isOpen} title={title} onClose={onCancel}>
            {() => {
                return (
                    <Container>
                        <Row>
                            <Column sm={4}>From</Column>
                            <Column sm={8}>
                                <Input
                                    type="text"
                                    value={from}
                                    readOnly
                                    fillWidth
                                />
                            </Column>
                        </Row>
                        <Row>
                            <Column sm={4}>To</Column>
                            <Column sm={8}>
                                <Input
                                    type="text"
                                    bind:value={to}
                                    fillWidth
                                    autofocus
                                />
                            </Column>
                        </Row>
                        <Row>
                            <Column sm={4}></Column>
                            <Column sm={8}>
                                <Button onclick={onCancelClicked}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onclick={(evt) => void onOK(evt)}
                                >
                                    OK
                                </Button>
                            </Column>
                        </Row>
                    </Container>
                );
            }}
        </Modal>
    );
};
