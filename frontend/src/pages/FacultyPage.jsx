import { useEffect, useReducer, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function marksReducer(state, action) {
  switch (action.type) {
    case "SET":
      return action.marks.reduce((acc, m) => {
        acc[m.student_id] = m.value !== null ? String(m.value) : "";
        return acc;
      }, {});
    case "UPDATE":
      return { ...state, [action.student_id]: action.value };
    default:
      return state;
  }
}

function StatusPill({ status }) {
  const map = {
    open:      "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
    submitted: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
    locked:    "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200",
  };
  return (
    <span className={`text-[10px] font-mono font-medium tracking-widest uppercase px-2 py-0.5 rounded-md ${map[status] || map.locked}`}>
      {status}
    </span>
  );
}

function TypePill({ type }) {
  const map = {
    internal: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
    external: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  };
  return (
    <span className={`text-[10px] font-mono font-medium tracking-widest uppercase px-2 py-0.5 rounded-md ${map[type] || ""}`}>
      {type}
    </span>
  );
}

export default function FacultyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [marksData, setMarksData]     = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);
  const [markValues, dispatch]        = useReducer(marksReducer, {});
  const [saving, setSaving]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [reopening, setReopening]     = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    api.get("/faculty/assignments").then(res => {
      setAssignments(res.data);
      setLoading(false);
    });
  }, []);

  // Auto-save marks 1.5s after the faculty stops typing
  useEffect(() => {
    if (!selected || !marksData || saving) return;
    const isLocked = ["locked", "submitted"].includes(marksData?.assignment?.status);
    if (isLocked) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      setSaveMsg("");
      try {
        const marks = Object.entries(markValues).map(([student_id, value]) => ({
          student_id: Number(student_id),
          value: value === "" ? null : Number(value),
        }));
        await api.post(`/faculty/assignments/${selected.assignment_id}/marks`, { marks });
        setSaveMsg("Auto-saved");
        setTimeout(() => setSaveMsg(""), 2000);
      } catch {
        setSaveMsg("Auto-save failed");
      } finally {
        setSaving(false);
      }
    }, 1500);

    return () => clearTimeout(autoSaveTimer.current);
  }, [markValues]);

  // When browser back is pressed while viewing marks, go back to subject list.
  // Only applies when there are multiple assignments (hasSidebar).
  useEffect(() => {
    if (assignments.length > 1 && location.hash !== "#marks") {
      setSelected(null);
      setMarksData(null);
    }
  }, [location.hash, assignments.length]);

  async function openAssignment(a) {
    navigate("#marks");
    setSelected(a); setMarksLoading(true); setSaveMsg(""); setSidebarOpen(false);
    const res = await api.get(`/faculty/assignments/${a.assignment_id}/marks`);
    setMarksData(res.data);
    dispatch({ type: "SET", marks: res.data.marks });
    setMarksLoading(false);
  }

  function goBack() {
    setSelected(null);
    setMarksData(null);
    navigate("/faculty", { replace: true });
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    const marks = Object.entries(markValues).map(([student_id, value]) => ({
      student_id: Number(student_id),
      value: value === "" ? null : Number(value),
    }));
    try {
      await api.post(`/faculty/assignments/${selected.assignment_id}/marks`, { marks });
      setSaveMsg("Saved successfully.");
    } catch (err) {
      setSaveMsg(err.response?.data?.error || "Save failed.");
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!confirm("Submit marks to clerk? You can still reopen until they lock it.")) return;
    setSubmitting(true);
    try {
      // Always save current mark values before submitting
      const marks = Object.entries(markValues).map(([student_id, value]) => ({
        student_id: Number(student_id),
        value: value === "" ? null : Number(value),
      }));
      await api.post(`/faculty/assignments/${selected.assignment_id}/marks`, { marks });
      await api.patch(`/faculty/assignments/${selected.assignment_id}/submit`);
      const res = await api.get(`/faculty/assignments/${selected.assignment_id}/marks`);
      setMarksData(res.data);
      setSelected(prev => ({ ...prev, status: "submitted" }));
      const aRes = await api.get("/faculty/assignments");
      setAssignments(aRes.data);
    } finally { setSubmitting(false); }
  }

  async function handleReopen() {
    setReopening(true);
    try {
      await api.patch(`/faculty/assignments/${selected.assignment_id}/reopen`);
      const res = await api.get(`/faculty/assignments/${selected.assignment_id}/marks`);
      setMarksData(res.data);
      setSelected(prev => ({ ...prev, status: "open" }));
      const aRes = await api.get("/faculty/assignments");
      setAssignments(aRes.data);
    } finally { setReopening(false); }
  }

  const isLocked    = marksData?.assignment?.status === "locked" || marksData?.assignment?.status === "submitted";
  const isSubmitted = marksData?.assignment?.status === "submitted";
  const hasSidebar  = assignments.length > 1;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-zinc-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition text-zinc-500"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle assignments"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-amber-500 text-base leading-none">◈</span>
            <span className="font-head text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase hidden sm:inline">Marks Portal</span>
            <span className="bg-sky-50 text-sky-600 ring-1 ring-sky-200 text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">Faculty</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono truncate max-w-[120px]">{user?.name}</span>
            <button
              className="text-xs font-mono border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 px-3 py-1.5 rounded-lg transition"
              onClick={() => { logout(); navigate("/"); }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr]">

        {/* ── Sidebar ── */}
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-10 bg-black/20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside className={`
            fixed inset-y-0 left-0 z-20 w-72 bg-white border-r border-zinc-200 flex flex-col pt-16 pb-4
            transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:static lg:translate-x-0 lg:w-auto lg:pt-0
          `}>
            <div className="px-4 py-5 border-b border-zinc-100">
              <h2 className="font-head text-base font-bold text-zinc-800">Assignments</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <p className="text-sm text-zinc-400 px-2 py-4">Loading…</p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl py-8 text-center mx-2">No assignments.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {assignments.map(a => (
                    <button
                      key={a.assignment_id}
                      onClick={() => openAssignment(a)}
                      className={`w-full text-left rounded-xl px-3 py-3 transition border ${
                        selected?.assignment_id === a.assignment_id
                          ? "border-amber-300 bg-amber-50"
                          : "border-transparent hover:bg-zinc-50 hover:border-zinc-200"
                      }`}
                      data-testid={`assignment-item-${a.assignment_id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-medium text-zinc-800 text-sm truncate leading-tight">{a.subject_name}</span>
                        <TypePill type={a.mark_type} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-400 truncate">{a.class_name}{a.semester ? ` · Sem ${a.semester}` : ""}</span>
                        <StatusPill status={a.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>

        {/* ── Detail Panel ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          {/* Mobile subject list — shown when multiple assignments and none selected */}
          {/* Mobile: assignment card list — always shown when nothing selected */}
          {!selected && (
            <div className="lg:hidden">
              <h2 className="font-head text-lg font-bold text-zinc-900 mb-4">Your Assignments</h2>
              {loading ? (
                <p className="text-sm text-zinc-400 py-8">Loading…</p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl py-10 text-center">No assignments assigned to you.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignments.map(a => (
                    <button
                      key={a.assignment_id}
                      onClick={() => openAssignment(a)}
                      className="text-left bg-white border border-zinc-200 rounded-2xl px-4 py-4 hover:border-amber-300 hover:bg-amber-50 transition shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-head font-bold text-zinc-900 text-base leading-tight">{a.subject_name}</span>
                        <TypePill type={a.mark_type} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-400">{a.class_name}{a.semester ? ` · Sem ${a.semester}` : ""}</span>
                        <StatusPill status={a.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Desktop: empty state when nothing selected */}
          {!selected && (
            <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-48 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
              {loading ? (
                <p className="text-sm text-zinc-400">Loading…</p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-zinc-400">No assignments assigned to you.</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-400 mb-1">Select an assignment to enter marks</p>
                  <p className="text-xs text-zinc-300">Use the sidebar on the left</p>
                </>
              )}
            </div>
          )}

          {selected && (
            marksLoading ? (
            <p className="text-sm text-zinc-400 py-8">Loading marks…</p>
          ) : marksData ? (
            <>
              {/* Back button on mobile */}
              <button
                className="lg:hidden flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-800 mb-4 transition"
                onClick={goBack}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to subjects
              </button>

              {/* Section header */}
              <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-head text-xl font-bold text-zinc-900">{marksData.assignment.subject_name}</h2>
                    <StatusPill status={marksData.assignment.status} />
                  </div>
                  <p className="text-sm text-zinc-400 capitalize">
                    {marksData.assignment.mark_type} marks · {marksData.assignment.class_name}{marksData.assignment.semester ? ` · Sem ${marksData.assignment.semester}` : ""}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Save draft + Submit — only when open */}
                  {!isLocked && !isSubmitted && (
                    <>
                      <button
                        className="font-mono text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 px-3 py-2 rounded-lg transition disabled:opacity-40"
                        onClick={handleSave}
                        disabled={saving}
                        data-testid="save-marks-btn"
                      >
                        {saving ? "Saving…" : "Save Draft"}
                      </button>
                      <button
                        className="font-mono text-xs bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-40"
                        onClick={handleSubmit}
                        disabled={submitting}
                        data-testid="submit-btn"
                      >
                        {submitting ? "Submitting…" : "Submit →"}
                      </button>
                    </>
                  )}
                  {/* Reopen — only when submitted (not locked) */}
                  {isSubmitted && marksData.assignment.status === "submitted" && (
                    <button
                      className="font-mono text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-3 py-2 rounded-lg transition disabled:opacity-40"
                      onClick={handleReopen}
                      disabled={reopening}
                      data-testid="reopen-btn"
                    >
                      {reopening ? "…" : "Reopen"}
                    </button>
                  )}
                </div>
              </div>

              {saveMsg && (
                <p className={`text-xs font-mono mb-4 ${saveMsg.includes("failed") || saveMsg.includes("Failed") ? "text-red-500" : "text-emerald-600"}`}>
                  {saveMsg}
                </p>
              )}

              {isLocked && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 text-sm px-4 py-3 mb-5" data-testid="locked-banner">
                  {marksData.assignment.status === "submitted"
                    ? "Marks submitted — reopen to make changes."
                    : "This sheet has been locked by the clerk — view only."}
                </div>
              )}

              {/* Marks table */}
              <div className="flex justify-center">
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm w-full max-w-2xl">
                <table className="w-full text-sm table-fixed" data-testid="marks-entry-table">
                  <colgroup>
                    <col className="w-20" />
                    <col className="w-40 hidden sm:table-column" />
                    <col />
                    <col className="w-24" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-[10px] font-mono font-medium tracking-widest text-zinc-400 uppercase px-4 py-3">Seat</th>
                      <th className="text-left text-[10px] font-mono font-medium tracking-widest text-zinc-400 uppercase px-4 py-3 hidden sm:table-cell">Reg No</th>
                      <th className="text-left text-[10px] font-mono font-medium tracking-widest text-zinc-400 uppercase px-4 py-3">Student</th>
                      <th className="text-right text-[10px] font-mono font-medium tracking-widest text-zinc-400 uppercase px-4 py-3">Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {marksData.marks.map(m => (
                      <tr key={m.student_id} className="hover:bg-stone-50 transition">
                        <td className="px-4 py-2.5">
                          <code className="bg-zinc-100 rounded-md px-2 py-0.5 text-xs font-mono text-zinc-600">{m.seat_no}</code>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <code className="bg-zinc-100 rounded-md px-2 py-0.5 text-xs font-mono text-zinc-600">{m.registration_no}</code>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-zinc-700 font-medium truncate">{m.student_name}</p>
                          <code className="sm:hidden bg-zinc-100 rounded-md px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 mt-0.5 inline-block">{m.registration_no}</code>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isLocked ? (
                            <span className={`font-mono font-medium ${m.value === null ? "text-zinc-300" : "text-zinc-800"}`}>
                              {m.value !== null ? m.value : "—"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              className="w-16 bg-stone-50 border border-zinc-200 rounded-lg font-mono text-sm px-2 py-1 text-right outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                              value={markValues[m.student_id] ?? ""}
                              onChange={e => dispatch({ type: "UPDATE", student_id: m.student_id, value: e.target.value })}
                              min={0}
                              step={0.5}
                              data-testid={`mark-input-${m.student_id}`}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </>
          ) : null)}
        </main>
      </div>
    </div>
  );
}
