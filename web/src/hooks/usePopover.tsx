import { useOverlay } from '@openshift-console/dynamic-plugin-sdk';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Popover from '../components/Popover';
import { State } from '../redux-reducers';
import useKorrel8r from './useKorrel8r';

const usePopover = () => {
  const isOpen = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));
  const launchModal = useOverlay();
  useKorrel8r();

  useEffect(() => {
    if (launchModal && isOpen) {
      launchModal?.(Popover, { title: 'Troubleshooting panel console plugin modal' });
    }
  }, [launchModal, isOpen]);

  return [];
};

export default usePopover;
