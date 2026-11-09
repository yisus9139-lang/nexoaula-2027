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
        <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0A0A0A] border border-[#262626] rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <h1 className="text-base font-extrabold tracking-tight">NexoAula 2027</h1>
            <p className="text-xs text-neutral-400">
              Ocurrió un error inesperado al cargar la interfaz. Pulsa el botón para restablecer la vista.
            </p>
            {this.state.error && (
              <pre className="text-left text-[10px] text-red-400 bg-black/60 p-3 rounded-xl overflow-x-auto max-h-32 font-mono whitespace-pre-wrap">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold transition-all"
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
