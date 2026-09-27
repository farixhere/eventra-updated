import React, { useState } from "react";
import { X, Award, CheckCircle, ShieldAlert, Printer, Search } from "lucide-react";
import { api } from "../api";

interface CertificateVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const CertificateVerifyModal: React.FC<CertificateVerifyModalProps> = ({
  isOpen,
  onClose,
  initialCode = "",
}) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a verification code.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await api.verifyCertificate(code.trim());
      setResult(data.certificate);
    } catch (err: any) {
      setError(err.message || "Invalid or unverified certificate code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#12161f] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#d7ff3f] text-black font-extrabold flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Certificate Authenticator</h2>
              <p className="text-xs text-neutral-400">Verify official Eventra event credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleVerify} className="mt-6">
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
            Certificate Verification Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. VRF-9824-A7"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-600"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? "Checking…" : "Verify"}</span>
            </button>
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Try test code: <button type="button" onClick={() => setCode("VRF-9824-A7")} className="text-[#d7ff3f] underline cursor-pointer">VRF-9824-A7</button> or <button type="button" onClick={() => setCode("VRF-3142-B9")} className="text-[#d7ff3f] underline cursor-pointer">VRF-3142-B9</button>
          </span>
        </form>

        {error && (
          <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Verification Failed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Verified Certificate Display Card */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border-2 border-[#d7ff3f]/50 relative overflow-hidden shadow-[0_0_30px_rgba(215,255,63,0.15)] printable-certificate">
              <div className="absolute top-0 right-0 px-3 py-1 bg-[#d7ff3f] text-black text-[10px] font-black tracking-widest uppercase rounded-bl-xl">
                OFFICIAL RECORD
              </div>

              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-[#d7ff3f]" />
                <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider">
                  Cryptographically Verified
                </span>
              </div>

              <div className="text-center my-4 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                  {result.eventName}
                </p>
                <h3 className="text-xl font-black text-white">{result.title}</h3>
                <p className="text-sm text-neutral-300">Awarded to</p>
                <div className="text-2xl font-black text-[#d7ff3f] py-1 border-y border-white/10 my-2">
                  {result.recipient}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-white/10 text-neutral-400">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-500">Certificate No.</span>
                  <span className="font-mono text-white font-bold">{result.number}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-500">Issued On</span>
                  <span className="text-neutral-200">
                    {new Date(result.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-500">Verifications</span>
                  <span className="text-neutral-200">{result.verificationCount} times verified</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
