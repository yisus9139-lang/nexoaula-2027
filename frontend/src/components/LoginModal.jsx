import React, { useState } from 'react';
import {
  KeyRound,
  LogIn,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';

export default function LoginModal({
  isOpen,
  onLogin,
  onRecoverAdminPin,
  error,
  loading,
}) {
  const [pin, setPin] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // Estado para recuperación de Coordinador (Admin)
  const [llaveMaestra, setLlaveMaestra] = useState('');
  const [nuevoPinAdmin, setNuevoPinAdmin] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);

  if (!isOpen) return null;

  const handlePinChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    if (clean.length === 4 && !loading) {
      onLogin({ pin_acceso: clean });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.trim().length !== 4) return;
    onLogin({ pin_acceso: pin.trim() });
  };

  const handleRecoverSubmit = async (e) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');

    if (!llaveMaestra.trim() || nuevoPinAdmin.trim().length !== 4) {
      setRecoverError(
        'Ingresa la Llave Maestra del Colegio y elige un nuevo PIN de 4 dígitos.'
      );
      return;
    }

    setRecoverLoading(true);
    try {
      const data = await onRecoverAdminPin({
        llave_maestra: llaveMaestra.trim(),
        nuevo_pin: nuevoPinAdmin.trim(),
      });
      setRecoverSuccess(data.mensaje);
    } catch (err) {
      setRecoverError(err.message);
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl">
        {/* Identidad Visual */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#005FB8]/10 text-[#005FB8] flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            NexoAula 2027
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {showForgot
              ? 'Recuperación de acceso para Terreno y Coordinación'
              : 'Ingresa tu PIN de 4 dígitos para entrar directamente a tu ruta'}
          </p>
        </div>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 text-center mb-2.5">
                  PIN Personal de Acceso
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="••••"
                    className="w-full bg-[#F8F8F8] border-2 border-slate-200 focus:border-[#005FB8] rounded-2xl py-4 text-center text-2xl font-extrabold tracking-[0.6em] text-slate-900 placeholder-slate-300 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Al escribir los 4 números entrarás automáticamente
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full min-h-[48px] rounded-xl bg-[#005FB8] hover:bg-[#004C94] disabled:opacity-40 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Verificando PIN...' : 'Entrar'}
              </button>
            </form>

            {/* Enlace discreto ¿Olvidaste tu PIN? */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setRecoverError('');
                  setRecoverSuccess('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#005FB8] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                ¿Olvidaste tu PIN?
              </button>
            </div>
          </>
        ) : (
          /* Vista de Recuperación de PIN */
          <div className="space-y-5">
            {/* Opción 1: Si eres Auditor */}
            <div className="p-4 rounded-2xl bg-[#F8F8F8] border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <MessageCircle className="w-4 h-4 text-[#005FB8]" />
                ¿Eres Funcionario Auditor?
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pídele a tu Coordinador que revise o te reenvíe tu PIN por WhatsApp desde el panel de <strong className="text-slate-900">Equipo y Rutas</strong>.
              </p>
            </div>

            {/* Opción 2: Si eres Coordinador (Admin) */}
            <form
              onSubmit={handleRecoverSubmit}
              className="p-4 rounded-2xl bg-[#F8F8F8] border border-slate-200 space-y-3.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldAlert className="w-4 h-4 text-[#005FB8]" />
                ¿Eres Coordinador (Admin)? Restablece tu PIN
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Llave Maestra del Colegio
                </label>
                <input
                  type="password"
                  value={llaveMaestra}
                  onChange={(e) => setLlaveMaestra(e.target.value)}
                  placeholder="Ej. NEXO-RECTORIA"
                  className="w-full bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Elige tu Nuevo PIN de 4 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={nuevoPinAdmin}
                  onChange={(e) =>
                    setNuevoPinAdmin(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                  placeholder="Ej. 9999"
                  className="w-full bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {recoverError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{recoverError}</span>
                </div>
              )}

              {recoverSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{recoverSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={recoverLoading}
                className="w-full min-h-[42px] rounded-xl bg-[#005FB8] hover:bg-[#004C94] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
              >
                {recoverLoading
                  ? 'Actualizando PIN...'
                  : 'Actualizar PIN y Entrar'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al teclado de PIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
