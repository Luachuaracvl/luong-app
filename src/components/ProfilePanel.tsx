"use client";

import { useRef, useState } from "react";
import { AlertBanner } from "./AlertBanner";
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

    const trimmedName = name.trim();
    const prevProfile = profile;
    const prevName = profile.name;

    setProfile((p) => ({ ...p, name: trimmedName }));
    onUpdated?.({ ...profile, name: trimmedName });
    setMessage("Đã cập nhật hồ sơ");
    setLoading(true);

    try {
      const body: Record<string, string> = { name: trimmedName };

      if (newPassword || currentPassword || confirmPassword) {
        if (!currentPassword || !newPassword) {
          setProfile(prevProfile);
          onUpdated?.(prevProfile);
          setError("Nhập mật khẩu hiện tại và mật khẩu mới");
          setMessage("");
          return;
        }
        if (newPassword.length < 6) {
          setProfile(prevProfile);
          onUpdated?.(prevProfile);
          setError("Mật khẩu mới phải có ít nhất 6 ký tự");
          setMessage("");
          return;
        }
        if (newPassword !== confirmPassword) {
          setProfile(prevProfile);
          onUpdated?.(prevProfile);
          setError("Mật khẩu mới không khớp");
          setMessage("");
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
        setProfile(prevProfile);
        onUpdated?.(prevProfile);
        setName(prevName);
        setError(data.error || "Cập nhật thất bại");
        setMessage("");
        return;
      }

      setProfile(data.user);
      onUpdated?.(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setProfile(prevProfile);
      onUpdated?.(prevProfile);
      setName(prevName);
      setError("Không thể kết nối server");
      setMessage("");
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
    const prevProfile = profile;

    try {
      const avatarUrl = await compressImage(file);
      setProfile((p) => ({ ...p, avatarUrl }));
      onUpdated?.({ ...profile, avatarUrl });
      setMessage("Đã cập nhật avatar");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfile(prevProfile);
        onUpdated?.(prevProfile);
        setError(data.error || "Không thể cập nhật avatar");
        setMessage("");
        return;
      }
      setProfile(data.user);
      onUpdated?.(data.user);
    } catch {
      setProfile(prevProfile);
      onUpdated?.(prevProfile);
      setError("Không thể xử lý ảnh");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  async function removeAvatar() {
    const prevProfile = profile;
    setProfile((p) => ({ ...p, avatarUrl: null }));
    onUpdated?.({ ...profile, avatarUrl: null });
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
        setProfile(prevProfile);
        onUpdated?.(prevProfile);
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
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="card flex flex-col items-center text-center">
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
            className="group relative rounded-full ring-4 ring-indigo-100 transition hover:ring-indigo-200"
            title="Bấm để đổi avatar"
          >
            <UserAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Đổi ảnh
            </span>
          </button>
          <h2 className="mt-4 text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-sm text-slate-500">@{profile.username}</p>
          <span className="badge badge-blue mt-2">
            {profile.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
          </span>
          <div className="mt-4 flex w-full flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
              className="btn btn-primary w-full"
            >
              Tải avatar lên
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                disabled={loading}
                onClick={removeAvatar}
                className="btn btn-secondary w-full"
              >
                Xóa avatar
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">JPG, PNG — tối đa 5MB</p>
        </div>

        <form onSubmit={saveProfile} className="card space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900">Thông tin tài khoản</h3>
            <p className="text-sm text-slate-500">Avatar hiển thị trên chat và danh sách nhân viên</p>
          </div>

          <div>
            <label className="label">Tên đăng nhập</label>
            <input className="input bg-slate-50 text-slate-500" value={profile.username} readOnly />
          </div>

          <div>
            <label className="label">Họ tên hiển thị</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="card-section space-y-3">
            <h3 className="font-medium text-slate-800">Đổi mật khẩu</h3>
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

          <AlertBanner type="success" message={message} onDismiss={() => setMessage("")} />
          <AlertBanner type="error" message={error} onDismiss={() => setError("")} />

          <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>
    </div>
  );
}
