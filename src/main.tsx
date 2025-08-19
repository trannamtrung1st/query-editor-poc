import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initMonacoEditor } from './utils/monaco-editor.ts'
import './index.scss'
import './index.css'
import App from './App.tsx'

await initMonacoEditor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
