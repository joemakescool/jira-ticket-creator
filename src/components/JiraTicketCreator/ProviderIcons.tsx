/**
 * Logo SVG components
 * Inline SVGs for brand logos and provider icons
 */

interface IconProps {
  className?: string;
}

/** Jira logo — uses brand gradient blues */
export function JiraLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="jira-a" x1="98.03%" x2="58.89%" y1="0.22%" y2="40.77%">
          <stop offset="18%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient id="jira-b" x1="100.17%" x2="55.80%" y1="0.45%" y2="44.73%">
          <stop offset="18%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path d="M244.658 0H121.707a55.502 55.502 0 0 0 55.502 55.502h22.649V77.37c.02 30.625 24.841 55.447 55.5 55.502V10.993C255.358 4.923 250.228 0 244.658 0" fill="#2684FF" />
      <path d="M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.501 55.502h22.649v21.868c.02 30.597 24.798 55.408 55.396 55.498V72.255c0-6.075-5.13-10.993-10.596-10.993" fill="url(#jira-a)" />
      <path d="M122.943 122.524H0c0 30.653 24.837 55.502 55.502 55.502h22.72v21.797c.02 30.625 24.84 55.447 55.5 55.502V133.517c0-6.07-5.13-10.993-10.779-10.993" fill="url(#jira-b)" />
    </svg>
  );
}

/** Anthropic/Claude starburst logo — uses fixed brand color */
export function ClaudeLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => (
        <rect
          key={i}
          x="46" y="8"
          width="8" height="34"
          rx="3.5"
          fill="#D4805A"
          transform={`rotate(${i * (360 / 11)} 50 50)`}
        />
      ))}
    </svg>
  );
}

/** OpenAI hexagonal knot logo — uses currentColor */
export function OpenAILogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="3.5" ry="9" />
      <ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(120 12 12)" />
    </svg>
  );
}

/** Ollama llama face logo — uses currentColor */
export function OllamaLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Ears */}
      <path d="M8.5 8.5 L7.5 4 L10 7.5" />
      <path d="M15.5 8.5 L16.5 4 L14 7.5" />
      {/* Head/body */}
      <path d="M7 12 C7 8.5 9 7 12 7 C15 7 17 8.5 17 12 C17 16.5 15 20 12 20 C9 20 7 16.5 7 12Z" />
      {/* Eyes */}
      <circle cx="10" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      {/* Nose */}
      <ellipse cx="12" cy="15.5" rx="2" ry="1.3" />
    </svg>
  );
}
