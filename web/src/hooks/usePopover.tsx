import { useOverlay } from '@openshift-console/dynamic-plugin-sdk';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Popover from '../components/Popover';
import { State } from '../redux-reducers';
import useAgentNavigation from './useAgentNavigation';

const usePopover = () => {
  const isOpen = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));

  const launchModal = useOverlay();
  useAgentNavigation();

  useEffect(() => {
    if (launchModal && isOpen) {
      launchModal?.(Popover, { title: 'Troubleshooting panel console plugin modal' });
    }
  }, [launchModal, isOpen]);

  useEffect(() => {
    // Log once on mount of troubleshooting component.
    // eslint-disable-next-line no-console
    console.debug(`troubleshooting: pop-over mounted ${new Date().toLocaleString()}`);
  }, []);

  return [];
};

export default usePopover;
