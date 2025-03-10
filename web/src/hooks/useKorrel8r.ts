import { useEffect } from 'react';
import { listDomains } from '../korrel8r-client';
import * as React from 'react';

export const useKorrel8r = () => {
  const [isKorrel8rReachable, setIsKorrel8rReachable] = React.useState<boolean>(false);

  useEffect(() => {
    listDomains()
      .then(() => {
        setIsKorrel8rReachable(true);
      })
      .catch(() => {
        setIsKorrel8rReachable(false);
      });
  }, []);

  return {
    isKorrel8rReachable,
  };
};
