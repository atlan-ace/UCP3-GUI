// eslint-disable-next-line max-classes-per-file
import type { FileEntry } from '@tauri-apps/api/fs';
import { readTextFile, readDir } from '@tauri-apps/api/fs';
import yaml from 'yaml';
import JSZip from 'jszip';
import { proxyFsExists, readBinaryFile } from '../../renderer/utils/file-utils';

import {
  ConfigEntry,
  Definition,
  Extension,
  OptionEntry,
} from '../../common/config/common';

const localeSensitiveFields = [
  'description',
  'text',
  'tooltip',
  'header',
  'choices',
];
const localeRegExp = /^\s*{{(.*)}}\s*$/;

async function readUISpec(
  eh: ExtensionHandle
): Promise<{ [key: string]: unknown }[]> {
  if (await eh.doesEntryExist('ui.yml')) {
    return yaml.parse(await eh.getTextContents('ui.yml'));
  }
  return [];
}

async function readConfig(
  eh: ExtensionHandle
): Promise<{ [key: string]: unknown }> {
  if (await eh.doesEntryExist('config.yml')) {
    return yaml.parse(await eh.getTextContents('config.yml'));
  }
  return {};
}

function changeLocaleOfObj(
  locale: { [key: string]: string },
  obj: { [key: string]: string }
) {
  Object.entries(obj).forEach(([k, v]) => {
    if (typeof v === 'string') {
      const search = localeRegExp.exec(v);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          obj[k] = loc;
        }
      }
    } else if (typeof v === 'object') {
      changeLocaleOfObj(locale, obj[k] as unknown as { [key: string]: string });
    }
  });
}

function changeLocale(
  locale: { [key: string]: string },
  obj: { [key: string]: unknown }
): void {
  localeSensitiveFields.forEach((field) => {
    if (typeof obj[field] === 'string') {
      const search = localeRegExp.exec(obj[field] as string);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          obj[field] = loc;
        }
      }
    }
    if (typeof obj[field] === 'object') {
      changeLocaleOfObj(locale, obj[field] as { [key: string]: string });
    }
  });

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof obj[key] === 'object') {
      changeLocale(locale, value as { [key: string]: unknown });
    }
  });
}

async function setLocale(
  eh: ExtensionHandle,
  ext: Extension,
  language: string
): Promise<void> {
  if (await eh.doesEntryExist('locale')) {
    if (await eh.doesEntryExist(`locale/${language}.yml`)) {
      const locale = yaml.parse(
        await eh.getTextContents(`locale/${language}.yml`)
      );

      ext.ui.forEach((uiElement) => {
        changeLocale(locale, uiElement as { [key: string]: unknown });
      });
    }
  }
}

function collectOptionEntries(
  obj: { [key: string]: unknown },
  extensionName: string,
  collection?: { [key: string]: OptionEntry }
) {
  // eslint-disable-next-line no-param-reassign
  if (collection === undefined) collection = {};

  if (typeof obj === 'object') {
    if (obj.url !== undefined) {
      const oeObj = obj as OptionEntry;
      if (collection[oeObj.url] !== undefined) {
        throw new Error(`url already has a value: ${oeObj.url}`);
      }
      let colURL = oeObj.url;
      if (colURL.indexOf(`${extensionName}.`) !== 0) {
        colURL = `${extensionName}.${colURL}`;
      }
      // eslint-disable-next-line no-param-reassign
      collection[colURL] = oeObj;
    } else {
      Object.keys(obj).forEach((key: string) => {
        collectOptionEntries(
          obj[key] as { [key: string]: unknown },
          extensionName,
          collection
        );
      });
    }
  }
  return collection;
}

function collectConfigEntries(
  obj: { value: unknown; [key: string]: unknown },
  url?: string,
  collection?: { [key: string]: ConfigEntry }
) {
  // eslint-disable-next-line no-param-reassign
  if (collection === undefined) collection = {};
  // eslint-disable-next-line no-param-reassign
  if (url === undefined) url = '';

  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    if (obj.value !== undefined) {
      const o = obj as ConfigEntry;
      if (collection[url] !== undefined) {
        throw new Error(`url already has a value: ${url}`);
      }
      // eslint-disable-next-line no-param-reassign
      collection[url] = o;
    } else {
      Object.keys(obj).forEach((key) => {
        let newUrl = url;
        if (newUrl === undefined) newUrl = '';
        if (newUrl !== '') {
          newUrl += '.';
        }
        newUrl += key;
        collectConfigEntries(
          obj[key] as { value: unknown; [key: string]: unknown },
          newUrl,
          collection
        );
      });
    }
  }

  return collection;
}

const LOCALE_FILES: { [lang: string]: string } = {
  en: 'English',
  de: 'German',
};

interface ExtensionHandle {
  path: string;
  getTextContents(path: string): Promise<string>;
  getBinaryContents(path: string): Promise<Uint8Array>;
  doesEntryExist(path: string): Promise<boolean>;
}

class ZipExtensionHandle implements ExtensionHandle {
  zip: JSZip;

  path: string;

  constructor(path: string, zip: JSZip) {
    this.zip = zip;
    this.path = path;
  }

  static async fromPath(path: string) {
    // Do hash check here!
    const [data, error] = await readBinaryFile(path);

    if (error) {
      throw new Error(`Could not read zip file: ${path}: ${error}`);
    }

    if (data !== undefined && data instanceof Uint8Array) {
      const zip = await JSZip.loadAsync(data as Uint8Array, {
        createFolders: true,
      });
      return new ZipExtensionHandle(path, zip);
    }
    throw new Error(`Could not read zip file: ${path}: ${error}`);
  }

  async doesEntryExist(path: string) {
    const f = this.zip.file(path);
    return f !== undefined && f !== null;
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    const f = this.zip.file(path);
    if (f !== undefined && f !== null) {
      const result = await f.async<'uint8array'>('uint8array');
      if (result !== undefined) {
        return result;
      }
      throw new Error(`${path} contents is undefined`);
    }
    throw new Error(`${path} not found`);
  }

  async getTextContents(path: string) {
    const f = this.zip.file(path);
    if (f !== undefined && f !== null) {
      const result = await f.async<'string'>('string');
      if (result !== undefined) {
        return result;
      }
      throw new Error(`${path} contents is undefined`);
    }
    throw new Error(`${path} not found`);
  }
}

class DirectoryExtensionHandle implements ExtensionHandle {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  async doesEntryExist(path: string): Promise<boolean> {
    const p = `${this.path}/${path}`;
    return proxyFsExists(p);
  }

  async getTextContents(path: string): Promise<string> {
    const p = `${this.path}/${path}`;
    if (await proxyFsExists(p)) {
      const result = await readTextFile(p);
      if (result === undefined) {
        throw new Error(`Error while reading text file: ${p}`);
      }
      return result;
    }
    throw new Error(`${p} not found`);
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    const p = `${this.path}/${path}`;
    if (await proxyFsExists(p)) {
      const [result, error] = await readBinaryFile(p);
      if (error !== undefined) {
        throw new Error(
          `Error while reading binary file: ${p}. Error: ${error}`
        );
      }
      if (result instanceof Uint8Array) {
        return result;
      }
      throw new Error(`${p} contents is unexpected type`);
    }
    throw new Error(`${p} not found`);
  }
}

async function getExtensionHandles(ucpFolder: string) {
  const moduleDir = `${ucpFolder}/modules`;
  const modDirEnts = (await proxyFsExists(moduleDir))
    ? await readDir(moduleDir)
    : [];

  const pluginDir = `${ucpFolder}/plugins`;
  const pluginDirEnts = (await proxyFsExists(pluginDir))
    ? await readDir(pluginDir)
    : [];

  const de: FileEntry[] = [...modDirEnts, ...pluginDirEnts].filter(
    (fe) =>
      (fe.name || '').endsWith('.zip') ||
      (fe.children !== null && fe.children !== undefined)
  );
  const den = de.map((f) => f.name);
  const dirEnts = de.filter((e) => {
    // Zip files supersede folders
    if (e.children !== null && e.children !== undefined) {
      if (den.indexOf(`${e.name}.zip`) !== -1) {
        return false;
      }
    }
    return true;
  });

  const exts = await Promise.all(
    dirEnts.map(async (fe: FileEntry) => {
      const type = modDirEnts.indexOf(fe) === -1 ? 'plugin' : 'module';

      const folder =
        type === 'module'
          ? `${ucpFolder}/modules/${fe.name}`
          : `${ucpFolder}/plugins/${fe.name}`;

      if (fe.name !== undefined && fe.name.endsWith('.zip')) {
        // Do hash check here!
        const result = await ZipExtensionHandle.fromPath(folder);
        return result as ExtensionHandle;
      }
      if (fe.children !== null) {
        // fe is a directory
        return new DirectoryExtensionHandle(folder) as ExtensionHandle;
      }
      throw new Error(`${folder} not a valid extension directory`);
    })
  );

  return exts;
}

const Discovery = {
  discoverExtensions: async (
    gameFolder: string,
    locale?: string
  ): Promise<Extension[]> => {
    console.log(`Discovering extensions`);
    const currentLocale =
      locale === undefined ? 'English' : LOCALE_FILES[locale]; // Dummy location for this code

    const ehs = await getExtensionHandles(`${gameFolder}/ucp/`);

    return Promise.all(
      ehs.map(async (eh) => {
        const type = eh.path.indexOf('/modules/') ? 'module' : 'plugin';
        const definition = yaml.parse(
          await eh.getTextContents(`definition.yml`)
        );
        const { name, version } = definition;

        definition.dependencies = definition.depends || [];

        const ext = {
          name,
          version,
          type,
          definition,
        } as unknown as Extension;

        ext.ui = await readUISpec(eh);
        await setLocale(eh, ext, currentLocale);
        ext.config = await readConfig(eh);

        ext.optionEntries = collectOptionEntries(
          ext.ui as unknown as { [key: string]: unknown },
          ext.name
        );

        ext.configEntries = {
          ...collectConfigEntries(
            ext.config.modules as { [key: string]: unknown; value: unknown }
          ),
          ...collectConfigEntries(
            ext.config.plugins as { [key: string]: unknown; value: unknown }
          ),
        };

        return ext;
      })
    );
  },
};

// eslint-disable-next-line import/prefer-default-export
export { Discovery };
