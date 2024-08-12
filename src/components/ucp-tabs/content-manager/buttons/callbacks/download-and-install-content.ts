import { createDir } from '@tauri-apps/api/fs';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { download } from '../../../../../tauri/tauri-http';
import Logger from '../../../../../util/scripts/logging';
import { showModalOk } from '../../../../modals/modal-ok';
import { ContentInstallationStatus } from '../../state/downloads/download-progress';
import { installPlugin } from '../../../../../function/extensions/installation/install-module';
import { onFsExists, removeFile } from '../../../../../tauri/tauri-files';
import { contentInstallationStatusAtoms } from '../../state/atoms';

const LOGGER = new Logger('download-button.tsx');

const guessTotalSize = (currentSize: number) => {
  const steps = [
    1000 * 500,

    1000 * 1000 * 10,

    1000 * 1000 * 100,

    1000 * 1000 * 500,

    1000 * 1000 * 1000,
  ];

  // eslint-disable-next-line no-restricted-syntax
  for (const step of steps) {
    if (currentSize < step) {
      return step;
    }
  }

  return steps.at(-1)!;
};

export const downloadAndInstallPlugin = async (
  contentElement: ContentElement,
) => {
  const id = `${contentElement.definition.name}@${contentElement.definition.version}`;

  const zipSources = contentElement.contents.package.filter(
    (pc) => pc.method === 'github-zip',
  );

  const setStatus = (value: ContentInstallationStatus) =>
    getStore().set(contentInstallationStatusAtoms(id), value);

  if (zipSources.length === 0) {
    setStatus({
      action: 'error',
      message: `No zip package found for this content`,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
  }

  const src = zipSources.at(0)!;

  const gameFolder = getStore().get(GAME_FOLDER_ATOM);

  const cacheDir = `${gameFolder}/ucp/.cache/`;
  if (!(await onFsExists(cacheDir))) {
    LOGGER.msg(`.cache directory doesn't exist, creating it!`).warn();
    await createDir(cacheDir);
  }

  const destination = `${cacheDir}${contentElement.definition.name}-${contentElement.definition.version}.zip`;

  LOGGER.msg(
    `Downloading ${contentElement.definition.name} from ${src.url} to ${destination}`,
  ).debug();

  await download(
    src.url,
    destination,
    (
      chunkSize: number,
      currentSize: number,
      totalSize: number,
      currentPercent: string,
    ) => {
      let percentage = parseFloat(currentPercent.replaceAll('%', ''));
      if (Number.isNaN(percentage)) {
        if (src.size && src.size > 0) {
          percentage = 100 * (currentSize / src.size);
        } else {
          // eslint-disable-next-line no-param-reassign
          totalSize = guessTotalSize(currentSize);
          percentage = 100 * (currentSize / totalSize);
        }
      }

      setStatus({
        action: 'download',
        progress: Math.floor(percentage),
        name: contentElement.definition.name,
        version: contentElement.definition.version,
      });
    },
  );

  setStatus({
    action: 'download',
    progress: 100,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  LOGGER.msg(
    `Installing ${contentElement.definition.name} from ${destination} into ${gameFolder}/ucp/plugins`,
  ).debug();

  setStatus({
    action: 'install',
    progress: 30, // Start at 10%
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  try {
    await installPlugin(gameFolder, destination, {
      zapRootFolder: true,
    });
  } catch (e: any) {
    setStatus({
      action: 'error',
      message: e.toString(),
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
  }

  setStatus({
    action: 'install',
    progress: 60,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  LOGGER.msg(`Removing ${destination}`).debug();
  const removeResult = await removeFile(destination);

  if (removeResult.isErr()) {
    setStatus({
      action: 'error',
      message: JSON.stringify(removeResult.err().get()),
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
  }

  setStatus({
    action: 'install',
    progress: 100,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });
};

// eslint-disable-next-line import/prefer-default-export
export const downloadContent = async (contentElements: ContentElement[]) => {
  LOGGER.msg(
    `Downloading: ${contentElements.map((ce) => ce.definition.name).join(', ')}`,
  ).debug();

  const contentElementsWithoutPackageSource = contentElements.filter(
    (ce) => ce.contents.package.length === 0,
  );

  if (contentElementsWithoutPackageSource.length > 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `Some content doesn't have a download source: ${contentElementsWithoutPackageSource.map((ce) => ce.definition.name).join(', ')}`,
    });

    return;
  }

  const modules = contentElements.filter(
    (ce) => ce.definition.type === 'module',
  );

  if (modules.length > 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `Some content are modules, installing modules is not implemented yet: ${modules.map((ce) => ce.definition.name).join(', ')}`,
    });

    return;
  }

  const plugins = contentElements.filter(
    (ce) => ce.definition.type === 'plugin',
  );

  if (plugins.length === 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `No content to install`,
    });

    return;
  }

  plugins.forEach(async (plugin) => {
    const id = `${plugin.definition.name}@${plugin.definition.version}`;
    const setStatus = (value: ContentInstallationStatus) =>
      getStore().set(contentInstallationStatusAtoms(id), value);
    setStatus({
      action: 'download',
      progress: 0,
      name: plugin.definition.name,
      version: plugin.definition.version,
    });

    await downloadAndInstallPlugin(plugin);

    // eslint-disable-next-line no-param-reassign
    plugin.installed = true;

    setStatus({
      action: 'idle',
      name: plugin.definition.name,
      version: plugin.definition.version,
    });
  });
};
