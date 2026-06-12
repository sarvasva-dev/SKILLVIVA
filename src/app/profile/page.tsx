"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [message, setMessage] = useState<{text: string, type: 'error'|'success'} | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [meRes, rolesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/roles")
        ]);

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await meRes.json();
        setName(userData.name || "");
        
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const roleNames = Array.isArray(rolesData) ? rolesData.map((r: any) => r.name) : [];
          setRoles(roleNames);
          
          if (userData.targetRole && !roleNames.includes(userData.targetRole)) {
            setSelectedRole("Other");
            setCustomRole(userData.targetRole);
          } else {
            setSelectedRole(userData.targetRole || "");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const finalRole = selectedRole === "Other" ? customRole : selectedRole;

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetRole: finalRole })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Failed to update profile", type: "error" });
      } else {
        setMessage({ text: "Profile updated successfully!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#222] border-t-[#e63329] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-[#555] text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar userName={name} targetRole={selectedRole === "Other" ? customRole : selectedRole} activeTab="profile" />
      
      <main className="max-w-2xl w-full mx-auto px-4 py-8 pb-24 sm:pt-8 pt-6">
        <div className="mb-8 text-center fade-up">
          <div className="tag tag-red mb-2 inline-block">YOUR SETTINGS</div>
          <h1 className="brush-text text-white text-5xl mt-2">YOUR PROFILE</h1>
          <p className="font-body text-[#555] text-sm uppercase tracking-widest mt-2">Update your arena configuration</p>
        </div>

        <div className="card-gritty fade-up fade-up-delay-1">
          {message && (
            <div className={`p-4 mb-6 border font-body text-xs uppercase tracking-widest text-center ${message.type === 'success' ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/10' : 'border-[#e63329] text-[#e63329] bg-[#e63329]/10'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="font-body text-[#888] text-xs uppercase tracking-widest block mb-2">Display Name</label>
              <input 
                type="text" 
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-gritty"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="font-body text-[#888] text-xs uppercase tracking-widest block mb-2">Target Role</label>
              <select 
                className="input-gritty appearance-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
              >
                <option value="" disabled>Select your role</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="Other">Other (Custom Role)</option>
              </select>
            </div>

            {selectedRole === "Other" && (
               <div className="fade-up">
                <label className="font-body text-[#888] text-xs uppercase tracking-widest block mb-2">Custom Role</label>
                <input 
                  type="text" 
                  required
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="input-gritty"
                  placeholder="e.g. Blockchain Developer"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary w-full justify-center mt-6 bg-[#e63329] text-white py-4 text-lg border-0"
            >
              {saving ? "SAVING..." : "▶ SAVE CHANGES"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}