import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function UploadExcelModal({ isOpen, onClose, onSuccess, currentUser, apiBase }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const fileInputRef = useRef(null);

  const finalApiBase =
    apiBase ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : '');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setErrorMsg('');
    setResultMsg('');
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.xlsx')) {
        setErrorMsg(
          'Formato no compatible. Sube un archivo Excel (.xlsx) con las columnas requeridas.'
        );
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Selecciona un archivo .xlsx antes de continuar.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setResultMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const reqHeaders = {};
      if (currentUser?.id) reqHeaders['X-Usuario-Id'] = String(currentUser.id);
      if (currentUser?.session_token) {
        reqHeaders['X-Session-Token'] = String(currentUser.session_token);
      }

      const response = await fetch(`${finalApiBase}/upload-excel`, {
        method: 'POST',
        headers: reqHeaders,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail || 'Ocurrió un problema al procesar el archivo Excel.'
        );
      }

      setResultMsg(data.mensaje);
      setFile(null);
      onSuccess(data.mensaje);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#005FB8]" />
              Importar Padrón Escolar (.xlsx)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sincroniza la lista oficial de estudiantes para auditar en terreno
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="py-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <p className="font-semibold text-slate-900">
              Columnas requeridas en el archivo Excel:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['nombres', 'apellidos', 'grado', 'grupo', 'sede'].map((col) => (
                <code
                  key={col}
                  className="px-2 py-0.5 rounded bg-white text-slate-900 border border-slate-200 font-mono text-[11px]"
                >
                  {col}
                </code>
              ))}
            </div>
          </div>

          {/* Zona de Selección de Archivo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#005FB8] rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#F8F8F8] hover:bg-slate-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-[#005FB8] mx-auto mb-2" />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar archivo
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Haz clic para elegir tu archivo <span className="text-[#005FB8] font-semibold">.xlsx</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Se añadirán los nuevos estudiantes sin borrar las auditorías ya completadas
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resultMsg}</span>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-[#005FB8] hover:bg-[#004C94] text-white shadow-md transition-all disabled:opacity-40"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando padrón...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir e Importar Datos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
