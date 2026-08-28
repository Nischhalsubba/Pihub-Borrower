import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import '../packages/ui/src/pihub-system.css';
import '../packages/ui/src/pihub-shell.css';
import '../packages/ui/src/pihub-auth.css';
import '../packages/ui/src/pihub-motion.css';
import { initMonitoring } from './services/monitoring';

initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
