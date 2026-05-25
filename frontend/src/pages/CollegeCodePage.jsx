import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CollegeCodePage() {
  const { resolveCode } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 8) {
      setError("College code must be exactly 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const college = await resolveCode(code.trim().toUpperCase());
      navigate("/login", { state: { college_id: college.college_id, college_name: college.name } });
    } catch (err) {
      setError(err.response?.data?.error || "College not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10" data-testid="college-code-page">

        {/* Brand */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-blue-600 text-xl">◈</span>
          <span className="font-head text-xs font-bold tracking-widest text-gray-400 uppercase">Marks Portal</span>
        </div>

        <h1 className="font-head text-3xl font-extrabold text-gray-900 mb-1">Enter College Code</h1>
        <p className="text-sm text-gray-500 mb-7">Your 8-character institution identifier</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            maxLength={8}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl text-blue-600 font-mono text-3xl font-medium tracking-[0.3em] text-center py-4 px-3 outline-none focus:border-blue-500 focus:bg-white transition placeholder-gray-300"
            data-testid="college-code-input"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border-l-4 border-red-500 px-3 py-2 rounded" data-testid="code-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-medium text-sm tracking-wide py-3 rounded-xl transition shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-200"
            data-testid="code-submit"
          >
            {loading ? "Verifying…" : "Continue →"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 transition"
            onClick={() => navigate("/login", { state: { superAdmin: true } })}
          >
            Super-admin access
          </button>
        </div>
      </div>
    </div>
  );
}
