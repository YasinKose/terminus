import { AppAction, ActionResult } from '../../shared/types.js';

export async function handleAction(action: AppAction): Promise<ActionResult<any>> {
  try {
    switch (action.type) {
      case 'PING':
        return { success: true, data: 'PONG' };
      case 'GET_APP_INFO':
        return { success: true, data: { version: '1.0.0' } };
      default:
        throw new Error(`Unknown action: ${(action as any).type}`);
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
