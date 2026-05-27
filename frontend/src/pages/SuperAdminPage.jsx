import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Modal({ onClose, children, size = "md" }) {
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
      {...props}
    />
  );
}

function PasswordInput({ value, onChange, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 pr-11 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
        tabIndex={-1}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
      </button>
    </div>
  );
}

function BtnPrimary({ children, ...props }) {
  return (
    <button
      className="bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 cursor-pointer"
      {...props}
    >
      {children}
    </button>
  );
}

function BtnGhost({ children, ...props }) {
  return (
    <button
      className="border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 font-mono text-xs px-4 py-2 rounded-lg transition cursor-pointer"
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [clerksMap, setClerksMap] = useState({});

  const [modal, setModal]               = useState(null);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [selectedClerk, setSelectedClerk]     = useState(null);

  const [collegeName, setCollegeName]       = useState("");
  const [collegeError, setCollegeError]     = useState("");
  const [collegeSubmitting, setCollegeSubmitting] = useState(false);
  const [newCollegeResult, setNewCollegeResult]   = useState(null);

  const [clerkName, setClerkName]         = useState("");
  const [clerkPhone, setClerkPhone]       = useState("");
  const [clerkPassword, setClerkPassword] = useState("");
  const [clerkError, setClerkError]       = useState("");
  const [clerkSubmitting, setClerkSubmitting] = useState(false);

  const [expandedIds, setExpandedIds] = useState(new Set());

  async function fetchColleges() {
    try {
      const res = await api.get("/super-admin/colleges");
      const list = res.data.data;
      setColleges(list);
      const results = await Promise.all(
        list.map(c =>
          api.get(`/super-admin/colleges/${c.college_id}/clerks`)
            .then(r => ({ id: c.college_id, clerks: r.data.data }))
        )
      );
      const map = {};
      results.forEach(({ id, clerks }) => { map[id] = clerks; });
      setClerksMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchColleges(); }, []);

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateCollege(e) {
    e.preventDefault();
    setCollegeError("");
    if (!collegeName.trim()) { setCollegeError("Name required"); return; }
    setCollegeSubmitting(true);
    try {
      const res = await api.post("/super-admin/colleges", { name: collegeName.trim() });
      setNewCollegeResult(res.data);
      setCollegeName("");
      await fetchColleges();
    } catch (err) {
      setCollegeError(err.response?.data?.error || "Failed");
    } finally {
      setCollegeSubmitting(false);
    }
  }

  async function handleToggleCollegeActive(college) {
    try {
      await api.patch(`/super-admin/colleges/${college.college_id}/active`, { is_active: !college.is_active });
      setColleges(prev =>
        prev.map(c => c.college_id === college.college_id ? { ...c, is_active: !c.is_active } : c)
      );
    } catch {
      alert("Failed to update college status");
    }
  }

  function openAddClerk(college) {
    setSelectedCollege(college);
    setClerkName(""); setClerkPhone(""); setClerkPassword(""); setClerkError("");
    setModal("addClerk");
  }

  function openEditClerk(college, clerk) {
    setSelectedCollege(college); setSelectedClerk(clerk);
    setClerkName(clerk.name); setClerkPhone(clerk.phone); setClerkPassword(""); setClerkError("");
    setModal("editClerk");
  }

  function openDeleteClerk(college, clerk) {
    setSelectedCollege(college); setSelectedClerk(clerk);
    setModal("deleteClerk");
  }

  async function handleAddClerk(e) {
    e.preventDefault(); setClerkError("");
    if (!clerkName || !clerkPhone || !clerkPassword) { setClerkError("All fields required"); return; }
    setClerkSubmitting(true);
    try {
      await api.post(`/super-admin/colleges/${selectedCollege.college_id}/clerk`, {
        college_id: selectedCollege.college_id, name: clerkName, phone: clerkPhone, password: clerkPassword,
      });
      setModal(null); await fetchColleges();
    } catch (err) {
      setClerkError(err.response?.data?.error || "Failed");
    } finally { setClerkSubmitting(false); }
  }

  async function handleEditClerk(e) {
    e.preventDefault(); setClerkError("");
    if (!clerkName || !clerkPhone) { setClerkError("Name and phone required"); return; }
    setClerkSubmitting(true);
    try {
      await api.put(`/super-admin/colleges/${selectedCollege.college_id}/clerks/${selectedClerk.user_id}`, {
        name: clerkName, phone: clerkPhone,
      });
      setModal(null); await fetchColleges();
    } catch (err) {
      setClerkError(err.response?.data?.error || "Failed");
    } finally { setClerkSubmitting(false); }
  }

  async function handleDeleteClerk() {
    try {
      await api.delete(`/super-admin/colleges/${selectedCollege.college_id}/clerks/${selectedClerk.user_id}`);
      setModal(null); await fetchColleges();
    } catch {
      alert("Failed to delete clerk");
    }
  }

  async function handleToggleBlock(college, clerk) {
    try {
      await api.patch(
        `/super-admin/colleges/${college.college_id}/clerks/${clerk.user_id}/block`,
        { is_blocked: !clerk.is_blocked }
      );
      setClerksMap(prev => ({
        ...prev,
        [college.college_id]: prev[college.college_id].map(c =>
          c.user_id === clerk.user_id ? { ...c, is_blocked: !c.is_blocked } : c
        ),
      }));
    } catch {
      alert("Failed to update clerk status");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-amber-500 text-base leading-none">◈</span>
            <span className="font-head text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase hidden sm:inline">Marks Portal</span>
            <span className="bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">Super Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">{user?.name}</span>
            <button
              className="text-xs font-mono border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 px-3 py-1.5 rounded-lg transition"
              onClick={() => { logout(); navigate("/"); }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 sm:px-6 py-8">

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-head text-2xl font-bold text-zinc-900">Colleges</h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{colleges.length} institution{colleges.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            className="bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            onClick={() => { setModal("college"); setNewCollegeResult(null); setCollegeError(""); }}
            data-testid="add-college-btn"
          >
            + New College
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400 py-8">Loading…</p>
        ) : colleges.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 text-center">
            <p className="text-sm text-zinc-400">No colleges yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {colleges.map(c => {
              const clerks   = clerksMap[c.college_id] || [];
              const expanded = expandedIds.has(c.college_id);
              return (
                <div
                  key={c.college_id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                    !c.is_active ? "border-red-200" : "border-zinc-200"
                  }`}
                >
                  {/* College row */}
                  <div className={`flex flex-wrap items-center gap-3 px-5 py-4 ${!c.is_active ? "bg-red-50" : ""}`}>
                    <button
                      className="flex-1 flex items-center gap-3 min-w-0 text-left"
                      onClick={() => toggleExpand(c.college_id)}
                    >
                      <span className={`text-xs font-mono transition ${expanded ? "text-zinc-700 rotate-90" : "text-zinc-300"}`}>▶</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-head font-bold text-zinc-900 truncate">{c.name}</span>
                          <code className="bg-zinc-100 rounded-md px-2 py-0.5 text-xs font-mono text-zinc-500 tracking-widest">{c.college_code}</code>
                          {!c.is_active && (
                            <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-red-100 text-red-600 ring-1 ring-red-200 px-2 py-0.5 rounded-md">Disabled</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{clerks.length} clerk{clerks.length !== 1 ? "s" : ""} · Created {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <button
                        className={`text-xs font-mono border px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          c.is_active
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                        }`}
                        onClick={() => handleToggleCollegeActive(c)}
                      >
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-xs font-mono bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                        onClick={() => { openAddClerk(c); setExpandedIds(prev => { const n = new Set(prev); n.add(c.college_id); return n; }); }}
                        data-testid={`add-clerk-btn-${c.college_id}`}
                      >
                        + Clerk
                      </button>
                    </div>
                  </div>

                  {/* Clerks list — collapsible */}
                  {expanded && (
                    <div className="border-t border-zinc-100">
                      {clerks.length === 0 ? (
                        <p className="text-xs text-zinc-300 italic px-5 py-4">No clerks assigned</p>
                      ) : (
                        <div className="divide-y divide-zinc-50">
                          {clerks.map(clerk => (
                            <div key={clerk.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  clerk.is_blocked ? "bg-zinc-100 text-zinc-400" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {clerk.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${clerk.is_blocked ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                                    {clerk.name}
                                  </p>
                                  <p className="text-xs text-zinc-400 font-mono">{clerk.phone}</p>
                                </div>
                                {clerk.is_blocked && (
                                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 px-1.5 py-0.5 rounded hidden sm:inline-block flex-shrink-0">Blocked</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  className={`text-xs font-mono border px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                    clerk.is_blocked
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                  }`}
                                  onClick={() => handleToggleBlock(c, clerk)}
                                >
                                  {clerk.is_blocked ? "Unblock" : "Block"}
                                </button>
                                <button
                                  className="text-xs font-mono border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  onClick={() => openEditClerk(c, clerk)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-xs font-mono bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  onClick={() => openDeleteClerk(c, clerk)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create College Modal ── */}
      {modal === "college" && (
        <Modal onClose={() => setModal(null)}>
          <div className="p-7">
            <h3 className="font-head text-lg font-bold text-zinc-900 mb-5">New College</h3>
            <form onSubmit={handleCreateCollege} className="flex flex-col gap-4">
              <Field label="College Name">
                <Input
                  value={collegeName}
                  onChange={e => setCollegeName(e.target.value)}
                  placeholder="e.g. Vengurla Arts College"
                  data-testid="college-name-input"
                  autoFocus
                />
              </Field>
              {collegeError && <p className="text-xs text-red-500 font-mono">{collegeError}</p>}
              {newCollegeResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700" data-testid="college-code-result">
                  <p className="font-medium mb-1">College created!</p>
                  <p className="font-mono">Code: <strong className="tracking-widest">{newCollegeResult.college_code}</strong></p>
                  <p className="text-xs text-emerald-500 mt-1">Share this code with the college.</p>
                </div>
              )}
              <div className="flex gap-3 justify-end mt-1">
                <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
                <BtnPrimary type="submit" disabled={collegeSubmitting} data-testid="college-submit">
                  {collegeSubmitting ? "Creating…" : "Create"}
                </BtnPrimary>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Add Clerk Modal ── */}
      {modal === "addClerk" && selectedCollege && (
        <Modal onClose={() => setModal(null)}>
          <div className="p-7">
            <h3 className="font-head text-lg font-bold text-zinc-900 mb-1">Add Clerk</h3>
            <p className="text-sm text-zinc-400 font-mono mb-5">{selectedCollege.name}</p>
            <form onSubmit={handleAddClerk} className="flex flex-col gap-4">
              <Field label="Name"><Input value={clerkName} onChange={e => setClerkName(e.target.value)} data-testid="clerk-name-input" autoFocus /></Field>
              <Field label="Phone"><Input type="tel" inputMode="numeric" maxLength={10} value={clerkPhone} onChange={e => setClerkPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} data-testid="clerk-phone-input" /></Field>
              <Field label="Password"><PasswordInput value={clerkPassword} onChange={e => setClerkPassword(e.target.value)} data-testid="clerk-password-input" /></Field>
              {clerkError && <p className="text-xs text-red-500 font-mono">{clerkError}</p>}
              <div className="flex gap-3 justify-end mt-1">
                <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
                <BtnPrimary type="submit" disabled={clerkSubmitting} data-testid="clerk-submit">
                  {clerkSubmitting ? "Creating…" : "Create Clerk"}
                </BtnPrimary>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Edit Clerk Modal ── */}
      {modal === "editClerk" && selectedCollege && selectedClerk && (
        <Modal onClose={() => setModal(null)}>
          <div className="p-7">
            <h3 className="font-head text-lg font-bold text-zinc-900 mb-1">Edit Clerk</h3>
            <p className="text-sm text-zinc-400 font-mono mb-5">{selectedCollege.name}</p>
            <form onSubmit={handleEditClerk} className="flex flex-col gap-4">
              <Field label="Name"><Input value={clerkName} onChange={e => setClerkName(e.target.value)} autoFocus /></Field>
              <Field label="Phone"><Input type="tel" inputMode="numeric" maxLength={10} value={clerkPhone} onChange={e => setClerkPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>
              {clerkError && <p className="text-xs text-red-500 font-mono">{clerkError}</p>}
              <div className="flex gap-3 justify-end mt-1">
                <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
                <BtnPrimary type="submit" disabled={clerkSubmitting}>
                  {clerkSubmitting ? "Saving…" : "Save Changes"}
                </BtnPrimary>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Delete Clerk Confirm ── */}
      {modal === "deleteClerk" && selectedCollege && selectedClerk && (
        <Modal onClose={() => setModal(null)} size="sm">
          <div className="p-7">
            <h3 className="font-head text-lg font-bold text-zinc-900 mb-2">Delete Clerk?</h3>
            <p className="text-sm text-zinc-500 mb-1">
              Remove <strong className="text-zinc-800">{selectedClerk.name}</strong> from <strong className="text-zinc-800">{selectedCollege.name}</strong>?
            </p>
            <p className="text-xs text-zinc-400 font-mono mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <BtnGhost onClick={() => setModal(null)}>Cancel</BtnGhost>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                onClick={handleDeleteClerk}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

