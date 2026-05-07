import { useState, useEffect } from 'react'

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const [isIos, setIsIos] = useState(false)
  const [showIosTip, setShowIosTip] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Android / Desktop Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setPrompt(e)
    })

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (ios && !standalone) setIsIos(true)

    // Hide button once installed
    window.addEventListener('appinstalled', () => setInstalled(true))
  }, [])

  const handleInstall = async () => {
    if (isIos) {
      setShowIosTip(true) // show manual instructions for iOS
      return
    }
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  // Already installed or not supported — show nothing
  if (installed || (!prompt && !isIos)) return null

  return (
    <div>
      <button onClick={handleInstall}>
        ⬇ Install Kraal
      </button>

      {/* iOS manual tip */}
      {showIosTip && (
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Tap the <strong>Share</strong> icon in Safari, then <strong>"Add to Home Screen"</strong>
        </p>
      )}
    </div>
  )
}