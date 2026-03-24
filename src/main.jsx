import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGate from './AuthGate';
import App from './App';
import Portal from './Portal';
import './styles/tokens.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate portalApp={<Portal />}>
      <App />
    </AuthGate>
  </React.StrictMode>
);
