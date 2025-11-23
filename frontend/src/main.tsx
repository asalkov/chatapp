import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { store } from './store'
import './index.css'
import App from './App.tsx'
import InvitationAccept from './components/InvitationAccept'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/invite/:token" element={<InvitationAccept />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
