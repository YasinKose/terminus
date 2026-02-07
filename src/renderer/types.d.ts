import { AppAction, ActionResult } from '../shared/types';

declare global {
  interface Window {
    api: {
      dispatch: (action: AppAction) => Promise<ActionResult<any>>;
    };
  }
}
