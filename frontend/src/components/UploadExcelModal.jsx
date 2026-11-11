import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function UploadExcelModal({ isOpen, onClose, onSuccess, currentUser, apiBase, corteId }) {
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

      const baseUrl = finalApiBase || (typeof window !== 'undefined' ? window.location.origin : '');
      const uploadUrl = new URL(
        `${baseUrl}/upload-excel`,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'
      );
      if (corteId) {
        uploadUrl.searchParams.append('corte_id', String(corteId));
      }
      if (currentUser?.id) {
        uploadUrl.searchParams.append('admin_id', String(currentUser.id));
      }

      const response = await fetch(uploadUrl.toString(), {
        method: 'POST',
        headers: reqHeaders,
        body: formData,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // Fallback si la respuesta no viene en formato JSON
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          (response.status === 504 || response.status === 502
            ? 'El servidor tardó en procesar la importación. Espera unos segundos y recarga la página para verificar los datos importados.'
            : `Error del servidor (${response.status}).`)
        );
      }

      setResultMsg(data.mensaje);
      setFile(null);
      onSuccess(data.mensaje);
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
        setErrorMsg(
          'No se pudo conectar con el servidor. Si el servicio en Render estaba en reposo (plan gratuito), espera unos 30 segundos mientras despierta y vuelve a hacer clic en Subir e Importar Datos.'
        );
      } else {
        setErrorMsg(err.message || 'Error al conectar con el servidor.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-white" />
              Importar Padrón Escolar (.xlsx)
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Sincroniza la lista oficial de estudiantes para auditar en terreno
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="py-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#000000] border border-[#262626] text-xs text-neutral-300 space-y-1.5">
            <p className="font-semibold text-white">
              Columnas requeridas en el archivo Excel:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['nombres', 'apellidos', 'grado', 'grupo', 'sede'].map((col) => (
                <code
                  key={col}
                  className="px-2 py-0.5 rounded bg-[#141414] text-white border border-[#333333] font-mono text-[11px]"
                >
                  {col}
                </code>
              ))}
            </div>
          </div>

          {/* Zona de Selección de Archivo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#333333] hover:border-white rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#000000]/60 hover:bg-[#121212]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-white mx-auto mb-2" />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-white">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB • Haz clic para cambiar archivo
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  Haz clic para elegir tu archivo <span className="text-white font-semibold">.xlsx</span>
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Se añadirán los nuevos estudiantes sin borrar las auditorías ya completadas
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#141414] border border-[#404040] text-xs text-white">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#171717] border border-white/40 text-xs text-white">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span>{resultMsg}</span>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F1F1F]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#171717] transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-[#000000] shadow-lg transition-all disabled:opacity-40"
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
