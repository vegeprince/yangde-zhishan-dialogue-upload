import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Upload, ImagePlus, MessageCircle, LockKeyhole, LogOut, Trash2, ExternalLink, Leaf, CheckCircle2, AlertCircle, LoaderCircle, Images } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const BUCKET = "dialogue-screenshots";
const MAX_FILES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const TOPICS = ["同學交流與心得分享", "孔老夫子與弟子", "經典智慧生活應用", "其他對話"];

function ConfigNotice() {
  return <div className="config-notice"><AlertCircle size={20}/><div><b>尚未設定 Supabase</b><p>請在部署平台設定 <code>VITE_SUPABASE_URL</code> 與 <code>VITE_SUPABASE_ANON_KEY</code>，並依 README 執行資料庫 SQL。</p></div></div>;
}
function formatDate(value) {
  try { return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return value || ""; }
}
function App() {
  const [page, setPage] = useState(window.location.hash === "#admin" ? "admin" : "upload");
  const [className, setClassName] = useState("至善班");
  const [studentName, setStudentName] = useState("");
  const [topic, setTopic] = useState("同學交流與心得分享");
  const [reflection, setReflection] = useState("");
  const [pickedFiles, setPickedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const onHash = () => setPage(window.location.hash === "#admin" ? "admin" : "upload");
    window.addEventListener("hashchange", onHash);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
      return () => { window.removeEventListener("hashchange", onHash); listener.subscription.unsubscribe(); };
    }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const filteredRows = useMemo(() => rows.filter(r => {
    const q = filter.trim().toLowerCase();
    return !q || [r.student_name, r.class_name, r.topic, r.reflection].some(v => (v || "").toLowerCase().includes(q));
  }), [rows, filter]);

  function changePage(next) {
    window.location.hash = next === "admin" ? "admin" : "";
    setPage(next);
    setNotice(null);
  }
  function onChooseFiles(event) {
    const next = Array.from(event.target.files || []);
    setNotice(null);
    if (next.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type))) {
      setNotice({ type: "error", text: "圖片僅接受 JPG、PNG、WebP 格式。" }); event.target.value = ""; return;
    }
    if (next.some(f => f.size > MAX_FILE_SIZE)) {
      setNotice({ type: "error", text: "單張圖片不可超過 8 MB，請壓縮後再上傳。" }); event.target.value = ""; return;
    }
    if (pickedFiles.length + next.length > MAX_FILES) {
      setNotice({ type: "error", text: `每次最多上傳 ${MAX_FILES} 張圖片。` }); event.target.value = ""; return;
    }
    setPickedFiles(prev => [...prev, ...next]);
    event.target.value = "";
  }
  function removeFile(index) {
    setPickedFiles(prev => prev.filter((_, i) => i !== index));
  }
  async function submitForm(event) {
    event.preventDefault();
    setNotice(null);
    if (!supabase) return setNotice({ type: "error", text: "網站尚未設定 Supabase，請聯絡管理者。" });
    if (!className.trim() || !studentName.trim()) return setNotice({ type: "error", text: "請填寫班別與姓名／暱稱。" });
    if (pickedFiles.length === 0) return setNotice({ type: "error", text: "請至少選擇一張對話截圖。" });
    setBusy(true);
    let uploadedPaths = [];
    try {
      const id = crypto.randomUUID();
      for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${id}/${i + 1}-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type, upsert: false, cacheControl: "3600"
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }
      const { error: insertError } = await supabase.from("dialogue_submissions").insert({
        class_name: className.trim(),
        student_name: studentName.trim(),
        topic,
        reflection: reflection.trim() || null,
        image_paths: uploadedPaths
      });
      if (insertError) throw insertError;
      setNotice({ type: "success", text: "提交成功！謝謝你分享學習成果。" });
      setStudentName(""); setReflection(""); setPickedFiles([]);
    } catch (error) {
      setNotice({ type: "error", text: `提交失敗：${error.message || "請稍後再試，或聯絡管理者。"}` });
      // The bucket is private. Any partially uploaded files remain inaccessible to the public.
    } finally { setBusy(false); }
  }
  async function signIn(event) {
    event.preventDefault(); setNotice(null);
    if (!supabase) return setNotice({ type: "error", text: "網站尚未設定 Supabase。" });
    setAdminLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAdminLoading(false);
    if (error) setNotice({ type: "error", text: `登入失敗：${error.message}` });
  }
  async function signOut() {
    await supabase?.auth.signOut();
    setRows([]);
  }
  async function loadRows() {
    if (!supabase || !session) return;
    setAdminLoading(true); setNotice(null);
    const { data, error } = await supabase.from("dialogue_submissions").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) setNotice({ type: "error", text: `讀取失敗：${error.message}。請確認管理員帳號與資料庫 RLS 設定。` });
    else setRows(data || []);
    setAdminLoading(false);
  }
  useEffect(() => { if (page === "admin" && session) loadRows(); }, [page, session]);

  async function openImage(path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
    if (error) setNotice({ type: "error", text: `圖片開啟失敗：${error.message}` });
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function deleteRow(row) {
    if (!window.confirm(`確定刪除「${row.student_name}」的這筆提交與圖片嗎？此操作無法復原。`)) return;
    setAdminLoading(true); setNotice(null);
    const paths = Array.isArray(row.image_paths) ? row.image_paths : [];
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) {
      setNotice({ type: "error", text: `圖片刪除失敗：${storageError.message}` }); setAdminLoading(false); return;
    }
    const { error } = await supabase.from("dialogue_submissions").delete().eq("id", row.id);
    if (error) setNotice({ type: "error", text: `資料刪除失敗：${error.message}` });
    else { setRows(prev => prev.filter(r => r.id !== row.id)); setNotice({ type: "success", text: "已刪除該筆提交。" }); }
    setAdminLoading(false);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Leaf size={25}/></div><div><strong>暘德至善班</strong><span>班員對話上傳專區</span></div></div>
      <nav><button className={page === "upload" ? "nav-active" : "nav-link"} onClick={() => changePage("upload")}>成果上傳</button><button className={page === "admin" ? "nav-active" : "nav-link"} onClick={() => changePage("admin")}>管理端</button></nav>
    </header>

    <main>
      {!supabase && <ConfigNotice/>}
      {notice && <div className={`notice ${notice.type}`}><span>{notice.type === "success" ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}</span><div>{notice.text}</div><button aria-label="關閉訊息" onClick={() => setNotice(null)}>×</button></div>}

      {page === "upload" ? <section className="hero-layout">
        <div className="intro">
          <div className="eyebrow"><MessageCircle size={16}/> DIALOGUE SHARING</div>
          <h1>把每一次交流，<br/><em>留下成長的紀錄。</em></h1>
          <p>上傳你的 LINE 對話截圖，分享同學交流與心得。讓每一次真誠的互動，都成為學習路上的養分。</p>
          <div className="feature-row"><span><CheckCircle2 size={17}/> 免登入提交</span><span><Images size={17}/> 最多 8 張圖片</span><span><LockKeyhole size={17}/> 圖片私密保存</span></div>
          <div className="privacy-note"><LockKeyhole size={18}/><span>上傳前請遮蔽電話、帳號等個人資料。提交內容僅供課程管理者查看。</span></div>
        </div>
        <section className="form-card">
          <div className="card-heading"><div className="heading-icon"><Upload size={21}/></div><div><h2>班員對話上傳</h2><p>請填妥資料並附上對話截圖</p></div></div>
          <form onSubmit={submitForm}>
            <div className="field"><label htmlFor="className">班別 <b>*</b></label><input id="className" value={className} onChange={e => setClassName(e.target.value)} required maxLength={80}/></div>
            <div className="field"><label htmlFor="studentName">姓名／暱稱 <b>*</b></label><input id="studentName" value={studentName} onChange={e => setStudentName(e.target.value)} required maxLength={100} placeholder="請輸入姓名或暱稱"/></div>
            <div className="field"><label htmlFor="topic">對話主題 <b>*</b></label><select id="topic" value={topic} onChange={e => setTopic(e.target.value)}>{TOPICS.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label htmlFor="reflection">學習心得 <span>選填</span></label><textarea id="reflection" value={reflection} onChange={e => setReflection(e.target.value)} rows={4} maxLength={2000} placeholder="這次對話帶給你什麼啟發？你想把哪一句話實踐在生活中？"/></div>
            <div className="field"><label>對話截圖 <b>*</b><span>最多 {MAX_FILES} 張，每張 8 MB 內</span></label>
              <label className="upload-zone" htmlFor="file-input"><div className="upload-icon"><ImagePlus size={25}/></div><strong>點擊選擇圖片</strong><span>JPG、PNG、WebP 格式</span><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChooseFiles} disabled={pickedFiles.length >= MAX_FILES}/></label>
              {pickedFiles.length > 0 && <div className="file-list">{pickedFiles.map((f, i) => <div className="file-item" key={`${f.name}-${i}`}><div className="file-thumb"><ImagePlus size={18}/></div><div className="file-info"><b>{f.name}</b><span>{(f.size / 1024 / 1024).toFixed(2)} MB</span></div><button type="button" className="remove-file" onClick={() => removeFile(i)} aria-label="移除圖片">×</button></div>)}</div>}
            </div>
            <button className="submit-button" disabled={busy || !supabase}>{busy ? <><LoaderCircle className="spin" size={19}/> 上傳中，請稍候…</> : <><Upload size={19}/> 送出學習成果</>}</button>
            <p className="form-footnote">按下送出即表示你同意將本次提交內容提供給課程管理者閱覽。</p>
          </form>
        </section>
      </section> : <section className="admin-section">
        {!session ? <div className="login-card"><div className="login-symbol"><LockKeyhole size={28}/></div><h1>管理端登入</h1><p>請使用 Supabase 後台建立的管理員帳號登入。</p><form onSubmit={signIn}><div className="field"><label htmlFor="email">管理員 Email</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" placeholder="admin@example.com"/></div><div className="field"><label htmlFor="password">密碼</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="輸入管理員密碼"/></div><button className="submit-button" disabled={adminLoading || !supabase}>{adminLoading ? <LoaderCircle className="spin" size={18}/> : <LockKeyhole size={18}/>} 登入管理端</button></form><p className="form-footnote">此模組不提供公開註冊。請在 Supabase Authentication 中由管理者建立帳號。</p></div> :
          <><div className="admin-heading"><div><div className="eyebrow">ADMIN DASHBOARD</div><h1>班員對話管理</h1><p>檢視提交內容、開啟私密圖片或刪除資料。</p></div><button className="outline-button" onClick={signOut}><LogOut size={17}/> 登出</button></div>
            <div className="admin-toolbar"><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜尋姓名、班別、主題或心得…"/><button className="outline-button" onClick={loadRows} disabled={adminLoading}>{adminLoading ? <LoaderCircle className="spin" size={17}/> : "重新整理"}</button></div>
            <div className="stats"><div><span>提交筆數</span><strong>{rows.length}</strong></div><div><span>目前篩選</span><strong>{filteredRows.length}</strong></div></div>
            {filteredRows.length === 0 ? <div className="empty-state"><Images size={36}/><h3>{rows.length ? "沒有符合的資料" : "尚無提交紀錄"}</h3><p>班員提交後，資料會顯示在這裡。</p></div> :
              <div className="submission-list">{filteredRows.map(row => <article className="submission-card" key={row.id}><div className="submission-top"><div><span className="class-pill">{row.class_name}</span><h3>{row.student_name}</h3><p>{row.topic} · {formatDate(row.created_at)}</p></div><button className="delete-button" onClick={() => deleteRow(row)} disabled={adminLoading}><Trash2 size={17}/> 刪除</button></div>{row.reflection && <div className="reflection"><b>學習心得</b><p>{row.reflection}</p></div>}<div className="image-links">{(Array.isArray(row.image_paths) ? row.image_paths : []).map((path, i) => <button className="image-link" key={path} onClick={() => openImage(path)}><ImagePlus size={17}/> 對話截圖 {i + 1}<ExternalLink size={14}/></button>)}</div></article>)}</div>}
          </>}
      </section>}
    </main>
    <footer><div className="footer-brand"><Leaf size={17}/> 暘德至善班</div><span>以真誠交流，累積學習的力量。</span><button onClick={() => changePage("admin")}>管理端入口</button></footer>
  </div>;
}
export default App;