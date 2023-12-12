import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';

export interface OkModalWindowProperties
  extends Omit<AbstractModalWindowProperties<void, void>, 'handleClose'> {}

const DEFAULT_OK_MODAL_PROPERTIES: AbstractModalWindowProperties<void, void> = {
  message: '',
  title: '',
  handleAction: () => {},
  handleClose: () => {},
  ok: '',
};

function ModalOk(props: OkModalWindowProperties) {
  const { handleAction, title, message, ok } = props;

  const [show, setShow] = useState(true);

  const { t } = useTranslation(['gui-general']);

  const internalHandleAction = () => {
    setShow(false);
    handleAction();
  };

  return (
    <Modal
      show={show}
      onHide={internalHandleAction}
      className="text-dark"
      style={{ whiteSpace: 'pre-line' }}
      // prevents escaping the modal:
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={internalHandleAction}>
          {ok.length > 0 ? ok : t('gui-general:ok')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export async function showModalOk(spec: Partial<OkModalWindowProperties>) {
  const fullSpec: AbstractModalWindowProperties<void, void> = {
    ...DEFAULT_OK_MODAL_PROPERTIES,
    ...spec,
  };

  return registerModal<void, void, AbstractModalWindowProperties<void, void>>(
    ModalOk,
    fullSpec,
  );
}
