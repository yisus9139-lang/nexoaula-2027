import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('NexoAula ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('nexoaula_user');
    } catch {
      // Ignorar
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F8F8] text-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900">NexoAula 2027</h1>
            <p className="text-xs text-slate-600">
              Ocurrió un error inesperado al cargar la interfaz. Pulsa el botón para restablecer la vista.
            </p>
            {this.state.error && (
              <pre className="text-left text-[10px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 overflow-x-auto max-h-32 font-mono whitespace-pre-wrap">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#005FB8] hover:bg-[#004C94] text-white text-xs font-bold transition-all"
            >
              Reiniciar sesión y recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
