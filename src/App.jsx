import React, { useState, useEffect, useRef, useCallback } from "react";
import PantryPlate from "./PantryPlate.jsx";
import ReloadPrompt from "./ReloadPrompt.jsx";
import ProfilePicker from "./ProfilePicker.jsx";
import {
  PROFILE_KEY, listProfiles, loadProfile, saveProfile, createProfile,
  gatherLocalData, applyDataToLocal, clearLocalData,
} from "./sync.js";

function readProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; }
}

export default function App() {
  const [profile] = useState(readProfile);
  const [ready, setReady] = useState(false);

  // Bootstrap: pull the current profile's cloud data into localStorage BEFORE
  // PantryPlate mounts (so its state initialises from the freshest data).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (profile && navigator.onLine) {
        try {
          const data = await loadProfile(profile.id);
          if (!cancelled && data) applyDataToLocal(data);
        } catch (e) {
          console.warn("sync: initial load failed, using local copy", e);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [profile]);

  // Push local changes to the cloud (debounced), triggered by saveKey's "pp:sync"
  // event and by coming back online.
  const timer = useRef(null);
  useEffect(() => {
    if (!profile) return;
    const push = () => {
      if (!navigator.onLine) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveProfile(profile.id, profile.name, gatherLocalData())
          .catch((e) => console.warn("sync: push failed", e));
      }, 700);
    };
    window.addEventListener("pp:sync", push);
    window.addEventListener("online", push);
    return () => {
      window.removeEventListener("pp:sync", push);
      window.removeEventListener("online", push);
      clearTimeout(timer.current);
    };
  }, [profile]);

  // Pick an existing profile: load fresh into localStorage, then reload to re-init.
  const pickProfile = useCallback((p) => {
    clearLocalData();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ id: p.id, name: p.name }));
    window.location.reload();
  }, []);

  // Create a new profile seeded with whatever's currently on this device.
  const createNewProfile = useCallback(async (name) => {
    try {
      const p = await createProfile(name, gatherLocalData());
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      window.location.reload();
    } catch (e) {
      console.error("sync: create profile failed", e);
      alert("Couldn't create the profile — check your connection and try again.");
    }
  }, []);

  // Switch profiles: drop local working data and return to the picker.
  const switchProfile = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY);
    clearLocalData();
    window.location.reload();
  }, []);

  if (!profile) {
    return <ProfilePicker onPick={pickProfile} onCreate={createNewProfile} />;
  }
  if (!ready) {
    return <div style={bootStyle}>Loading {profile.name}'s kitchen…</div>;
  }
  return (
    <>
      <PantryPlate currentProfile={profile} onSwitchProfile={switchProfile} />
      <ReloadPrompt />
    </>
  );
}

const bootStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  fontFamily: "'Inter', system-ui, sans-serif",
  color: "#5A6B5E",
  fontSize: 15,
  background: "radial-gradient(1100px 620px at 50% -8%, #FCFEF9 0%, #F2F6EC 48%, #E9F0DF 100%)",
};
