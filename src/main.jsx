import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import './workspaces.css';
import './ocean.css';
import './superset.css';
import './dynamic.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
