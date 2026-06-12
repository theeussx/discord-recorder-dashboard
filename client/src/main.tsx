import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <h1>Discord Recorder Dashboard</h1>
      <p>Client bundle minimal entry.</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
