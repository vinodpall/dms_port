/** 五大模块的动态插画（SVG 字符串） */
export const ICONS: Record<string, string> = {
  device: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="d-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40749D"/><stop offset="1" stop-color="#214565"/></linearGradient>
      <radialGradient id="d-g"><stop offset="0" stop-color="#2ED3E6" stop-opacity=".95"/><stop offset="1" stop-color="#26C6DA" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="60" cy="102" rx="30" ry="5" fill="#2ED3E6" opacity=".18"/>
    <line x1="60" y1="62" x2="60" y2="48" stroke="#2ED3E6" stroke-width="1.6"/>
    <circle cx="60" cy="45" r="4" fill="url(#d-g)"><animate attributeName="r" values="3;6;3" dur="1.8s" repeatCount="indefinite"/></circle>
    <rect x="44" y="62" width="32" height="30" rx="5" fill="url(#d-b)" stroke="#2ED3E6" stroke-width="1.4"/>
    <circle cx="53" cy="74" r="3" fill="#2ED3E6"><animate attributeName="opacity" values="1;.25;1" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="67" cy="74" r="3" fill="#2ED3E6"><animate attributeName="opacity" values="1;.25;1" dur="2s" begin=".5s" repeatCount="indefinite"/></circle>
    <path d="M52 86 h16" stroke="#2ED3E6" stroke-width="1.2" opacity=".55"/>
    <rect x="33" y="70" width="7" height="16" rx="2.5" fill="url(#d-b)" stroke="#2ED3E6" stroke-width="1.1"/>
    <rect x="80" y="70" width="7" height="16" rx="2.5" fill="url(#d-b)" stroke="#2ED3E6" stroke-width="1.1"/>
    <g opacity=".75">
      <circle cx="26" cy="46" r="2" fill="#26C6DA"><animate attributeName="cy" values="52;36;52" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="95" cy="58" r="2" fill="#26C6DA"><animate attributeName="cy" values="64;48;64" dur="3.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3.4s" repeatCount="indefinite"/></circle>
    </g>
  </svg>`,

  biz: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="b-p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#214565"/><stop offset="1" stop-color="#40749D"/></linearGradient>
    </defs>
    <path d="M22 60 H48 V34 H98" fill="none" stroke="url(#b-p)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 60 V86 H98" fill="none" stroke="url(#b-p)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="60" r="8" fill="#214565" stroke="#2ED3E6" stroke-width="1.4"/>
    <circle cx="22" cy="60" r="3" fill="#2ED3E6"/>
    <circle cx="48" cy="34" r="6" fill="#2F5C81" stroke="#2ED3E6" stroke-width="1.4"><animate attributeName="r" values="6;7.5;6" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="48" cy="86" r="6" fill="#2F5C81" stroke="#2ED3E6" stroke-width="1.4"><animate attributeName="r" values="6;7.5;6" dur="2s" begin=".5s" repeatCount="indefinite"/></circle>
    <circle cx="98" cy="34" r="8" fill="#214565" stroke="#2ED3E6" stroke-width="1.4"/>
    <circle cx="98" cy="86" r="8" fill="#214565" stroke="#2ED3E6" stroke-width="1.4"/>
    <circle cx="22" cy="60" r="2.6" fill="#2ED3E6"><animate attributeName="cx" values="22;48;98" dur="3.2s" repeatCount="indefinite"/><animate attributeName="cy" values="60;34;34" dur="3.2s" repeatCount="indefinite"/></circle>
    <circle cx="22" cy="60" r="2.6" fill="#26C6DA"><animate attributeName="cx" values="22;48;98" dur="3.2s" begin="1.6s" repeatCount="indefinite"/><animate attributeName="cy" values="60;86;86" dur="3.2s" begin="1.6s" repeatCount="indefinite"/></circle>
  </svg>`,

  collect: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="c-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40749D"/><stop offset="1" stop-color="#214565"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="86" rx="34" ry="11" fill="#214565" stroke="#2ED3E6" stroke-width="1.3"/>
    <rect x="26" y="42" width="68" height="44" fill="url(#c-d)"/>
    <ellipse cx="60" cy="42" rx="34" ry="11" fill="#40749D" stroke="#2ED3E6" stroke-width="1.3"/>
    <line x1="26" y1="42" x2="26" y2="86" stroke="#2ED3E6" stroke-width="1.3"/>
    <line x1="94" y1="42" x2="94" y2="86" stroke="#2ED3E6" stroke-width="1.3"/>
    <ellipse cx="60" cy="56" rx="34" ry="11" fill="none" stroke="#2ED3E6" stroke-width=".9" opacity=".4"/>
    <ellipse cx="60" cy="71" rx="34" ry="11" fill="none" stroke="#2ED3E6" stroke-width=".9" opacity=".4"/>
    <circle cx="60" cy="50" r="2" fill="#2ED3E6"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="60" cy="64" r="2" fill="#2ED3E6"><animate attributeName="opacity" values="0;1;0" dur="2s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="60" cy="78" r="2" fill="#2ED3E6"><animate attributeName="opacity" values="0;1;0" dur="2s" begin="1.2s" repeatCount="indefinite"/></circle>
    <g opacity=".8">
      <path d="M60 26 v-12" stroke="#2ED3E6" stroke-width="1.2" stroke-dasharray="2 3" opacity=".6"/>
      <circle cx="60" cy="12" r="2.4" fill="#2ED3E6"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
    </g>
  </svg>`,

  sim: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="s-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#40749D"/><stop offset="1" stop-color="#214565"/></linearGradient>
    </defs>
    <path d="M60 30 L88 45 L88 75 L60 90 L32 75 L32 45 Z" fill="url(#s-c)" stroke="#2ED3E6" stroke-width="1.4"/>
    <path d="M60 30 V60" stroke="#2ED3E6" stroke-width="1.2" opacity=".5"/>
    <path d="M88 45 L60 60 L32 45" fill="none" stroke="#2ED3E6" stroke-width="1.2" opacity=".5"/>
    <path d="M60 60 L60 90" stroke="#2ED3E6" stroke-width="1.2" opacity=".5"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="9s" repeatCount="indefinite"/>
      <circle cx="60" cy="42" r="2.6" fill="#2ED3E6"/>
      <circle cx="76" cy="51" r="2.6" fill="#26C6DA"/>
      <circle cx="44" cy="51" r="2.6" fill="#26C6DA"/>
    </g>
    <ellipse cx="60" cy="97" rx="26" ry="5" fill="#2ED3E6" opacity=".16"><animate attributeName="rx" values="26;30;26" dur="3s" repeatCount="indefinite"/></ellipse>
  </svg>`,

  scene: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="m-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#40749D"/><stop offset="1" stop-color="#214565"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="86" rx="34" ry="7" fill="#2ED3E6" opacity=".12"><animate attributeName="rx" values="34;38;34" dur="4s" repeatCount="indefinite"/></ellipse>
    <path d="M60 32 L100 54 L60 76 L20 54 Z" fill="url(#m-m)" stroke="#2ED3E6" stroke-width="1.4"/>
    <path d="M80 43 L40 65 M40 43 L80 65" fill="none" stroke="#2ED3E6" stroke-width=".7" opacity=".3"/>
    <path d="M34 50 L52 60 L70 50 L86 58" fill="none" stroke="#2ED3E6" stroke-width="1.3" stroke-dasharray="2 3" opacity=".75"/>
    <circle cx="34" cy="50" r="3" fill="#2ED3E6"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="52" cy="60" r="3" fill="#2ED3E6"><animate attributeName="opacity" values="1;.3;1" dur="2s" begin=".6s" repeatCount="indefinite"/></circle>
    <circle cx="70" cy="50" r="3" fill="#2ED3E6"><animate attributeName="opacity" values="1;.3;1" dur="2s" begin="1.2s" repeatCount="indefinite"/></circle>
    <line x1="86" y1="58" x2="86" y2="42" stroke="#2ED3E6" stroke-width="1.3"/>
    <path d="M86 42 h13 l-4 4.5 4 4.5 h-13 z" fill="#2ED3E6" opacity=".9">
      <animate attributeName="opacity" values="1;.45;1" dur="2.2s" repeatCount="indefinite"/>
    </path>
    <circle cx="86" cy="58" r="4" fill="none" stroke="#2ED3E6" stroke-width="1.2"><animate attributeName="r" values="3;6.5;3" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.25;1" dur="2.2s" repeatCount="indefinite"/></circle>
  </svg>`
}
