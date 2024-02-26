import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { EXTENSION_EDITOR_STATE_ATOM } from '../extension-editor/extension-editor-state';
import importButtonCallback from '../import-button-callback';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { showModalOk } from '../../../modals/modal-ok';

// eslint-disable-next-line import/prefer-default-export
export function StopButton() {
  const setEditorState = useSetAtom(EXTENSION_EDITOR_STATE_ATOM);

  const gameFolder = useCurrentGameFolder();

  const [t] = useTranslation(['gui-editor']);
  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onClick={async () => {
        try {
          await importButtonCallback(
            gameFolder,
            () => {},
            t,
            `${gameFolder}/ucp-config.yml`,
          );

          setEditorState({ state: 'inactive' });
        } catch (err: any) {
          await showModalOk({
            title: 'ERROR',
            message: err.toString(),
          });
        }
      }}
    >
      Stop modifying
    </button>
  );
}
