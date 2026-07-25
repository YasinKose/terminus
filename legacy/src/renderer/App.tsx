import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Check if api exists (it should, but safety first or just assume it's there per types)
    if (window.api) {
      window.api.dispatch({ type: 'PING', payload: null })
        .then((res: any) => console.log('Ping result:', res))
        .catch((err: any) => console.error('Ping error:', err));
    }
  }, []);

  return (
    <div>
      <h1>Hello Electron + React 19</h1>
      <p>Check console for Ping result</p>
    </div>
  );
}

export default App;
