// src/components/LanguageSwitcher.jsx
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English',    flag: '🇿🇼' },
  { code: 'sn', label: 'SN', name: 'Shona',      flag: '🇿🇼' },
  { code: 'nd', label: 'ND', name: 'Ndebele',    flag: '🇿🇼' },
  { code: 'zu', label: 'ZU', name: 'Zulu',       flag: '🇿🇦' },
  { code: 'af', label: 'AF', name: 'Afrikaans',  flag: '🇿🇦' },
  { code: 'pt', label: 'PT', name: 'Português',  flag: '🇲🇿' },
  { code: 'sw', label: 'SW', name: 'Kiswahili',  flag: '🇹🇿' },
  { code: 'ny', label: 'NY', name: 'Chichewa',   flag: '🇲🇼' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="lang-switcher">
      <button className="lang-current">
        {current.flag} {current.label} ▾
      </button>
      <div className="lang-dropdown">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage(lang.code)}
          >
            {lang.flag} {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}