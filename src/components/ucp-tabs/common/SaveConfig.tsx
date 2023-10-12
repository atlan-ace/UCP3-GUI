import { Extension } from 'config/ucp/common';
import { saveUCPConfig } from 'config/ucp/config-files';
import { ConfigurationQualifier } from 'function/global/types';
import { ConsoleLogger } from 'util/scripts/logging';

function saveConfig(
  configuration: { [key: string]: unknown },
  folder: string,
  touched: { [key: string]: boolean },
  sparseExtensions: Extension[],
  allExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  const sparseConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key]),
  );

  const fullConfig = configuration;

  ConsoleLogger.debug(`Saving config: `, configuration);

  return saveUCPConfig(
    sparseConfig,
    fullConfig,
    sparseExtensions,
    allExtensions,
    folder,
    configurationQualifier,
  );
}

export default saveConfig;
