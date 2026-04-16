import { Map as ImmutableMap } from 'immutable';

import { ActionType, TPAction, defaultSearch } from './redux-actions';

export type TPState = ImmutableMap<string, any>;

export type State = {
  observe: TPState;
  plugins: {
    tp: TPState;

    mp: any;
  };
};

const reducer = (state: TPState, action: TPAction): TPState => {
  if (!state) {
    return ImmutableMap({
      isOpen: false,
      search: defaultSearch,
    });
  }

  switch (action.type) {
    case ActionType.CloseTroubleshootingPanel:
      return state.set('isOpen', false);

    case ActionType.OpenTroubleshootingPanel:
      return state.set('isOpen', true);

    case ActionType.SetSearch:
      return state.set('search', action.payload);

    default:
      break;
  }
  return state;
};

export default reducer;
