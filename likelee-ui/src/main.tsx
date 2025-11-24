import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import '@aws-amplify/ui-react/styles.css'
import '@aws-amplify/ui-react-liveness/styles.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
