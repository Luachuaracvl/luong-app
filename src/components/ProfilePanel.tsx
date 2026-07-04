"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";

type ProfileUser = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
};

async function compressImage(file: File, maxSize = 256, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không thể xử lý ảnh"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Ảnh không hợp lệ"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsDataURL(file);
  });
}

export function ProfilePanel({
  user,
  onUpdated,
}: {
  user: ProfileUser;
  onUpdated?: (profile: ProfileUser) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = { name: name.trim() };

      if (newPassword || currentPassword || confirmPassword) {
        if (!currentPassword || !newPassword) {
          setError("Nhập mật khẩu hiện tại và mật khẩu mới");
          return;
        }
        if (newPassword.length < 6) {
          setError("Mật khẩu mới phải có ít nhất 6 ký tự");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("Mật khẩu mới không khớp");
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Cập nhật thất bại");
        return;
      }

      setProfile(data.user);
      onUpdated?.(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã cập nhật hồ sơ");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB");
      return;
    }

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const avatarUrl = await compressImage(file);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể cập nhật avatar");
        return;
      }
      setProfile(data.user);
      onUpdated?.(data.user);
      setMessage("Đã cập nhật avatar");
    } catch {
      setError("Không thể xử lý ảnh");
    } finally {
      setLoading(false);
    }
  }

  async function removeAvatar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể xóa avatar");
        return;
      }
      setProfile(data.user);
      onUpdated?.(data.user);
      setMessage("Đã xóa avatar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Hồ sơ cá nhân</h2>
        <p className="text-sm text-slate-500">@{profile.username}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="btn btn-secondary"
          >
            Đổi avatar
          </button>
          {profile.avatarUrl && (
            <button
              type="button"
              disabled={loading}
              onClick={removeAvatar}
              className="btn btn-secondary ml-2"
            >
              Xóa avatar
            </button>
          )}
          <p className="text-xs text-slate-400">JPG, PNG — tự nén trước khi lưu</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="label">Họ tên hiển thị</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 font-medium">Đổi mật khẩu</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Mật khẩu hiện tại</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label">Mật khẩu mới</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Nhập lại mật khẩu mới</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
