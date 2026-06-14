import { useState, useEffect } from 'react'

const styles = `
  @keyframes nudge-down {
    0%   { transform: translateY(0); }
    40%  { transform: translateY(3px); }
    70%  { transform: translateY(-1px); }
    100% { transform: translateY(0); }
  }

  .install-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 22px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow:
      0 2px 8px rgba(15, 52, 96, 0.35),
      0 1px 2px rgba(0,0,0,0.2),
      inset 0 1px 0 rgba(255,255,255,0.08);
    transition: box-shadow 0.2s ease, transform 0.15s ease, background 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .install-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%);
    border-radius: inherit;
    pointer-events: none;
  }

  .install-btn:hover {
    box-shadow:
      0 4px 16px rgba(15, 52, 96, 0.5),
      0 2px 4px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.1);
    transform: translateY(-1px);
  }

  .install-btn:active {
    transform: translateY(0px);
    box-shadow:
      0 1px 4px rgba(15, 52, 96, 0.3),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .install-btn:hover .install-icon {
    animation: nudge-down 0.5s ease forwards;
  }

  .install-icon {
    display: flex;
    align-items: center;
    font-size: 1rem;
  }

  .install-label {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .install-label-sub {
    font-size: 0.68rem;
    font-weight: 400;
    opacity: 0.65;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .ios-tip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 10px;
    padding: 10px 14px;
    background: rgba(15, 52, 96, 0.07);
    border: 1px solid rgba(15, 52, 96, 0.15);
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 0.82rem;
    color: #1a1a2e;
    line-height: 1.45;
    max-width: 260px;
  }

  .ios-tip-icon {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 1px;
  }
`

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const [isIos, setIsIos] = useState(false)
  const [showIosTip, setShowIosTip] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setPrompt(e)
    })

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios && !standalone) setIsIos(true)

    window.addEventListener('appinstalled', () => setInstalled(true))
  }, [])

  const handleInstall = async () => {
    if (isIos) {
      setShowIosTip((v) => !v)
      return
    }
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  if (installed || (!prompt && !isIos)) return null

  return (
    <>
      <style>{styles}</style>
      <div>
        <button className="install-btn" onClick={handleInstall}>
          <span className="install-icon">⬇︎</span>
          <span className="install-label">
            <span className="install-label-sub">Get the app</span>
            Install Kraal
          </span>
        </button>

        {showIosTip && (
          <div className="ios-tip">
            <span className="ios-tip-icon">☝️</span>
            <span>
              Tap the <strong>Share</strong> icon in Safari, then choose{' '}
              <strong>Add to Home Screen</strong>.
            </span>
          </div>
        )}
      </div>
    </>
  )
}