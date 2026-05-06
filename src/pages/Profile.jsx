import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { uploadImage } from '../lib/cloudflare'
import useAuthStore from '../store/authStore'
import { LIVESTOCK_CATEGORIES, ZIMBABWE_PROVINCES } from '../hooks/useListing'
import './Profile.css'

const COUNTRIES = ['Zimbabwe', 'South Africa', 'Zambia', 'Botswana', 'Mozambique', 'Other']

// ── mock listings (replace with Firestore fetch) ──
const MOCK_LISTINGS = [
  { id: 'l1', title: '2 Brahman Bulls',      price: 850,  currency: 'USD', status: 'active',  photos: [{ url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=70' }], categoryLabel: 'Cattle',  createdAt: { seconds: Date.now()/1000 - 86400*2 } },
  { id: 'l2', title: '5 Boer Goats',         price: 220,  currency: 'USD', status: 'active',  photos: [{ url: 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=400&q=70' }], categoryLabel: 'Goats',   createdAt: { seconds: Date.now()/1000 - 86400*5 } },
  { id: 'l3', title: 'Road Runner Chickens', price: 12,   currency: 'USD', status: 'sold',    photos: [{ url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=70' }], categoryLabel: 'Chicken', createdAt: { seconds: Date.now()/1000 - 86400*10 } },
]

function timeAgo(seconds) {
  const d = Date.now()/1000 - seconds
  if (d < 3600)  return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, sellerProfile, fetchSellerProfile, logout } = useAuthStore()
  const photoInputRef = useRef()

  const [profile, setProfile]       = useState(sellerProfile || {})
  const [listings, setListings]     = useState(MOCK_LISTINGS)
  const [activeTab, setActiveTab]   = useState('active')
  const [editing, setEditing]       = useState(null)   // 'bio' | 'contact' | 'location' | 'livestock'
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [draft, setDraft]           = useState({})

  useEffect(() => {
    if (sellerProfile) setProfile(sellerProfile)
  }, [sellerProfile])

  // Uncomment to fetch real listings:
  // useEffect(() => {
  //   if (!user) return
  //   getDocs(query(collection(db,'listings'), where('sellerId','==',user.uid), orderBy('createdAt','desc')))
  //     .then(snap => setListings(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  // }, [user])

  const startEdit = (section) => {
    setDraft({ ...profile })
    setEditing(section)
  }

  const cancelEdit = () => { setEditing(null); setDraft({}) }

  const updateDraft = (fields) => setDraft(d => ({ ...d, ...fields }))

  const toggleLivestock = (type) => {
    const curr = draft.livestockTypes || []
    updateDraft({
      livestockTypes: curr.includes(type)
        ? curr.filter(t => t !== type)
        : [...curr, type]
    })
  }

  const saveSection = async () => {
    if (!user) return
    setSaving(true)
    try {
      const ref = doc(db, 'sellers', user.uid)
      await updateDoc(ref, { ...draft, updatedAt: serverTimestamp() })
      setProfile(p => ({ ...p, ...draft }))
      useAuthStore.setState({ sellerProfile: { ...profile, ...draft } })
      setEditing(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setPhotoLoading(true)
    try {
      const token = await user.getIdToken()
      const result = await uploadImage(file, 'sellers', token)
      const ref = doc(db, 'sellers', user.uid)
      await updateDoc(ref, { photoUrl: result.url, updatedAt: serverTimestamp() })
      setProfile(p => ({ ...p, photoUrl: result.url }))
      useAuthStore.setState({ sellerProfile: { ...profile, photoUrl: result.url } })
    } catch (e) {
      console.error(e)
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const filteredListings = listings.filter(l =>
    activeTab === 'all' ? true : l.status === activeTab
  )

  const stats = {
    active: listings.filter(l => l.status === 'active').length,
    sold:   listings.filter(l => l.status === 'sold').length,
    total:  listings.length,
  }

  return (
    <div className="profile-page">

      {/* ── HEADER BAND ── */}
      <div className="profile-header">
        <div className="ph-pattern" aria-hidden="true">
          <WeavePattern />
        </div>

        <div className="ph-inner">
          {/* Back nav */}
          <div className="ph-nav">
            <Link to="/seller/dashboard" className="ph-back">← Dashboard</Link>
            <button className="ph-logout-btn" onClick={handleLogout}>Sign out</button>
          </div>

          {/* Avatar + name */}
          <div className="ph-identity">
            <div className="ph-avatar-wrap">
              <div className="ph-avatar">
                {profile.photoUrl
                  ? <img src={profile.photoUrl} alt={profile.businessName} />
                  : <span className="ph-initial">{profile.businessName?.[0] || user?.email?.[0] || 'S'}</span>
                }
                {photoLoading && <div className="ph-avatar-loading"><Spinner /></div>}
              </div>
              <button
                className="ph-avatar-edit"
                onClick={() => photoInputRef.current?.click()}
                title="Change photo"
                disabled={photoLoading}
              >
                <CameraIcon />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>

            <div className="ph-name-block">
              <h1 className="ph-name">{profile.businessName || 'Your Farm'}</h1>
              <p className="ph-location">
                📍 {[profile.city, profile.province, profile.country].filter(Boolean).join(', ') || 'Location not set'}
              </p>
              {profile.verified && <span className="ph-verified">✓ Verified seller</span>}
            </div>

            <div className="ph-stats">
              <div className="phs"><strong>{stats.active}</strong><span>Active</span></div>
              <div className="phs"><strong>{stats.sold}</strong><span>Sold</span></div>
              <div className="phs"><strong>{stats.total}</strong><span>Total</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="profile-body">

        {/* ── LEFT: editable sections ── */}
        <div className="profile-left">

          {saved && (
            <div className="save-toast">
              <CheckIcon /> Profile updated
            </div>
          )}

          {/* Bio section */}
          <Section
            title="About your farm"
            onEdit={() => startEdit('bio')}
            editing={editing === 'bio'}
            onSave={saveSection}
            onCancel={cancelEdit}
            saving={saving}
          >
            {editing === 'bio' ? (
              <div className="edit-fields">
                <Field label="Farm / business name">
                  <input
                    type="text"
                    value={draft.businessName || ''}
                    onChange={e => updateDraft({ businessName: e.target.value })}
                    placeholder="e.g. Mutasa Livestock Farm"
                  />
                </Field>
                <Field label="About your farm">
                  <textarea
                    rows={4}
                    value={draft.description || ''}
                    onChange={e => updateDraft({ description: e.target.value })}
                    placeholder="Tell buyers about your experience, breeds you raise…"
                    maxLength={600}
                  />
                  <span className="char-count">{(draft.description||'').length}/600</span>
                </Field>
              </div>
            ) : (
              <div className="view-fields">
                <p className="vf-name">{profile.businessName || <em className="empty">Not set</em>}</p>
                {profile.description
                  ? <p className="vf-desc">{profile.description}</p>
                  : <p className="empty">No description yet. Tell buyers about your farm.</p>
                }
              </div>
            )}
          </Section>

          {/* Contact section */}
          <Section
            title="Contact details"
            onEdit={() => startEdit('contact')}
            editing={editing === 'contact'}
            onSave={saveSection}
            onCancel={cancelEdit}
            saving={saving}
          >
            {editing === 'contact' ? (
              <div className="edit-fields">
                <div className="field-row-2">
                  <Field label="Phone">
                    <input type="tel" value={draft.phone||''} onChange={e => updateDraft({ phone: e.target.value })} placeholder="+263 77 000 0000" />
                  </Field>
                  <Field label="WhatsApp">
                    <input type="tel" value={draft.whatsapp||''} onChange={e => updateDraft({ whatsapp: e.target.value })} placeholder="Same as phone?" />
                  </Field>
                </div>
                <Field label="Email (visible to buyers)">
                  <input type="email" value={draft.publicEmail||''} onChange={e => updateDraft({ publicEmail: e.target.value })} placeholder="optional" />
                </Field>
              </div>
            ) : (
              <div className="view-fields contact-view">
                <ContactRow icon="📞" label="Phone"    value={profile.phone} />
                <ContactRow icon="💬" label="WhatsApp" value={profile.whatsapp} />
                <ContactRow icon="✉️" label="Email"    value={profile.publicEmail} />
              </div>
            )}
          </Section>

          {/* Location section */}
          <Section
            title="Location"
            onEdit={() => startEdit('location')}
            editing={editing === 'location'}
            onSave={saveSection}
            onCancel={cancelEdit}
            saving={saving}
          >
            {editing === 'location' ? (
              <div className="edit-fields">
                <Field label="Country">
                  <select value={draft.country||'Zimbabwe'} onChange={e => updateDraft({ country: e.target.value, province: '' })}>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <div className="field-row-2">
                  <Field label={draft.country === 'Zimbabwe' ? 'Province' : 'Region'}>
                    {draft.country === 'Zimbabwe'
                      ? (
                        <select value={draft.province||''} onChange={e => updateDraft({ province: e.target.value })}>
                          <option value="">Select province</option>
                          {ZIMBABWE_PROVINCES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      )
                      : <input type="text" value={draft.province||''} onChange={e => updateDraft({ province: e.target.value })} placeholder="Your region" />
                    }
                  </Field>
                  <Field label="City / Town">
                    <input type="text" value={draft.city||''} onChange={e => updateDraft({ city: e.target.value })} placeholder="e.g. Marondera" />
                  </Field>
                </div>
                <Field label="Farm address / area (optional)">
                  <input type="text" value={draft.address||''} onChange={e => updateDraft({ address: e.target.value })} placeholder="e.g. Beatrice Road" />
                </Field>
              </div>
            ) : (
              <div className="view-fields">
                <p className="location-display">
                  📍 {[profile.address, profile.city, profile.province, profile.country].filter(Boolean).join(', ') || <em className="empty">Location not set</em>}
                </p>
              </div>
            )}
          </Section>

          {/* Livestock types section */}
          <Section
            title="Livestock I sell"
            onEdit={() => startEdit('livestock')}
            editing={editing === 'livestock'}
            onSave={saveSection}
            onCancel={cancelEdit}
            saving={saving}
          >
            {editing === 'livestock' ? (
              <div className="livestock-picker">
                {LIVESTOCK_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`ls-chip ${(draft.livestockTypes||[]).includes(cat.label) ? 'selected' : ''}`}
                    onClick={() => toggleLivestock(cat.label)}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="livestock-display">
                {(profile.livestockTypes || []).length > 0
                  ? (profile.livestockTypes.map(t => {
                      const cat = LIVESTOCK_CATEGORIES.find(c => c.label === t)
                      return (
                        <span key={t} className="ls-tag">
                          {cat?.emoji || '🐾'} {t}
                        </span>
                      )
                    }))
                  : <p className="empty">No livestock types added yet.</p>
                }
              </div>
            )}
          </Section>

          {/* Danger zone */}
          <div className="danger-zone">
            <h3>Account</h3>
            <div className="danger-actions">
              <button className="danger-btn logout" onClick={handleLogout}>
                <LogoutIcon /> Sign out
              </button>
              <button className="danger-btn delete" onClick={() => alert('Contact support to delete your account.')}>
                <TrashIcon /> Delete account
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: listings ── */}
        <div className="profile-right">
          <div className="listings-panel">
            <div className="lp-header">
              <h2>My listings</h2>
              <Link to="/sell" className="btn-new-listing">+ New listing</Link>
            </div>

            <div className="lp-tabs">
              {[
                { key: 'active', label: `Active (${stats.active})` },
                { key: 'sold',   label: `Sold (${stats.sold})` },
                { key: 'all',    label: `All (${stats.total})` },
              ].map(t => (
                <button
                  key={t.key}
                  className={`lp-tab ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {filteredListings.length === 0 ? (
              <div className="lp-empty">
                <span>🐾</span>
                <p>No {activeTab === 'all' ? '' : activeTab} listings yet.</p>
                <Link to="/sell" className="btn-new-listing">Post your first listing</Link>
              </div>
            ) : (
              <div className="lp-grid">
                {filteredListings.map((l, i) => (
                  <ListingRow key={l.id} listing={l} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Section({ title, onEdit, editing, onSave, onCancel, saving, children }) {
  return (
    <div className={`profile-section ${editing ? 'is-editing' : ''}`}>
      <div className="ps-header">
        <h3>{title}</h3>
        {!editing && (
          <button className="ps-edit-btn" onClick={onEdit}>Edit</button>
        )}
      </div>
      <div className="ps-body">{children}</div>
      {editing && (
        <div className="ps-actions">
          <button className="ps-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="ps-save" onClick={onSave} disabled={saving}>
            {saving ? <><Spinner /> Saving…</> : <><CheckIcon /> Save changes</>}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="profile-field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function ContactRow({ icon, label, value }) {
  return (
    <div className="contact-row">
      <span className="cr-icon">{icon}</span>
      <span className="cr-label">{label}</span>
      <span className="cr-value">{value || <em className="empty">Not set</em>}</span>
    </div>
  )
}

function ListingRow({ listing, index }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="listing-row"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="lr-img">
        {listing.photos?.[0]?.url
          ? <img src={listing.photos[0].url} alt={listing.title} />
          : <span className="lr-no-img">🐾</span>
        }
      </div>
      <div className="lr-info">
        <p className="lr-title">{listing.title}</p>
        <p className="lr-meta">{listing.categoryLabel} · {timeAgo(listing.createdAt.seconds)}</p>
      </div>
      <div className="lr-right">
        <p className="lr-price">{listing.currency} {listing.price.toLocaleString()}</p>
        <span className={`lr-status ${listing.status}`}>{listing.status}</span>
      </div>
    </Link>
  )
}

/* ── Icons ── */
function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}

function Spinner() {
  return <span className="inline-spinner" aria-hidden="true" />
}

function WeavePattern() {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="weave" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none"/>
          <path d="M0 10 Q5 5 10 10 Q15 15 20 10" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" fill="none"/>
          <path d="M0 0 Q5 5 10 0 Q15 -5 20 0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none"/>
          <path d="M0 20 Q5 15 10 20 Q15 25 20 20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#weave)"/>
    </svg>
  )
}