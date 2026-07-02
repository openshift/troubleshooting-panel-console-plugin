import { createContext, FC, PropsWithChildren } from 'react';
import AgentNotification from './AgentNotification';

const NullContext = createContext(null);

const NullContextProvider: FC<PropsWithChildren<{ value?: unknown }>> = ({ children, value }) => (
  <NullContext.Provider value={value}>
    {children}
    <AgentNotification />
  </NullContext.Provider>
);

export default NullContextProvider;
