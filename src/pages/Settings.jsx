import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ROADMAP_STAGES, labelize } from '../lib/enums'
import { nameColor } from '../lib/tiers'
import Avatar from '../components/Avatar'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export default function Settings() {
  const { profile } = useAuth()

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Settings</h1>
      <ProfilePanel profile={profile} />
      <PasswordPanel profile={profile} />
    </div>
  )
}

// ------------------------------------------------------------------
// Display name, avatar, roadmap stage — all three are self-service at the
// same permission level: they update only this user's own users row (RLS
// policy users_update_own + the 0006 trigger that blocks any other column
// from changing on a non-mentor's self-update).
// ------------------------------------------------------------------
function ProfilePanel({ profile }) {
  const { refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [roadmapStage, setRoadmapStage] = useState(profile.roadmap_stage)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!displayName.trim()) {
      setProfileError('Display name is required.')
      return
    }

    setSavingProfile(true)
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName.trim(), roadmap_stage: roadmapStage })
      .eq('id', profile.id)
    setSavingProfile(false)

    if (error) {
      setProfileError(error.message)
      return
    }

    setProfileSuccess('Profile updated.')
    await refreshProfile()
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setAvatarError('')

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be under 5MB.')
      return
    }

    setUploadingAvatar(true)

    // Fixed key per user (no extension) so re-uploading always replaces the
    // same object instead of leaving orphaned files behind when someone
    // switches from a .png to a .jpg — storage policy scopes writes to this
    // folder via auth.uid(), Content-Type comes from the upload, not the key.
    const path = `${profile.id}/avatar`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })

    if (uploadError) {
      setUploadingAvatar(false)
      setAvatarError(uploadError.message)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the new image shows immediately — the object key never
    // changes on replace, so without this the browser/CDN can keep serving
    // the old cached image at the same URL.
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    setUploadingAvatar(false)

    if (updateError) {
      setAvatarError(updateError.message)
      return
    }

    await refreshProfile()
  }

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Profile</h2>
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar url={profile.avatar_url} name={profile.display_name} size={64} color={nameColor(profile)} />
          <div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                style={{ display: 'none' }}
              />
            </label>
            {avatarError && <p className="error-text" style={{ margin: '8px 0 0' }}>{avatarError}</p>}
          </div>
        </div>

        <form onSubmit={handleProfileSubmit}>
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="roadmap-stage">Roadmap stage</label>
            <select id="roadmap-stage" value={roadmapStage} onChange={(e) => setRoadmapStage(e.target.value)}>
              {ROADMAP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </select>
          </div>
          {profileError && <p className="error-text">{profileError}</p>}
          {profileSuccess && <p style={{ color: 'var(--green)', fontSize: 14 }}>{profileSuccess}</p>}
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// Password change. supabase.auth.updateUser({ password }) only requires an
// active session — it does not ask for the existing password, so anyone
// with access to an already-signed-in browser could change it. We close
// that gap by re-verifying the current password first via a real
// signInWithPassword call before allowing updateUser to run.
// ------------------------------------------------------------------
function PasswordPanel({ profile }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setChanging(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })

    if (verifyError) {
      setChanging(false)
      setError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setChanging(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess('Password changed.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Password</h2>
      <form className="panel" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p style={{ color: 'var(--green)', fontSize: 14 }}>{success}</p>}
        <button type="submit" className="btn btn-primary" disabled={changing}>
          {changing ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
