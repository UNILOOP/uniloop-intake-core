import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Components render into a DOM; React's act() needs this flag to flush updates
GlobalRegistrator.register();
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
