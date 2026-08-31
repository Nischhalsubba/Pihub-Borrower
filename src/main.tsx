import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './roadmap-completion.css';
import '../packages/ui/src/pihub-system.css';
import '../packages/ui/src/pihub-shell.css';
import '../packages/ui/src/pihub-auth.css';
import '../packages/ui/src/pihub-motion.css';
import '../packages/ui/src/pihub-onboarding.css';
import '../packages/ui/src/pihub-tour-overlay.css';
import '../packages/ui/src/pihub-audit.css';
import { initMonitoring } from './services/monitoring';

initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
