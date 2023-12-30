import {
  CustomMenuContents,
  DisplayConfigElement,
  Extension,
} from 'config/ucp/common';
import {
  SandboxArgs,
  SandboxMenu,
  SandboxSource,
  SandboxSourcePaths,
} from 'components/sandbox-menu/sandbox-menu';
import { useSetOverlayContent } from 'components/overlay/overlay';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from 'function/configuration/state';
import { useAtomValue } from 'jotai';
import { ExtensionHandle } from 'function/extensions/handles/extension-handle';
import Logger from 'util/scripts/logging';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseEnabledLogic } from '../enabled-logic';
import ConfigWarning from './ConfigWarning';

const LOGGER = new Logger('CreateCustomMenu.tsx');

async function receiveSource(handle: ExtensionHandle, source: string) {
  if (!source) {
    return '';
  }
  return handle.getTextContents(`menu/${source}`).catch((e) => {
    LOGGER.msg(
      'Unable to load source "{}" from menu path of extension with path "{}": {}',
      source,
      handle.path,
      e,
    ).warn();
    return '';
  });
}

async function receiveSources(
  extension: Extension,
  sourcePaths: SandboxSourcePaths,
): Promise<SandboxSource> {
  return extension.io
    .handle((handle) =>
      Promise.all([
        receiveSource(handle, sourcePaths.html),
        receiveSource(handle, sourcePaths.css),
        receiveSource(handle, sourcePaths.js),
      ]),
    )
    .then((sourceStrings) =>
      // should these be sanitized?
      ({
        html: sourceStrings[0],
        css: sourceStrings[1],
        js: sourceStrings[2],
      }),
    );
}

function CreateCustomMenu(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const configuration = useAtomValue(CONFIGURATION_REDUCER_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );

  const [t, i18n] = useTranslation(['gui-editor']);
  const [activatingMenu, setActivatingMenu] = useState(false);
  const setOverlayContent = useSetOverlayContent<SandboxArgs>();

  const { spec, disabled } = args;
  const { url, text, enabled, header, extension } = spec;
  const { source: sourcePaths } = spec.contents as CustomMenuContents;

  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  return (
    <div>
      {hasWarning ? (
        <ConfigWarning
          text={configurationWarnings[url].text}
          level={configurationWarnings[url].level}
        />
      ) : null}
      <div>
        <label className="form-check-label" htmlFor={`${url}-sandbox`}>
          {!hasHeader && header}
          {text}
        </label>
      </div>
      <div>
        <button
          type="button"
          id={`${url}-sandbox`}
          className="ucp-button sandbox-menu-button"
          onClick={async () => {
            setActivatingMenu(true);
            setOverlayContent(SandboxMenu, {
              baseUrl: url,
              source: await receiveSources(extension, sourcePaths),
              localization: extension.locales[i18n.language] ?? {},
              fallbackLocalization: extension.locales.en ?? {},
              title: hasHeader ? header : undefined,
            });
            setActivatingMenu(false);
          }}
          disabled={!isEnabled || disabled || activatingMenu}
        >
          {t('gui-editor:sandbox.open')}
        </button>
      </div>
    </div>
  );
}

export default CreateCustomMenu;
