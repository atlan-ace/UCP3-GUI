import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  optionEntriesToHierarchical,
  uiCollectionToOptionEntries,
} from 'config/ucp/extension-util';
import { DisplayConfigElement, OptionEntry } from 'config/ucp/common';
import { atom, useAtomValue } from 'jotai';
import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { LANGUAGE_ATOM } from 'function/gui-settings/settings';
import { applyLocale } from 'function/extensions/discovery/discovery';
import { selectAtom } from 'jotai/utils';
import { ConsoleLogger } from 'util/scripts/logging';
import CreateUIElement from './CreateUIElement';
import CreateSection from './CreateSection';
import sanitizeID from '../sanitizeID';
import CreateSectionsNav from './CreateSectionsNav';

const ACTIVE_EXTENSIONS_ATOM = selectAtom(
  EXTENSION_STATE_REDUCER_ATOM,
  (state) => state.activeExtensions,
);

const LOCALIZED_UI_OPTION_ENTRIES_ATOM = atom((get) => {
  const extensions = get(ACTIVE_EXTENSIONS_ATOM);
  const language = get(LANGUAGE_ATOM);

  const euis = extensions.map((e) => {
    const locale = e.locales[language] ?? e.locales.en;
    if (locale === undefined) {
      return e.ui;
    }
    const localized = applyLocale(e, locale);
    return localized;
  });

  const uiCollection: any[] = [];
  euis.forEach((eui) => {
    uiCollection.push(...eui);
  });

  ConsoleLogger.debug('test');

  return uiCollectionToOptionEntries(uiCollection).filter(
    (o: OptionEntry) => o.hidden === undefined || o.hidden === false,
  );
});

const LOCALIZED_UI_HIERARCHICAL_ATOM = atom((get) =>
  optionEntriesToHierarchical(get(LOCALIZED_UI_OPTION_ENTRIES_ATOM)),
);

function CreateSections(args: { readonly: boolean }): {
  nav: ReactElement | null;
  content: ReactElement | null;
} {
  const optionEntries = useAtomValue(LOCALIZED_UI_OPTION_ENTRIES_ATOM);
  const definition = useAtomValue(LOCALIZED_UI_HIERARCHICAL_ATOM);
  const { readonly } = args;

  const [t] = useTranslation(['gui-editor']);

  if (optionEntries.length === 0) {
    return { nav: <CreateSectionsNav spec={definition} />, content: null };
    // // Display message that no config options can be displayed
    // return (
    //   // <h3
    //   //   style={{
    //   //     display: 'flex',
    //   //     justifyContent: 'center',
    //   //     alignItems: 'center',
    //   //     textAlign: 'center',
    //   //     minHeight: '85vh',
    //   //   }}
    //   // >
    //   //   No extensions are active, so there are no options to display! Go to
    //   //   the Extensions tab to activate an Extension.
    //   // </h3>
    //   // eslint-disable-next-line react/jsx-no-useless-fragment
    //   <></>
    // );
  }

  const elements = (definition.elements as DisplayConfigElement[]).map(
    (el: DisplayConfigElement) => (
      <CreateUIElement
        key={el.url}
        spec={el as DisplayConfigElement}
        disabled={readonly}
        className=""
      />
    ),
  );

  const children = Object.keys(definition.sections).map((key) => {
    const id = sanitizeID(`config-${key}`);
    return (
      <CreateSection
        key={id}
        level={1}
        header={key}
        contents={definition.sections[key]}
        identifier={id}
        readonly={readonly}
      />
    );
  });

  // https://getbootstrap.com/docs/5.0/components/scrollspy/#list-item-4
  return {
    nav: <CreateSectionsNav spec={definition} />,
    content: (
      <div
        // data-bs-spy="scroll"
        // data-bs-target="#config-navbar"
        // data-bs-offset="0"
        // // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        // tabIndex={0}
        id="config-sections"
      >
        <div id="config-general">
          <h1>{t('gui-editor:config.general')}</h1>
          {elements}
        </div>
        <div>{children}</div>
      </div>
    ),
  };
}

export default CreateSections;
