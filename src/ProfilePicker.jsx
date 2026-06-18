import React, { useState, useEffect } from "react";
import { Sprout, Plus, UserRound, X } from "lucide-react";
import { listProfiles } from "./sync.js";

export default function ProfilePicker({ onPick, onCreate }) {
  const [profiles, setProfiles] = useState(null); // null = loading
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProfiles()
      .then((p) => { if (!cancelled) setProfiles(p); })
      .catch(() => { if (!cancelled) { setProfiles([]); setError("Couldn't reach the cloud — check your connection."); } });
    return () => { cancelled = true; };
  }, []);

  const submit = () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    onCreate(n);
  };

  return (
    <div className="pp-pick">
      <style>{CSS}</style>
      <div className="pp-pick-head">
        <div className="pp-pick-mark"><Sprout size={26} strokeWidth={2.2} /></div>
        <h1>Pantry&thinsp;Plate</h1>
        <p>Who's cooking?</p>
      </div>

      {profiles === null ? (
        <p className="pp-pick-loading">Loading profiles…</p>
      ) : (
        <div className="pp-pick-grid">
          {profiles.map((p) => (
            <button key={p.id} className="pp-pick-card" onClick={() => onPick(p)} disabled={busy}>
              <span className="pp-pick-avatar"><UserRound size={26} strokeWidth={2} /></span>
              <span className="pp-pick-name">{p.name}</span>
            </button>
          ))}
          <button className="pp-pick-card add" onClick={() => setAdding(true)} disabled={busy}>
            <span className="pp-pick-avatar add"><Plus size={26} strokeWidth={2.4} /></span>
            <span className="pp-pick-name">Add someone</span>
          </button>
        </div>
      )}

      {error && <p className="pp-pick-error">{error}</p>}

      {adding && (
        <div className="pp-pick-overlay" onClick={() => !busy && setAdding(false)}>
          <div className="pp-pick-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pp-pick-close" onClick={() => setAdding(false)} aria-label="Cancel"><X size={18} /></button>
            <h2>New profile</h2>
            <p>Pick a name — this is how your plan follows you across devices.</p>
            <input autoFocus value={name} maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Cole" />
            <button className="pp-pick-create" onClick={submit} disabled={!name.trim() || busy}>
              {busy ? "Creating…" : "Create profile"}
            </button>
          </div>
        </div>
      )}

      <p className="pp-pick-foot">Your plan, favorites, and shopping list sync to this name on every device.</p>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap');
.pp-pick{
  --green:#1F4D32; --green-mid:#3F7A50; --sprout:#84B26A; --ink:#16241B; --soft:#5A6B5E; --line:#E0E7D9;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink);
  min-height:100vh; box-sizing:border-box; padding:40px 20px 60px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:radial-gradient(1100px 620px at 50% -8%, #FCFEF9 0%, #F2F6EC 48%, #E9F0DF 100%);
}
.pp-pick *{box-sizing:border-box}
.pp-pick-head{text-align:center; margin-bottom:30px}
.pp-pick-mark{width:60px; height:60px; border-radius:18px; margin:0 auto 14px; display:grid; place-items:center;
  background:linear-gradient(150deg,#2E6A45,#1B4429); color:#EAF3E2; box-shadow:0 10px 24px -12px rgba(31,77,50,.7)}
.pp-pick-head h1{font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:30px; color:var(--green); margin:0; letter-spacing:-.02em}
.pp-pick-head p{font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:18px; color:var(--soft); margin:8px 0 0}
.pp-pick-loading{color:var(--soft); font-size:14px}
.pp-pick-grid{display:flex; flex-wrap:wrap; gap:16px; justify-content:center; max-width:560px}
.pp-pick-card{display:flex; flex-direction:column; align-items:center; gap:10px; width:120px; padding:18px 12px;
  background:#fff; border:1px solid var(--line); border-radius:18px; cursor:pointer;
  transition:transform .15s, box-shadow .15s, border-color .15s; font-family:inherit}
.pp-pick-card:hover:not(:disabled){transform:translateY(-3px); box-shadow:0 16px 30px -18px rgba(22,36,27,.45); border-color:var(--sprout)}
.pp-pick-card:disabled{opacity:.5; cursor:default}
.pp-pick-avatar{width:58px; height:58px; border-radius:50%; display:grid; place-items:center; background:#E6F0DD; color:var(--green)}
.pp-pick-avatar.add{background:#F1F5EC; color:var(--green-mid)}
.pp-pick-card.add{border-style:dashed}
.pp-pick-name{font-size:15px; font-weight:600; color:var(--ink); text-align:center; line-height:1.2}
.pp-pick-error{color:#B0492F; font-size:13px; margin-top:18px}
.pp-pick-foot{color:var(--soft); font-size:12.5px; margin-top:34px; max-width:420px; text-align:center}
.pp-pick-overlay{position:fixed; inset:0; background:rgba(22,36,27,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50}
.pp-pick-modal{background:#fff; border-radius:20px; padding:26px 24px; width:100%; max-width:380px; position:relative; box-shadow:0 30px 60px -20px rgba(22,36,27,.5)}
.pp-pick-modal h2{font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:22px; color:var(--ink); margin:0}
.pp-pick-modal p{font-size:13.5px; color:var(--soft); margin:8px 0 16px}
.pp-pick-modal input{width:100%; font-family:inherit; font-size:16px; color:var(--ink); border:1px solid var(--line); border-radius:11px; padding:12px 13px; background:#FBFDF9; outline:none}
.pp-pick-modal input:focus{border-color:var(--sprout)}
.pp-pick-create{width:100%; margin-top:14px; background:var(--green); color:#fff; border:none; border-radius:11px; padding:12px; font-family:inherit; font-weight:600; font-size:15px; cursor:pointer}
.pp-pick-create:hover:not(:disabled){background:#173d27}
.pp-pick-create:disabled{opacity:.45; cursor:default}
.pp-pick-close{position:absolute; top:14px; right:14px; background:#F1F5EC; border:none; border-radius:9px; width:32px; height:32px; display:grid; place-items:center; color:var(--soft); cursor:pointer}
`;
