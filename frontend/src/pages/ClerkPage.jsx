import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "../components/ProfileModal";
import { SkeletonTableRows, SkeletonCards } from "../components/Skeleton";

const TABS = ["Classes", "Faculty", "Assignments", "Marks"];

// ─── Shared primitives ────────────────────────────────────────────────────────

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition ${className}`}
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
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

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <p className="text-xs font-mono text-red-500">{msg}</p>;
}

function StatusPill({ status }) {
  const map = {
    open:      "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
    submitted: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
    locked:    "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200",
  };
  return <span className={`text-[10px] font-mono font-medium tracking-widest uppercase px-2 py-0.5 rounded-md ${map[status] || map.locked}`}>{status}</span>;
}

function TypePill({ type }) {
  const map = {
    internal: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
    external: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  };
  return <span className={`text-[10px] font-mono font-medium tracking-widest uppercase px-2 py-0.5 rounded-md ${map[type] || ""}`}>{type}</span>;
}

function Modal({ onClose, title, subtitle, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-7 pt-7 pb-2">
          <h3 className="font-head text-lg font-bold text-zinc-900">{title}</h3>
          {subtitle && <p className="text-sm text-zinc-400 font-mono mt-0.5">{subtitle}</p>}
        </div>
        <div className="px-7 pb-7 pt-4">{children}</div>
      </div>
    </div>
  );
}

function BtnPrimary({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnGhost({ children, className = "", ...props }) {
  return (
    <button
      className={`border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 font-mono text-xs px-4 py-2 rounded-lg transition cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnAccent({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-amber-400 hover:bg-amber-300 text-zinc-900 font-head font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
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

function CodeTag({ children }) {
  return <code className="bg-zinc-100 rounded-md px-2 py-0.5 text-xs font-mono text-zinc-600">{children}</code>;
}

function THead({ cols }) {
  return (
    <thead>
      <tr className="border-b border-zinc-100">
        {cols.map(c => (
          <th key={c} className="text-left text-[10px] font-mono font-medium tracking-widest text-zinc-400 uppercase px-5 py-3.5 whitespace-nowrap">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function SearchBar({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        className="w-full bg-white border border-zinc-200 rounded-xl font-mono text-sm pl-9 pr-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClerkPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Classes");
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-amber-500 text-base leading-none">◈</span>
            {user?.college_name && (
              <span className="font-head text-sm font-bold text-zinc-800">{user.college_name}</span>
            )}
            <span className="bg-violet-50 text-violet-600 ring-1 ring-violet-200 text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">Clerk</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-800 transition truncate max-w-[120px]"
              title="Profile"
            >
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </span>
              <span className="truncate hidden sm:inline">{user?.name}</span>
            </button>
          </div>
        </div>
      </header>
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}

      {/* ── Tabs ── */}
      <nav className="bg-white border-b border-zinc-200 overflow-x-auto scrollbar-hide">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs font-medium tracking-widest uppercase px-4 sm:px-5 py-4 border-b-2 whitespace-nowrap transition ${
                tab === t
                  ? "border-amber-400 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              }`}
              data-testid={`tab-${t.toLowerCase()}`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 sm:px-6 py-6">
        {tab === "Classes"     && <ClassesTab />}
        {tab === "Faculty"     && <FacultyTab />}
        {tab === "Assignments" && <AssignmentsTab />}
        {tab === "Marks"       && <MarksTab />}
      </main>
    </div>
  );
}

// ─── Classes Tab ──────────────────────────────────────────────────────────────

function ClassesTab() {
  const [classes, setClasses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState("");
  const [modal, setModal]           = useState(null);
  const [editing, setEditing]       = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects]     = useState([]);
  const [students, setStudents]     = useState([]);
  const [className, setClassName]   = useState("");
  const [classError, setClassError] = useState("");
  const [subjectName, setSubjectName]   = useState("");
  const [subjectCode, setSubjectCode]   = useState("");
  const [subjectSemester, setSubjectSemester] = useState("");
  const [internalMax, setInternalMax]   = useState("");
  const [externalMax, setExternalMax]   = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [xlsxFile, setXlsxFile]       = useState(null);
  const [csvError, setCsvError]       = useState("");
  const [csvSuccess, setCsvSuccess]   = useState("");
  const [seatNo, setSeatNo]               = useState("");
  const [regNo, setRegNo]                 = useState("");
  const [studentName, setStudentName]     = useState("");
  const [studentSemester, setStudentSemester] = useState("");
  const [studentError, setStudentError]   = useState("");
  const [addMode, setAddMode]         = useState("single");
  const [submitting, setSubmitting]   = useState(false);
  const [classSearch, setClassSearch] = useState("");

  async function fetchClasses() {
    setLoadError("");
    try { const res = await api.get("/clerk/classes"); setClasses(res.data); }
    catch (err) { setLoadError(err.friendlyMessage || err.response?.data?.error || "Failed to load classes"); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchClasses(); }, []);

  async function openSubjects(cls) {
    setSelectedClass(cls);
    const res = await api.get(`/clerk/classes/${cls.class_id}/subjects`);
    setSubjects(res.data);
    setSubjectName(""); setSubjectCode(""); setSubjectSemester(""); setInternalMax(""); setExternalMax(""); setSubjectError("");
    setModal("subjects");
  }

  async function openStudents(cls) {
    setSelectedClass(cls);
    const res = await api.get(`/clerk/classes/${cls.class_id}/students`);
    setStudents(res.data);
    setXlsxFile(null); setCsvError(""); setCsvSuccess("");
    setSeatNo(""); setRegNo(""); setStudentName(""); setStudentSemester(""); setStudentError("");
    setAddMode("single");
    setModal("students");
  }

  async function handleAddStudent(e) {
    e.preventDefault(); setStudentError("");
    if (!seatNo || !regNo || !studentName) { setStudentError("All fields required"); return; }
    if (!studentSemester) { setStudentError("Please select a semester"); return; }
    setSubmitting(true);
    try {
      await api.post(`/clerk/classes/${selectedClass.class_id}/students`, {
        seat_no: seatNo, registration_no: regNo, name: studentName,
        semester: studentSemester !== "" ? Number(studentSemester) : null,
      });
      setSeatNo(""); setRegNo(""); setStudentName(""); setStudentSemester("");
      const res = await api.get(`/clerk/classes/${selectedClass.class_id}/students`);
      setStudents(res.data);
    } catch (err) { setStudentError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleSaveClass(e) {
    e.preventDefault(); setClassError("");
    if (!className.trim()) { setClassError("Name required"); return; }
    setSubmitting(true);
    try {
      if (editing) await api.put(`/clerk/classes/${editing.class_id}`, { name: className.trim() });
      else await api.post("/clerk/classes", { name: className.trim() });
      setModal(null); setEditing(null); setClassName("");
      await fetchClasses();
    } catch (err) { setClassError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteClass(cls) {
    if (!confirm(`Delete class "${cls.name}"? This will delete all its subjects and students.`)) return;
    await api.delete(`/clerk/classes/${cls.class_id}`);
    await fetchClasses();
  }

  async function handleSaveSubject(e) {
    e.preventDefault(); setSubjectError("");
    if (!subjectName || !subjectCode) { setSubjectError("Name and code required"); return; }
    if (!subjectSemester) { setSubjectError("Please select a semester"); return; }
    setSubmitting(true);
    try {
      await api.post(`/clerk/classes/${selectedClass.class_id}/subjects`, {
        name: subjectName.trim(), subject_code: subjectCode.trim(),
        semester: subjectSemester ? Number(subjectSemester) : null,
        internal_max: internalMax || null, external_max: externalMax || null,
      });
      const res = await api.get(`/clerk/classes/${selectedClass.class_id}/subjects`);
      setSubjects(res.data);
      setSubjectName(""); setSubjectCode(""); setSubjectSemester(""); setInternalMax(""); setExternalMax("");
    } catch (err) { setSubjectError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteSubject(subject_id) {
    if (!confirm("Delete this subject?")) return;
    await api.delete(`/clerk/subjects/${subject_id}`);
    const res = await api.get(`/clerk/classes/${selectedClass.class_id}/subjects`);
    setSubjects(res.data);
  }

  async function handleImportExcel(e) {
    e.preventDefault(); setCsvError(""); setCsvSuccess("");
    if (!xlsxFile) { setCsvError("Select an Excel file (.xlsx)"); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", xlsxFile);
      const res = await api.post(
        `/clerk/classes/${selectedClass.class_id}/students/import`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setCsvSuccess(`Imported ${res.data.imported} students.`);
      setXlsxFile(null);
      const sr = await api.get(`/clerk/classes/${selectedClass.class_id}/students`);
      setStudents(sr.data);
    } catch (err) {
      if (err.response?.data?.errors) {
        setCsvError(err.response.data.errors.map(e => `Row ${e.line}: ${e.error}`).join("\n"));
      } else {
        setCsvError(err.response?.data?.error || "Import failed");
      }
    } finally { setSubmitting(false); }
  }

  const filtered = classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()));

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-head text-xl font-bold text-zinc-900">Classes</h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{classes.length} class{classes.length !== 1 ? "es" : ""}</p>
        </div>
        <BtnAccent onClick={() => { setEditing(null); setClassName(""); setClassError(""); setModal("class"); }} data-testid="add-class-btn">
          + New Class
        </BtnAccent>
      </div>

      <SearchBar
        value={classSearch}
        onChange={e => setClassSearch(e.target.value)}
        placeholder="Search classes…"
        className="mb-4 max-w-xs"
      />

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><THead cols={["Class", "Actions"]} /><tbody className="divide-y divide-zinc-50"><SkeletonTableRows rows={4} cols={2} /></tbody></table>
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl py-8 text-center">
          <p className="text-sm text-red-500 font-mono mb-3">{loadError}</p>
          <button onClick={fetchClasses} className="text-xs font-mono text-red-600 underline">Retry</button>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 text-center">
          <p className="text-sm text-zinc-400">No classes yet. Create one to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-12 text-center">
          <p className="text-sm text-zinc-400">No classes match your search.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="classes-table">
              <THead cols={["Class", "Actions"]} />
              <tbody className="divide-y divide-zinc-50">
                {filtered.map(c => (
                  <tr key={c.class_id} className="hover:bg-stone-50 transition">
                    <td className="font-medium text-zinc-800 px-5 py-3.5">{c.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 flex-wrap">
                        <button className="font-mono text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openSubjects(c)} data-testid={`subjects-btn-${c.class_id}`}>Subjects</button>
                        <button className="font-mono text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openStudents(c)} data-testid={`students-btn-${c.class_id}`}>Students</button>
                        <button className="font-mono text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => { setEditing(c); setClassName(c.name); setClassError(""); setModal("class"); }}>Edit</button>
                        <button className="font-mono text-xs bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => handleDeleteClass(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {modal === "class" && (
        <Modal onClose={() => { setModal(null); setEditing(null); }} title={editing ? "Edit Class" : "New Class"}>
          <form onSubmit={handleSaveClass} className="flex flex-col gap-4">
            <Field label="Class Name">
              <Input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. FY B.Sc." data-testid="class-name-input" autoFocus />
            </Field>
            <ErrorMsg msg={classError} />
            <div className="flex gap-3 justify-end">
              <BtnGhost type="button" onClick={() => { setModal(null); setEditing(null); }}>Cancel</BtnGhost>
              <BtnPrimary type="submit" disabled={submitting} data-testid="class-submit">{submitting ? "Saving…" : "Save"}</BtnPrimary>
            </div>
          </form>
        </Modal>
      )}

      {/* Subjects Modal */}
      {modal === "subjects" && selectedClass && (
        <Modal onClose={() => setModal(null)} title="Subjects" subtitle={selectedClass.name} wide>
          {subjects.length > 0 && (
            <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden mb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="subjects-table">
                  <THead cols={["Name", "Code", "Sem", ""]} />
                  <tbody className="divide-y divide-zinc-50">
                    {subjects.map(s => (
                      <tr key={s.subject_id} className="hover:bg-stone-50 transition">
                        <td className="px-5 py-2.5 text-zinc-800">{s.name}</td>
                        <td className="px-5 py-2.5"><CodeTag>{s.subject_code}</CodeTag></td>
                        <td className="px-5 py-2.5 text-zinc-400 font-mono text-xs">{s.semester ?? "—"}</td>
                        <td className="px-5 py-2.5">
                          <button className="font-mono text-xs bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 px-3 py-1 rounded-lg transition cursor-pointer" onClick={() => handleDeleteSubject(s.subject_id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-5">
            <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-3">Add Subject</p>
            <form onSubmit={handleSaveSubject} className="flex flex-wrap gap-3 items-end">
              <input className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition flex-1 min-w-[140px]" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="Subject name" data-testid="subject-name-input" />
              <input className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition w-32" value={subjectCode} onChange={e => setSubjectCode(e.target.value.toUpperCase())} placeholder="PHY101" maxLength={20} data-testid="subject-code-input" />
              <select className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition w-28 cursor-pointer" value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)}>
                <option value="">Sem</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
              <BtnPrimary type="submit" disabled={submitting} data-testid="add-subject-btn">+ Add</BtnPrimary>
            </form>
            <ErrorMsg msg={subjectError} />
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
            <BtnGhost onClick={() => setModal(null)}>Close</BtnGhost>
          </div>
        </Modal>
      )}

      {/* Students Modal */}
      {modal === "students" && selectedClass && (
        <Modal onClose={() => setModal(null)} title="Students" subtitle={`${selectedClass.name} · ${students.length} enrolled`} wide>
          {students.length > 0 && (
            <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden mb-5 max-h-52 overflow-y-auto">
              <table className="w-full text-sm" data-testid="students-table">
                <THead cols={["Seat No", "Reg No", "Name", "Sem"]} />
                <tbody className="divide-y divide-zinc-50">
                  {students.map(s => (
                    <tr key={s.student_id} className="hover:bg-stone-50">
                      <td className="px-5 py-2.5"><CodeTag>{s.seat_no}</CodeTag></td>
                      <td className="px-5 py-2.5"><CodeTag>{s.registration_no}</CodeTag></td>
                      <td className="px-5 py-2.5 text-zinc-800">{s.name}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-zinc-400">{s.semester ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-zinc-100 pt-5">
            <div className="flex gap-1 mb-4">
              {["single", "excel"].map(mode => (
                <button
                  key={mode}
                  onClick={() => { setAddMode(mode); setStudentError(""); setCsvError(""); setCsvSuccess(""); }}
                  className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    addMode === mode
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-stone-50 text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {mode === "single" ? "Add Single" : "Import Excel"}
                </button>
              ))}
            </div>

            {addMode === "single" && (
              <form onSubmit={handleAddStudent} className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1 flex-1 min-w-[90px]">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Seat No</label>
                  <input className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" value={seatNo} onChange={e => setSeatNo(e.target.value)} placeholder="001" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Reg No</label>
                  <input className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="REG001" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Name</label>
                  <input className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="flex flex-col gap-1 min-w-[80px]">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Semester</label>
                  <select className="bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer" value={studentSemester} onChange={e => setStudentSemester(e.target.value)}>
                    <option value="">Select</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Sem {n}</option>)}
                  </select>
                </div>
                <BtnPrimary type="submit" disabled={submitting}>+ Add</BtnPrimary>
                {studentError && <ErrorMsg msg={studentError} />}
              </form>
            )}

            {addMode === "excel" && (
              <div className="flex flex-col gap-3">
                <a
                  href="/students_sample.xlsx"
                  download="students_sample.xlsx"
                  className="text-xs font-mono text-amber-600 hover:text-amber-700 underline underline-offset-2 transition self-start"
                >
                  ↓ Download sample
                </a>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="w-full font-mono text-xs text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-zinc-200 file:text-xs file:font-mono file:bg-stone-50 file:text-zinc-600 hover:file:bg-zinc-100 file:transition cursor-pointer"
                  onChange={e => { setXlsxFile(e.target.files[0] || null); setCsvError(""); setCsvSuccess(""); }}
                  data-testid="xlsx-input"
                />
                {xlsxFile && <p className="text-xs text-zinc-500 font-mono">{xlsxFile.name}</p>}
                {csvError && <pre className="text-xs text-red-500 font-mono bg-red-50 rounded-xl px-4 py-3 whitespace-pre-wrap border border-red-100">{csvError}</pre>}
                {csvSuccess && <p className="text-xs text-emerald-600 font-mono">{csvSuccess}</p>}
                <BtnPrimary onClick={handleImportExcel} disabled={submitting} data-testid="xlsx-import-btn" className="self-start">
                  {submitting ? "Importing…" : "Import"}
                </BtnPrimary>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-5 pt-4 border-t border-zinc-100">
            <BtnGhost onClick={() => setModal(null)}>Close</BtnGhost>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Faculty Tab ──────────────────────────────────────────────────────────────

function FacultyTab() {
  const [faculty, setFaculty]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState("");
  const [modal, setModal]           = useState(null);
  const [editing, setEditing]       = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [name, setName]             = useState("");
  const [phone, setPhone]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]         = useState("");

  async function fetchFaculty() {
    setLoadError("");
    try { const res = await api.get("/clerk/faculty"); setFaculty(res.data); }
    catch (err) { setLoadError(err.friendlyMessage || err.response?.data?.error || "Failed to load faculty"); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchFaculty(); }, []);

  function openAdd() { setName(""); setPhone(""); setPassword(""); setError(""); setModal("add"); }
  function openEdit(f) { setEditing(f); setName(f.name); setPhone(f.phone); setPassword(""); setError(""); setModal("edit"); }
  function openDelete(f) { setDeleting(f); setModal("delete"); }

  async function handleCreate(e) {
    e.preventDefault(); setError("");
    if (!name || !phone || !password) { setError("All fields required"); return; }
    setSubmitting(true);
    try { await api.post("/clerk/faculty", { name, phone, password }); setModal(null); await fetchFaculty(); }
    catch (err) { setError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e) {
    e.preventDefault(); setError("");
    if (!name || !phone) { setError("Name and phone required"); return; }
    setSubmitting(true);
    try { await api.put(`/clerk/faculty/${editing.user_id}`, { name, phone }); setModal(null); await fetchFaculty(); }
    catch (err) { setError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    setSubmitting(true);
    try { await api.delete(`/clerk/faculty/${deleting.user_id}`); setModal(null); await fetchFaculty(); }
    catch (err) { alert(err.response?.data?.error || "Failed to delete"); }
    finally { setSubmitting(false); }
  }

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.phone.includes(q);
  });

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-head text-xl font-bold text-zinc-900">Faculty</h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{faculty.length} member{faculty.length !== 1 ? "s" : ""}</p>
        </div>
        <BtnAccent onClick={openAdd} data-testid="add-faculty-btn">+ New Faculty</BtnAccent>
      </div>

      <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…" className="mb-4 max-w-xs" />

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><THead cols={["Name", "Phone", ""]} /><tbody className="divide-y divide-zinc-50"><SkeletonTableRows rows={4} cols={3} /></tbody></table>
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl py-8 text-center">
          <p className="text-sm text-red-500 font-mono mb-3">{loadError}</p>
          <button onClick={fetchFaculty} className="text-xs font-mono text-red-600 underline">Retry</button>
        </div>
      ) : faculty.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 text-center">
          <p className="text-sm text-zinc-400">No faculty yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-12 text-center">
          <p className="text-sm text-zinc-400">No faculty match your search.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="faculty-table">
              <THead cols={["Name", "Phone", ""]} />
              <tbody className="divide-y divide-zinc-50">
                {filtered.map(f => (
                  <tr key={f.user_id} className="hover:bg-stone-50 transition">
                    <td className="font-medium text-zinc-800 px-5 py-3.5">{f.name}</td>
                    <td className="text-zinc-500 font-mono px-5 py-3.5">{f.phone}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end">
                        <button className="font-mono text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openEdit(f)}>Edit</button>
                        <button className="font-mono text-xs bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openDelete(f)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === "add" && (
        <Modal onClose={() => setModal(null)} title="New Faculty">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} autoFocus data-testid="faculty-name-input" /></Field>
            <Field label="Phone"><Input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} data-testid="faculty-phone-input" /></Field>
            <Field label="Password"><PasswordInput value={password} onChange={e => setPassword(e.target.value)} data-testid="faculty-password-input" /></Field>
            <ErrorMsg msg={error} />
            <div className="flex gap-3 justify-end">
              <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
              <BtnPrimary type="submit" disabled={submitting} data-testid="faculty-submit">{submitting ? "Creating…" : "Create"}</BtnPrimary>
            </div>
          </form>
        </Modal>
      )}

      {modal === "edit" && editing && (
        <Modal onClose={() => setModal(null)} title="Edit Faculty" subtitle={editing.name}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
            <Field label="Phone"><Input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>
            <ErrorMsg msg={error} />
            <div className="flex gap-3 justify-end">
              <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
              <BtnPrimary type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</BtnPrimary>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && deleting && (
        <Modal onClose={() => setModal(null)} title="Delete Faculty?">
          <p className="text-sm text-zinc-500 mb-1">Remove <strong className="text-zinc-800">{deleting.name}</strong>?</p>
          <p className="text-xs text-zinc-400 font-mono mb-6">This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <BtnGhost onClick={() => setModal(null)}>Cancel</BtnGhost>
            <button className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 cursor-pointer" disabled={submitting} onClick={handleDelete}>
              {submitting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab() {
  const [assignments, setAssignments]         = useState([]);
  const [classes, setClasses]                 = useState([]);
  const [faculty, setFaculty]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [loadError, setLoadError]             = useState("");
  const [modal, setModal]                     = useState(null);
  const [editing, setEditing]                 = useState(null);
  const [deleting, setDeleting]               = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [subjects, setSubjects]               = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [markType, setMarkType]               = useState("internal");
  const [error, setError]                     = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [search, setSearch]                   = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [filterType, setFilterType]           = useState("");

  async function fetchAll() {
    setLoadError("");
    try {
      const [aRes, cRes, fRes] = await Promise.all([
        api.get("/clerk/assignments"),
        api.get("/clerk/classes"),
        api.get("/clerk/faculty"),
      ]);
      setAssignments(aRes.data); setClasses(cRes.data); setFaculty(fRes.data);
    } catch (err) {
      setLoadError(err.friendlyMessage || err.response?.data?.error || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchAll(); }, []);

  async function onClassChange(e) {
    setSelectedClassId(e.target.value); setSelectedSubjectId(""); setSelectedSemester(""); setSubjects([]);
    if (!e.target.value) return;
    const res = await api.get(`/clerk/classes/${e.target.value}/subjects`);
    setSubjects(res.data);
  }

  async function onSemesterChange(e) {
    setSelectedSemester(e.target.value); setSelectedSubjectId("");
    if (!selectedClassId) return;
    const url = e.target.value
      ? `/clerk/classes/${selectedClassId}/subjects?semester=${e.target.value}`
      : `/clerk/classes/${selectedClassId}/subjects`;
    const res = await api.get(url);
    setSubjects(res.data);
  }

  function openAdd() { setSelectedClassId(""); setSelectedSemester(""); setSelectedSubjectId(""); setSelectedFacultyId(""); setMarkType("internal"); setSubjects([]); setError(""); setModal("add"); }
  function openEdit(a) { setEditing(a); setSelectedFacultyId(String(a.faculty_id)); setError(""); setModal("edit"); }
  function openDelete(a) { setDeleting(a); setModal("delete"); }

  async function handleCreate(e) {
    e.preventDefault(); setError("");
    if (!selectedSubjectId || !selectedFacultyId) { setError("Subject and faculty required"); return; }
    setSubmitting(true);
    try { await api.post("/clerk/assignments", { subject_id: Number(selectedSubjectId), faculty_id: Number(selectedFacultyId), mark_type: markType }); setModal(null); await fetchAll(); }
    catch (err) { setError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(e) {
    e.preventDefault(); setError("");
    if (!selectedFacultyId) { setError("Faculty required"); return; }
    setSubmitting(true);
    try { await api.put(`/clerk/assignments/${editing.assignment_id}`, { faculty_id: Number(selectedFacultyId) }); setModal(null); await fetchAll(); }
    catch (err) { setError(err.response?.data?.error || "Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    setSubmitting(true);
    try { await api.delete(`/clerk/assignments/${deleting.assignment_id}`); setModal(null); await fetchAll(); }
    catch (err) { alert(err.response?.data?.error || "Failed to delete"); }
    finally { setSubmitting(false); }
  }

  async function handleLock(assignment_id) {
    if (!confirm("Lock this assignment? Faculty will no longer be able to edit.")) return;
    await api.patch(`/clerk/assignments/${assignment_id}/lock`);
    await fetchAll();
  }

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return (
      (!q || a.subject_name.toLowerCase().includes(q) || a.class_name.toLowerCase().includes(q) || (a.faculty_name || "").toLowerCase().includes(q)) &&
      (!filterStatus || a.status === filterStatus) &&
      (!filterType || a.mark_type === filterType)
    );
  });

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-head text-xl font-bold text-zinc-900">Assignments</h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</p>
        </div>
        <BtnAccent onClick={openAdd} data-testid="add-assignment-btn">+ Assign</BtnAccent>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject, class or faculty…" className="flex-1 min-w-[200px]" />
        <select
          className="bg-white border border-zinc-200 rounded-xl font-mono text-xs px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="submitted">Submitted</option>
          <option value="locked">Locked</option>
        </select>
        <select
          className="bg-white border border-zinc-200 rounded-xl font-mono text-xs px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
          value={filterType} onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><THead cols={["Class", "Subject", "Type", "Faculty", "Status", ""]} /><tbody className="divide-y divide-zinc-50"><SkeletonTableRows rows={5} cols={6} /></tbody></table>
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl py-8 text-center">
          <p className="text-sm text-red-500 font-mono mb-3">{loadError}</p>
          <button onClick={fetchAll} className="text-xs font-mono text-red-600 underline">Retry</button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-16 text-center">
          <p className="text-sm text-zinc-400">No assignments yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-12 text-center">
          <p className="text-sm text-zinc-400">No assignments match your filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="assignments-table">
              <THead cols={["Class", "Subject", "Type", "Faculty", "Status", ""]} />
              <tbody className="divide-y divide-zinc-50">
                {filtered.map(a => (
                  <tr key={a.assignment_id} className="hover:bg-stone-50 transition">
                    <td className="text-zinc-400 font-mono px-5 py-3.5 whitespace-nowrap text-xs">{a.class_name}</td>
                    <td className="font-medium text-zinc-800 px-5 py-3.5">{a.subject_name}</td>
                    <td className="px-5 py-3.5"><TypePill type={a.mark_type} /></td>
                    <td className="text-zinc-600 px-5 py-3.5">{a.faculty_name ?? <span className="text-zinc-300 font-mono text-xs">Unassigned</span>}</td>
                    <td className="px-5 py-3.5"><StatusPill status={a.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {a.status !== "locked" && (
                          <>
                            <button className="font-mono text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openEdit(a)}>Edit</button>
                            <button className="font-mono text-xs bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => handleLock(a.assignment_id)} data-testid={`lock-btn-${a.assignment_id}`}>Lock</button>
                            <button className="font-mono text-xs bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg transition cursor-pointer" onClick={() => openDelete(a)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === "add" && (
        <Modal onClose={() => setModal(null)} title="New Assignment">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Class">
              <Select value={selectedClassId} onChange={onClassChange} data-testid="assignment-class-select">
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={selectedSemester} onChange={onSemesterChange} disabled={!selectedClassId}>
                <option value="">All semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={selectedSubjectId} onChange={e => {
                const sid = e.target.value;
                setSelectedSubjectId(sid);
                // Auto-select the first available mark type
                const takenInternal = assignments.some(a => a.subject_id === Number(sid) && a.mark_type === "internal" && a.faculty_id);
                setMarkType(takenInternal ? "external" : "internal");
              }} disabled={!subjects.length} data-testid="assignment-subject-select">
                <option value="">Select subject…</option>
                {subjects.map(s => {
                  const takenInternal = assignments.some(a => a.subject_id === s.subject_id && a.mark_type === "internal" && a.faculty_id);
                  const takenExternal = assignments.some(a => a.subject_id === s.subject_id && a.mark_type === "external" && a.faculty_id);
                  const fullyTaken = takenInternal && takenExternal;
                  return (
                    <option key={s.subject_id} value={s.subject_id} disabled={fullyTaken} style={{ color: fullyTaken ? "#a1a1aa" : undefined }}>
                      {s.name} ({s.subject_code}){s.semester ? ` · Sem ${s.semester}` : ""}
                      {fullyTaken ? " — fully assigned" : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
            {selectedSubjectId && (() => {
              const takenInternal = assignments.some(a => a.subject_id === Number(selectedSubjectId) && a.mark_type === "internal" && a.faculty_id);
              const takenExternal = assignments.some(a => a.subject_id === Number(selectedSubjectId) && a.mark_type === "external" && a.faculty_id);
              return (
                <Field label="Mark Type">
                  <div className="flex gap-2">
                    {[["internal", takenInternal], ["external", takenExternal]].map(([type, taken]) => (
                      <button
                        key={type}
                        type="button"
                        disabled={taken}
                        onClick={() => !taken && setMarkType(type)}
                        className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-medium border transition
                          ${taken
                            ? "bg-zinc-50 border-zinc-200 text-zinc-300 cursor-not-allowed line-through"
                            : markType === type
                              ? "bg-zinc-900 border-zinc-900 text-white cursor-pointer"
                              : "bg-stone-50 border-zinc-200 text-zinc-600 hover:border-zinc-400 cursor-pointer"
                          }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                        {taken && <span className="ml-1 no-underline" style={{ textDecoration: "none" }}>(assigned)</span>}
                      </button>
                    ))}
                  </div>
                </Field>
              );
            })()}
            <Field label="Faculty">
              <Select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)} data-testid="assignment-faculty-select">
                <option value="">Select faculty…</option>
                {faculty.map(f => <option key={f.user_id} value={f.user_id}>{f.name}</option>)}
              </Select>
            </Field>
            <ErrorMsg msg={error} />
            <div className="flex gap-3 justify-end">
              <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
              <BtnPrimary type="submit" disabled={submitting} data-testid="assignment-submit">{submitting ? "Saving…" : "Assign"}</BtnPrimary>
            </div>
          </form>
        </Modal>
      )}

      {modal === "edit" && editing && (
        <Modal onClose={() => setModal(null)} title="Reassign Faculty" subtitle={`${editing.class_name} · ${editing.subject_name}`}>
          <div className="mb-4">
            <TypePill type={editing.mark_type} />
          </div>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Field label="Faculty">
              <Select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}>
                <option value="">Select faculty…</option>
                {faculty.map(f => <option key={f.user_id} value={f.user_id}>{f.name}</option>)}
              </Select>
            </Field>
            <ErrorMsg msg={error} />
            <div className="flex gap-3 justify-end">
              <BtnGhost type="button" onClick={() => setModal(null)}>Cancel</BtnGhost>
              <BtnPrimary type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</BtnPrimary>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && deleting && (
        <Modal onClose={() => setModal(null)} title="Delete Assignment?">
          <p className="text-sm text-zinc-500 mb-1">
            Remove <strong className="text-zinc-800">{deleting.subject_name}</strong> ({deleting.mark_type}) from <strong className="text-zinc-800">{deleting.faculty_name ?? "faculty"}</strong>? Marks will be kept.
          </p>
          <p className="text-xs text-zinc-400 font-mono mb-6">All saved marks for this assignment will be deleted.</p>
          <div className="flex gap-3 justify-end">
            <BtnGhost onClick={() => setModal(null)}>Cancel</BtnGhost>
            <button className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-4 py-2 rounded-lg transition disabled:opacity-40 cursor-pointer" disabled={submitting} onClick={handleDelete}>
              {submitting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Marks Tab ────────────────────────────────────────────────────────────────

function MarksTab() {
  const [assignments, setAssignments]   = useState([]);
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [marksData, setMarksData]       = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarStatus, setSidebarStatus] = useState("");
  const [sidebarClass, setSidebarClass] = useState("");
  const [markSearch, setMarkSearch]     = useState("");
  const [panelOpen, setPanelOpen]       = useState(false);

  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([
      api.get("/clerk/assignments"),
      api.get("/clerk/classes"),
    ]).then(([aRes, cRes]) => {
      setAssignments(aRes.data);
      setClasses(cRes.data);
      setLoading(false);
    }).catch(err => {
      setLoadError(err.friendlyMessage || err.response?.data?.error || "Failed to load");
      setLoading(false);
    });
  }, []);

  async function viewMarks(a) {
    setSelected(a); setMarksLoading(true); setMarkSearch(""); setPanelOpen(false);
    const res = await api.get(`/clerk/assignments/${a.assignment_id}/marks`);
    setMarksData(res.data); setMarksLoading(false);
  }

  function downloadMarks(a) {
    const token = localStorage.getItem("token");
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/clerk/assignments/${a.assignment_id}/marks/download`;
    const link = document.createElement("a");
    link.href = `${url}?token=${token}`;
    link.download = "";
    link.click();
  }

  const filteredAssignments = assignments.filter(a => {
    const q = sidebarSearch.toLowerCase();
    return (
      (!q || a.subject_name.toLowerCase().includes(q) || a.class_name.toLowerCase().includes(q)) &&
      (!sidebarStatus || a.status === sidebarStatus) &&
      (!sidebarClass || String(a.class_id) === sidebarClass)
    );
  });

  const filteredMarks = marksData?.marks.filter(m => {
    const q = markSearch.toLowerCase();
    return !q || m.student_name.toLowerCase().includes(q) || m.seat_no.toLowerCase().includes(q) || m.registration_no.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr] gap-5 items-start">

      {/* ── Sidebar ── */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-head text-lg font-bold text-zinc-900">Assignments</h2>
          <button
            className="lg:hidden text-xs font-mono border border-zinc-200 text-zinc-500 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition"
            onClick={() => setPanelOpen(o => !o)}
          >
            {panelOpen ? "Close" : "Browse"}
          </button>
        </div>

        <div className={`${panelOpen ? "block" : "hidden"} lg:block`}>
          <div className="flex flex-col gap-2 mb-3">
            <SearchBar value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search subject or class…" />
            <select
              className="w-full bg-white border border-zinc-200 rounded-xl font-mono text-xs px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
              value={sidebarClass} onChange={e => setSidebarClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
            </select>
            <select
              className="w-full bg-white border border-zinc-200 rounded-xl font-mono text-xs px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition cursor-pointer"
              value={sidebarStatus} onChange={e => setSidebarStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="submitted">Submitted</option>
              <option value="locked">Locked</option>
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col gap-1.5"><SkeletonCards count={4} /></div>
          ) : loadError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl py-6 text-center px-3">
              <p className="text-xs text-red-500 font-mono mb-2">{loadError}</p>
              <button onClick={() => window.location.reload()} className="text-xs font-mono text-red-600 underline">Retry</button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto pr-0.5">
              {filteredAssignments.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-6 font-mono">No assignments match.</p>
              ) : filteredAssignments.map(a => (
                <button
                  key={a.assignment_id}
                  onClick={() => viewMarks(a)}
                  className={`w-full text-left rounded-xl px-4 py-3 transition border ${
                    selected?.assignment_id === a.assignment_id
                      ? "border-amber-300 bg-amber-50"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-stone-50"
                  }`}
                  data-testid={`assignment-item-${a.assignment_id}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-medium text-zinc-800 text-sm truncate leading-tight">{a.subject_name}</span>
                    <TypePill type={a.mark_type} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400 font-mono truncate">{a.class_name}</span>
                    <StatusPill status={a.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Marks Detail ── */}
      <div className="min-w-0 w-full">
        {!selected ? (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl py-20 text-center">
            <p className="text-sm text-zinc-400">Select an assignment to view marks</p>
          </div>
        ) : marksLoading ? (
          <div className="flex flex-col gap-3"><SkeletonCards count={5} /></div>
        ) : marksData ? (
          <>
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="font-head text-xl font-bold text-zinc-900">{marksData.assignment.subject_name}</h2>
                  <StatusPill status={marksData.assignment.status} />
                </div>
                <p className="text-sm text-zinc-400 font-mono capitalize">{marksData.assignment.mark_type} · {marksData.assignment.class_name}</p>
              </div>
              <button
                className="font-mono text-xs bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition cursor-pointer"
                onClick={() => downloadMarks(selected)}
                data-testid="download-marks-btn"
              >
                ↓ Download Excel
              </button>
            </div>

            <SearchBar value={markSearch} onChange={e => setMarkSearch(e.target.value)} placeholder="Search student, seat or reg no…" className="mb-4 max-w-xs" />

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="marks-table">
                  <THead cols={["Seat No", "Reg No", "Student Name", "Mark"]} />
                  <tbody className="divide-y divide-zinc-50">
                    {filteredMarks.map(m => (
                      <tr key={m.mark_id} className="hover:bg-stone-50 transition">
                        <td className="px-5 py-3.5"><CodeTag>{m.seat_no}</CodeTag></td>
                        <td className="px-5 py-3.5 hidden sm:table-cell"><CodeTag>{m.registration_no}</CodeTag></td>
                        <td className="px-5 py-3.5 text-zinc-800">{m.student_name}</td>
                        <td className={`px-5 py-3.5 text-right font-mono font-medium ${m.value === null ? "text-zinc-300" : "text-zinc-900"}`}>
                          {m.value !== null ? m.value : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredMarks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-xs text-zinc-400 font-mono py-8">No students match.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

