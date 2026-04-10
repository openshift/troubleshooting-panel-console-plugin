import { useOverlay } from '@openshift-console/dynamic-plugin-sdk';

import { useSelector } from 'react-redux';
import Popover from '../components/Popover';
import { State } from '../redux-reducers';
import { useEffect } from 'react';

const usePopover = () => {
  const isOpen = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));

  const launchModal = useOverlay();

  useEffect(() => {
    if (launchModal && isOpen) {
      launchModal?.(Popover, { title: 'Troubleshooting panel console plugin modal' });
    }
  }, [launchModal, isOpen]);

  return [];
};

export default usePopover;
