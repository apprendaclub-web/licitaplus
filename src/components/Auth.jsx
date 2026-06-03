import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    let error
    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      error = signInError
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      error = signUpError
      if (!error) {
        alert('Cadastro realizado! Verifique seu email para confirmar.')
      }
    }

    if (error) {
      alert(error.error_description || error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Entrar no LicitaPlus' : 'Criar uma Conta'}</h2>
        <p className="auth-subtitle">
          {isLogin 
            ? 'Acesse o portal para gerenciar editais' 
            : 'Cadastre-se para começar a extrair dados de editais'}
        </p>
        
        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
          <button 
            type="button" 
            className="btn-link" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
