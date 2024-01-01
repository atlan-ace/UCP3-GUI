/* eslint-disable react/jsx-props-no-spreading */
import './launch.css';
import './launch-options/launch-options.css'; // currently imported here, als long as single files not needed

import { useTranslation } from 'react-i18next';
import GameStarter from 'components/ucp-tabs/launch/game-starter/game-starter';
import {
  EXTREME_PATH_ATOM,
  VANILLA_PATH_ATOM,
} from 'function/game-files/game-path';
import {
  EXTREME_VERSION_ATOM,
  VANILLA_VERSION_ATOM,
} from 'function/game-files/game-version-state';
import { useRef, useState } from 'react';

import { Button, Collapse } from 'react-bootstrap';
import logoCrusaderExtreme from '../../../assets/game-assets/logo-crusader-extreme.png';
import logoCrusaderVanilla from '../../../assets/game-assets/logo-crusader-vanilla.png';
import { createLaunchOptionFuncs } from './launch-options/launch-options';
import FreeArgs from './launch-options/free-args';
import FreeEnvs from './launch-options/free-envs';
import {
  UcpConsoleLogLevel,
  UcpLogLevel,
} from './launch-options/verbosity-args';

export default function Launch() {
  const internalArgs = useRef<Record<string, string[]>>({}).current;
  const internalEnvs = useRef<Record<string, Record<string, string>>>(
    {},
  ).current;

  const { t } = useTranslation(['gui-launch']);

  const receiveArgs = () => Object.values(internalArgs).flat();
  const receiveEnvs = () => Object.assign({}, ...Object.values(internalEnvs));

  const [displayAdvancedLaunchOptions, setDisplayAdvancedLaunchOptions] =
    useState(false);

  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          imagePath={logoCrusaderVanilla}
          pathAtom={VANILLA_PATH_ATOM}
          versionAtom={VANILLA_VERSION_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
        />
        <GameStarter
          imagePath={logoCrusaderExtreme}
          pathAtom={EXTREME_PATH_ATOM}
          versionAtom={EXTREME_VERSION_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
        />
      </div>
      <div className="d-flex align-self-start">
        <Button
          variant="link"
          onClick={() =>
            setDisplayAdvancedLaunchOptions(!displayAdvancedLaunchOptions)
          }
        >
          {displayAdvancedLaunchOptions
            ? t('gui-launch:launch.options.view')
            : t('gui-launch:launch.options.hide')}
        </Button>
      </div>
      <div
        className={
          displayAdvancedLaunchOptions
            ? 'flex-default launch__options'
            : 'd-none'
        }
      >
        <h4>{t('gui-launch:launch.options')}</h4>
        <div className="parchment-box launch__options__box">
          <div className="launch__options__box__row">
            <UcpLogLevel
              {...createLaunchOptionFuncs(
                'UCP_LOG_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
            <UcpConsoleLogLevel
              {...createLaunchOptionFuncs(
                'UCP_CONSOLE_LOG_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
          </div>
          <div className="launch__options__box__row">
            <FreeArgs
              {...createLaunchOptionFuncs(
                'FREE_ARGS',
                internalArgs,
                internalEnvs,
              )}
            />
            <FreeEnvs
              {...createLaunchOptionFuncs(
                'FREE_ENVS',
                internalArgs,
                internalEnvs,
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
