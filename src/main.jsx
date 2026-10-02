import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./fonts.css";
import './index.css'
import './i18n/index.js';
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
       <App />
    </LanguageProvider>
   
  </StrictMode>,
)
