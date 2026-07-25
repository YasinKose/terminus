export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AppAction =
  | { type: 'PING'; payload: null }
  | { type: 'GET_APP_INFO'; payload: null };
