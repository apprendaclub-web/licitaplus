import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import UploadPdf from './components/UploadPdf'
import TenderList from './components/TenderList'
import { LogOut, LayoutDashboard } from 'lucide-react'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [refreshList, setRefreshList] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleUploadSuccess = () => {
    // Incrementa para forçar re-render na lista
    setRefreshList(prev => prev + 1)
  }

  return (
    <div className="app-container">
      {!session ? (
        <Auth />
      ) : (
        <div className="dashboard">
          <header className="dashboard-header">
            <div className="logo">
              <LayoutDashboard className="text-primary" />
              <h1>LicitaPlus</h1>
            </div>
            
            <div className="user-menu">
              <span className="user-email">{session.user.email}</span>
              <button onClick={handleLogout} className="btn-icon" title="Sair">
                <LogOut size={20} />
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            <UploadPdf user={session.user} onUploadSuccess={handleUploadSuccess} />
            <TenderList refreshTrigger={refreshList} />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
