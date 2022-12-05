import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ucpBackEnd } from 'function/fake-backend';
import { Tooltip } from 'react-bootstrap';

import './app.css';

import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import { useRecentFolders } from '../general/swr-hooks';

function LanguageSelect() {
  const [t] = useTranslation(['gui-general', 'gui-landing']);
  const { i18n } = useTranslation();

  return (
    <div>
      <select
        className="dark-dropdown"
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
      >
        <option value="de">{t('gui-landing:German')}</option>
        <option value="en">{t('gui-landing:English')}</option>
        <option value="fr">{t('gui-landing:French')}</option>
        <option value="ru">{t('gui-landing:Russian')}</option>
        <option value="po">{t('gui-landing:Polish')}</option>
        <option value="ch">{t('gui-landing:Chinese')}</option>
      </select>
    </div>
  );
}

function Landing() {
  const [landingState, setLandingState] = useState({
    lauchButton: false,
    browseResult: '',
  });
  const recentFolderResult = useRecentFolders();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  // needs better loading site
  if (recentFolderResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const recentFolderHelper = recentFolderResult.data as RecentFolderHelper;

  const updateCurrentFolderSelectState = (folder: string) => {
    recentFolderHelper.addToRecentFolders(folder);
    setLandingState({
      lauchButton: true,
      browseResult: folder,
    });
  };

  // set initial state
  if (
    !landingState.browseResult &&
    recentFolderHelper.getMostRecentGameFolder()
  ) {
    updateCurrentFolderSelectState(
      recentFolderHelper.getMostRecentGameFolder()
    );
  }

  return (
    <div className="h-100">
      <div data-tauri-drag-region className="titlebar" />
      <div className="background-image" />
      <div className="d-flex justify-content-end">
        <div className="language-select-container">
          <LanguageSelect />
        </div>
      </div>
      <div className="landingContainer">
        <div className="mb-5">
          <h1 className="mb-4" style={{ marginTop: 60 }}>
            {t('gui-landing:title')}
          </h1>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
          <div className="d-flex mt-2">
            <div className="textInput">
              <input
                id="browseresult"
                type="text"
                className="form-control"
                readOnly
                role="button"
                onClick={async () => {
                  const folder = await ucpBackEnd.openFolderDialog(
                    landingState.browseResult
                  );
                  if (folder !== undefined && folder.length > 0) {
                    updateCurrentFolderSelectState(folder);
                  }
                }}
                value={landingState.browseResult}
              />
            </div>
            <button
              id="launchbutton"
              type="button"
              className="launch-button"
              disabled={landingState.lauchButton !== true}
              onClick={() =>
                ucpBackEnd.createEditorWindow(landingState.browseResult)
              }
            >
              <div className="launchtext">{t('gui-landing:launch')}</div>
            </button>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-start">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label
            htmlFor="recentfolders"
            style={{ color: 'rgb(155, 155, 155)' }}
          >
            {t('gui-landing:old.folders')}
          </label>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            id="recentfolders"
            className="overflow-hidden mt-2 recent-folders"
            onClick={(event) => {
              const inputTarget = event.target as HTMLInputElement;
              if (inputTarget.textContent) {
                updateCurrentFolderSelectState(
                  inputTarget.textContent as string
                );
              }
            }}
          >
            {recentFolderHelper
              .getRecentGameFolders()
              .filter((_, index) => index !== 0)
              .map((recentFolder, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="px-2 file-selector list-group-item-action list-group-item-dark d-flex justify-content-between align-items-center"
                  role="button"
                  title={recentFolder}
                >
                  <div className="death90"> {recentFolder}</div>
                  <input
                    type="button"
                    style={{
                      width: '0.25em',
                      height: '0.25em',
                      color: 'white',
                    }}
                    className="btn-close btn-close-white"
                    aria-label="Close"
                    onClick={(event) => {
                      event.stopPropagation();
                      recentFolderHelper.removeFromRecentFolders(recentFolder);
                      updateCurrentFolderSelectState(
                        recentFolderHelper.getMostRecentGameFolder()
                      );
                    }}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [t] = useTranslation(['gui-landing']);

  return (
    <div className="vh-100 d-flex flex-column justify-content-center">
      <Landing key="landing" />
    </div>
  );
}
