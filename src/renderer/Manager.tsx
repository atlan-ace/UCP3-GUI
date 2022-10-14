import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import {
  Button,
  Col,
  Container,
  Form,
  ListGroup,
  Modal,
  Row,
} from 'react-bootstrap';
import ToggleButton from 'react-bootstrap/ToggleButton';

import { useReducer, useState, createContext, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConfigEditor from './editor/ConfigEditor';

import { DisplayConfigElement } from './editor/factory/UIElements';
import ExtensionManager from './extensionManager/ExtensionManager';

import {
  activeExtensionsReducer,
  configurationDefaultsReducer,
  configurationReducer,
  configurationTouchedReducer,
  configurationWarningReducer,
  GlobalState,
  UIDefinition,
} from './GlobalState';

import { ucpBackEnd } from './fakeBackend';
import { Extension } from '../common/config/common';
import { useTranslation } from 'react-i18next';

function getConfigDefaults(yml: unknown[]) {
  const result: { [url: string]: unknown } = {};

  function yieldDefaults(part: any | DisplayConfigElement): void {
    if (typeof part === 'object') {
      if (Object.keys(part).indexOf('url') > -1) {
        result[part.url as string] = part.default;
      }
      if (Object.keys(part).indexOf('children') > -1) {
        part.children.forEach((child: unknown) => yieldDefaults(child));
      }
    }
  }

  yml.forEach((element: unknown) => yieldDefaults(element));

  return result;
}

let uiDefinition: UIDefinition;
let ucpVersion: {
  major: number;
  minor: number;
  patch: number;
  sha: string;
  build: string;
};
let isUCP3Installed = false;
let latestUCP3: unknown;

let extensions: Extension[] = []; // which extension type?

export default function Manager() {
  const [searchParams] = useSearchParams();
  const currentFolder = ucpBackEnd.getGameFolderPath(searchParams);

  const [t] = useTranslation(["gui-general", "gui-editor"]);

  const warningDefaults = {
    // 'ucp.o_default_multiplayer_speed': {
    //   text: 'ERROR: Conflicting options selected: test warning',
    //   level: 'error',
    // },
  };

  const [configurationWarnings, setConfigurationWarnings] = useReducer(
    configurationWarningReducer,
    {}
  );

  const [configurationDefaults, setConfigurationDefaults] = useReducer(
    configurationDefaultsReducer,
    {}
  );
  const [configurationTouched, setConfigurationTouched] = useReducer(
    configurationTouchedReducer,
    {}
  );
  const [activeExtensions, setActiveExtensions] = useReducer(
    activeExtensionsReducer,
    []
  );

  const [configuration, setConfiguration] = useReducer(
    configurationReducer,
    {}
  );

  const warningCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [checkForUpdatesButtonText, setCheckForUpdatesButtonText] = useState(
    t("gui-editor:overview.download.install")
  );
  const [guiUpdateStatus, setGuiUpdateStatus] = useState('');

  const [initDone, setInitState] = useState(false);
  useEffect(() => {
    async function prepareValues() {
      console.log(currentFolder);
      if (currentFolder.length > 0) {
        uiDefinition = await ucpBackEnd.getYamlDefinition(currentFolder);
        const defaults = getConfigDefaults(uiDefinition.flat as unknown[]);

        ucpVersion = await ucpBackEnd.getUCPVersion(currentFolder);
        if (ucpVersion.major !== undefined) isUCP3Installed = true;
        setConfiguration({
          type: 'reset',
          value: defaults,
        });
        setConfigurationDefaults({
          type: 'reset',
          value: defaults,
        });
      }

      // TODO: currently only set on initial render and folder selection
      // TODO: resolve this type badness
      extensions = (await ucpBackEnd.getExtensions(
        currentFolder
      )) as unknown as Extension[];
      setInitState(true);
    }
    prepareValues();
  }, [currentFolder]);

  const globalStateValue = useMemo(
    () => ({
      initDone,
      extensions,
      configurationWarnings,
      setConfigurationWarnings,
      configurationDefaults,
      setConfigurationDefaults,
      configurationTouched,
      setConfigurationTouched,
      activeExtensions,
      setActiveExtensions,
      configuration,
      setConfiguration,
      uiDefinition,
      folder: currentFolder,
      file: `${currentFolder}/ucp-config.yml`,
    }),
    [
      initDone,
      activeExtensions,
      configuration,
      configurationDefaults,
      configurationTouched,
      configurationWarnings,
      currentFolder,
    ]
  );

  if (!initDone) {
    return <p>{t("gui-general:loading")}</p>;
  }

  return (
    <GlobalState.Provider value={globalStateValue}>
      <div className="editor-app m-3 fs-7">
        <div className="col-12">
          <Tabs
            defaultActiveKey="overview"
            id="uncontrolled-tab-example"
            className="mb-3"
          >
            <Tab eventKey="overview" title={t("gui-editor:overview.title")}>
              <div className="m-3">
                {t("gui-editor:overview.folder.version")}{' '}
                {isUCP3Installed
                  ? `${ucpVersion.major}.${ucpVersion.minor}.${ucpVersion.patch
                  } - ${(ucpVersion.sha || '').substring(0, 8)}`
                  : t("gui-editor:overview.not.installed")}
              </div>
              <div className="m-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async (event) => {
                    setCheckForUpdatesButtonText(t("gui-editor:overview.update.running"));
                    const updateResult = await ucpBackEnd.checkForUCP3Updates(
                      currentFolder
                    );
                    if (
                      updateResult.update === true &&
                      updateResult.installed === true
                    ) {
                      setShow(true);
                      setCheckForUpdatesButtonText(t("gui-editor:overview.update.done"));
                    } else {
                      console.log(JSON.stringify(updateResult));
                      setCheckForUpdatesButtonText(t("gui-editor:overview.update.not.available"));
                    }
                  }}
                >
                  {checkForUpdatesButtonText}
                </button>
              </div>
              <div className="m-3">
                <Button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    const zipFilePath = await ucpBackEnd.openFileDialog(
                      currentFolder,
                      [
                        { name: 'Zip files', extensions: ['zip'] },
                        { name: 'All files', extensions: ['*'] },
                      ]
                    );

                    if (zipFilePath === '') return;

                    await ucpBackEnd.installUCPFromZip(
                      zipFilePath,
                      currentFolder
                    );

                    setShow(true);
                  }}
                >
                  {t("gui-editor:overview.install.from.zip")}
                </Button>
                <Modal show={show} onHide={handleClose} className="text-dark">
                  <Modal.Header closeButton>
                    <Modal.Title>{t("gui-general:require.reload.title")}</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    {t("gui-editor:overview.require.reload.text")}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      {t("gui-general:close")}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={(event) => {
                        handleClose();
                        ucpBackEnd.reloadWindow();
                      }}
                    >
                      {t("gui-general:reload")}
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
              <div className="m-3">
                <button type="button" className="btn btn-primary disabled">
                  {t("gui-editor:overview.uninstall")}
                </button>
              </div>
              <div className="m-3">
                <Button
                  onClick={(event) => {
                    ucpBackEnd.checkForGUIUpdates(setGuiUpdateStatus);
                  }}
                >
                  {t("gui-editor:overview.update.gui.check")}
                </Button>
                <span className="mx-1">{guiUpdateStatus}</span>
              </div>
              <Form className="m-3 d-none">
                <Form.Switch id="activate-ucp-switch" label="Activate UCP" />
              </Form>
            </Tab>
            <Tab eventKey="extensions" title={t("gui-editor:extensions.title")}>
              <ExtensionManager extensions={extensions} />
            </Tab>
            <Tab
              eventKey="config"
              title={t("gui-editor:config.title")}
              className="tabpanel-config"
            >
              <ConfigEditor readonly={false} gameFolder={currentFolder} />
            </Tab>
          </Tabs>

          <div className="fixed-bottom bg-primary">
            <div className="d-flex p-1 px-2 fs-8">
              <div className="flex-grow-1">
                <span className="">
                  {t("gui-editor:footer.folder")}
                  <span className="px-2 fst-italic">{currentFolder}</span>
                </span>
              </div>
              <div>
                <span className="px-2">{t("gui-general:messages", { count: 0 })}</span>
                <span className="px-2">{t("gui-general:warnings", { count: warningCount })}</span>
                <span className="px-2">{t("gui-general:errors", { count: errorCount })}</span>
                <span className="px-2">{t("gui-editor:footer.version.gui", { version: "1.0.0" })}</span>
                <span className="px-2">
                  {t("gui-editor:footer.version.ucp", {
                    version: isUCP3Installed
                      ? `${ucpVersion.major}.${ucpVersion.minor}.${ucpVersion.patch} - ${(ucpVersion.sha || '')
                        .substring(0, 8)}`
                      : t("gui-editor:footer.version.no.ucp")
                  })}
                </span>
                <span className="px-2">{t("gui-editor:footer.ucp.active", { active: isUCP3Installed })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlobalState.Provider>
  );
}
