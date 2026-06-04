import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Declaracoes from './components/Declaracoes'
import Propostas from './components/Propostas'
import Gestao from './components/Gestao'
import { LogOut, Diamond } from 'lucide-react'
import './index.css'
import './licita-theme.css'

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('Declarações')

  const tabs = ['Declarações', 'Propostas', 'Gestão']

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

  return (
    <div className="app-container">
      {!session ? (
        <Auth />
      ) : (
        <>
          <header className="dashboard-header">
            <div className="header-top">
              <div className="logo">
                <Diamond className="text-primary" size={28} />
                <h1>LicitaPlus</h1>
              </div>
              
              <div className="user-menu">
                <span className="user-email">{session.user.email}</span>
                <button onClick={handleLogout} className="btn-icon" title="Sair do sistema">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
            
            <nav className="nav-tabs">
              {tabs.map(tab => (
                <button 
                  key={tab}
                  className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </header>

          <main className="dashboard-main">
            {activeTab === 'Declarações' ? (
              <Declaracoes session={session} />
            ) : activeTab === 'Propostas' ? (
              <Propostas session={session} />
            ) : activeTab === 'Gestão' ? (
              <Gestao session={session} />
            ) : (
              <div className="card empty-state">
                <Diamond size={48} className="text-primary" style={{opacity: 0.5}} />
                <h3>Módulo em Desenvolvimento</h3>
                <p className="text-muted">A área de {activeTab} estará disponível nas próximas atualizações do LicitaPlus.</p>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  )
}

export default App
