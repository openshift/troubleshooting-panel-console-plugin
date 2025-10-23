import { Map as ImmutableMap } from 'immutable';

import { ActionType, TPAction, defaultSearch } from './redux-actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TPState = ImmutableMap<string, any>;

export type State = {
  observe: TPState;
  plugins: {
    tp: TPState;
  };
};

const reducer = (state: TPState, action: TPAction): TPState => {
  if (!state) {
    return ImmutableMap({
      isOpen: false,
      persistedSearch: defaultSearch,
    });
  }

  switch (action.type) {
    case ActionType.CloseTroubleshootingPanel:
      return state.set('isOpen', false);

    case ActionType.OpenTroubleshootingPanel:
      return state.set('isOpen', true);

    case ActionType.SetPersistedSearch:
      return state.set('persistedSearch', action.payload);

    default:
      break;
  }
  return state;
};

export default reducer;
