import * as React from 'react';
import { useBoolean } from './useBoolean';

export const usePluginAvailable = (pluginName: string): [boolean, boolean] => {
  const [isPluginAvailable, togglePluginAvailable] = useBoolean(false);
  const [loading, toggleLoading] = useBoolean(true);

  React.useEffect(() => {
    fetch(`/api/plugins/${pluginName}/plugin-manifest.json`)
      .then((response) => {
        return response.status === 200 && togglePluginAvailable();
      })
      .finally(toggleLoading);
  }, [togglePluginAvailable, pluginName, toggleLoading]);

  return [isPluginAvailable, loading];
};
