// Cinco caras de animales dibujadas en SVG. Cada una hace una mueca distinta:
// perro (lengua fuera y jadeo), gato (guiño y bigotes), conejo (mastica y mueve las orejas),
// hámster (mofletes inflados) y rana (lengua que dispara).
import styles from './AnimalFaces.module.css';

const ink = '#2B1B10';
const line = { stroke: ink, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Eye = ({ x, y, r = 8 }) => (
  <g className={styles.blink}>
    <circle cx={x} cy={y} r={r} fill={ink} />
    <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.32} fill="#fff" />
  </g>
);

export const Dog = () => (
  <svg viewBox="0 0 200 200" className={styles.face} aria-hidden="true">
    <g className={styles.dogEarL}>
      <path d="M46 66 C 12 70, 4 128, 30 148 C 50 154, 64 122, 62 84 Z" fill="#8A5A2B" {...line} />
    </g>
    <g className={styles.dogEarR}>
      <path d="M154 66 C 188 70, 196 128, 170 148 C 150 154, 136 122, 138 84 Z" fill="#8A5A2B" {...line} />
    </g>
    <ellipse cx="100" cy="106" rx="60" ry="56" fill="#E7A85F" {...line} />
    <ellipse cx="72" cy="94" rx="19" ry="22" fill="#C98A45" />
    <ellipse cx="100" cy="134" rx="33" ry="24" fill="#FFF1DC" {...line} strokeWidth="4" />
    <Eye x={76} y={96} />
    <Eye x={124} y={96} />
    <path d="M62 78 Q 76 70 90 78" fill="none" {...line} strokeWidth="4" />
    <path d="M110 78 Q 124 70 138 78" fill="none" {...line} strokeWidth="4" />
    <path d="M100 126 V 138 M100 138 Q 88 148 77 139 M100 138 Q 112 148 123 139" fill="none" {...line} strokeWidth="4" />
    <g className={styles.tongue}>
      <path d="M90 141 h20 v14 a10 10 0 0 1 -20 0 z" fill="#FF6F91" {...line} strokeWidth="3.5" />
      <path d="M100 143 v10" stroke="#D84A6E" strokeWidth="3" strokeLinecap="round" />
    </g>
    <ellipse cx="100" cy="120" rx="14" ry="10" fill={ink} />
    <ellipse cx="96" cy="117" rx="4" ry="2.5" fill="#fff" opacity="0.7" />
  </svg>
);

export const Cat = () => (
  <svg viewBox="0 0 200 200" className={styles.face} aria-hidden="true">
    <g className={styles.catEarL}>
      <path d="M40 90 L46 26 L94 58 Z" fill="#A9B4C0" {...line} />
      <path d="M52 76 L55 44 L80 60 Z" fill="#FFB3C6" />
    </g>
    <g className={styles.catEarR}>
      <path d="M160 90 L154 26 L106 58 Z" fill="#A9B4C0" {...line} />
      <path d="M148 76 L145 44 L120 60 Z" fill="#FFB3C6" />
    </g>
    <ellipse cx="100" cy="112" rx="64" ry="54" fill="#A9B4C0" {...line} />
    <path d="M100 60 V 80 M84 63 L88 80 M116 63 L112 80" stroke="#6F7C89" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="100" cy="132" rx="26" ry="18" fill="#F6F1E9" />
    <circle cx="62" cy="128" r="9" fill="#FF9DB5" opacity="0.65" />
    <circle cx="138" cy="128" r="9" fill="#FF9DB5" opacity="0.65" />
    <g className={styles.blink}>
      <ellipse cx="72" cy="106" rx="12" ry="14" fill="#D9EC7A" {...line} strokeWidth="4" />
      <ellipse cx="72" cy="106" rx="3.5" ry="11" fill={ink} />
    </g>
    <path className={styles.wink} d="M116 108 Q 128 96 142 108" fill="none" {...line} />
    <path d="M93 121 h14 l-7 9 z" fill="#FF7FA0" {...line} strokeWidth="3" />
    <path d="M100 130 Q 92 142 82 134 M100 130 Q 108 142 118 134" fill="none" {...line} strokeWidth="4" />
    <g className={styles.blep}>
      <path d="M104 139 q 8 0 8 8 a 8 8 0 0 1 -14 4 q 0 -8 6 -12 z" fill="#FF6F91" {...line} strokeWidth="3" />
    </g>
    <g className={styles.whiskersL}>
      <path d="M66 126 L16 114 M66 132 L12 134 M68 138 L20 154" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
    </g>
    <g className={styles.whiskersR}>
      <path d="M134 126 L184 114 M134 132 L188 134 M132 138 L180 154" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const Rabbit = () => (
  <svg viewBox="0 0 200 200" className={styles.face} aria-hidden="true">
    <g className={styles.rabEarL}>
      <ellipse cx="70" cy="50" rx="18" ry="46" fill="#fff" {...line} />
      <ellipse cx="70" cy="56" rx="8" ry="32" fill="#FFC3D3" />
    </g>
    <g className={styles.rabEarR}>
      <ellipse cx="130" cy="50" rx="18" ry="46" fill="#fff" {...line} />
      <ellipse cx="130" cy="56" rx="8" ry="32" fill="#FFC3D3" />
    </g>
    <ellipse cx="100" cy="122" rx="58" ry="50" fill="#fff" {...line} />
    <circle cx="62" cy="134" r="11" fill="#FFB3C6" opacity="0.8" />
    <circle cx="138" cy="134" r="11" fill="#FFB3C6" opacity="0.8" />
    <Eye x={78} y={112} />
    <Eye x={122} y={112} />
    <g className={styles.nose}>
      <path d="M92 122 h16 l-8 10 z" fill="#FF7FA0" {...line} strokeWidth="3" />
    </g>
    <path d="M100 132 V 140 M100 140 Q 90 148 81 141 M100 140 Q 110 148 119 141" fill="none" {...line} strokeWidth="4" />
    <g className={styles.chew}>
      <rect x="92" y="141" width="16" height="18" rx="4" fill="#fff" {...line} strokeWidth="3.5" />
      <path d="M100 142 V 158" stroke={ink} strokeWidth="3" />
    </g>
  </svg>
);

export const Hamster = () => (
  <svg viewBox="0 0 200 200" className={styles.face} aria-hidden="true">
    <circle cx="52" cy="62" r="16" fill="#E8A25A" {...line} />
    <circle cx="52" cy="62" r="8" fill="#FFB3C6" />
    <circle cx="148" cy="62" r="16" fill="#E8A25A" {...line} />
    <circle cx="148" cy="62" r="8" fill="#FFB3C6" />
    <ellipse cx="100" cy="114" rx="72" ry="56" fill="#F0B26B" {...line} />
    <ellipse cx="100" cy="76" rx="26" ry="14" fill="#E39A4C" opacity="0.8" />
    <g className={styles.cheekL}>
      <circle cx="56" cy="130" r="26" fill="#FFF3DF" {...line} strokeWidth="4" />
    </g>
    <g className={styles.cheekR}>
      <circle cx="144" cy="130" r="26" fill="#FFF3DF" {...line} strokeWidth="4" />
    </g>
    <path d="M62 90 L84 100 L62 110" fill="none" {...line} />
    <path d="M138 90 L116 100 L138 110" fill="none" {...line} />
    <ellipse cx="100" cy="114" rx="7" ry="5" fill="#FF7FA0" {...line} strokeWidth="3" />
    <path d="M100 119 V 124 M100 124 Q 92 132 85 126 M100 124 Q 108 132 115 126" fill="none" {...line} strokeWidth="4" />
    <g className={styles.seed}>
      <ellipse cx="114" cy="140" rx="8" ry="14" fill="#4A4A4A" {...line} strokeWidth="3" transform="rotate(35 114 140)" />
      <path d="M110 134 L118 146 M113 131 L121 143" stroke="#D8D8D8" strokeWidth="2" transform="rotate(0)" />
    </g>
  </svg>
);

export const Frog = () => (
  <svg viewBox="0 0 200 200" className={styles.face} aria-hidden="true">
    <ellipse cx="100" cy="124" rx="72" ry="50" fill="#7CC24A" {...line} />
    <ellipse cx="100" cy="146" rx="46" ry="22" fill="#B7E58A" opacity="0.75" />
    <g className={styles.frogEyeL}>
      <circle cx="64" cy="72" r="28" fill="#7CC24A" {...line} />
      <circle cx="64" cy="70" r="18" fill="#fff" {...line} strokeWidth="3.5" />
      <circle className={styles.pupilL} cx="64" cy="70" r="8" fill={ink} />
    </g>
    <g className={styles.frogEyeR}>
      <circle cx="136" cy="72" r="28" fill="#7CC24A" {...line} />
      <circle cx="136" cy="70" r="18" fill="#fff" {...line} strokeWidth="3.5" />
      <circle className={styles.pupilR} cx="136" cy="70" r="8" fill={ink} />
    </g>
    <circle cx="46" cy="132" r="10" fill="#FF9DB5" opacity="0.7" />
    <circle cx="154" cy="132" r="10" fill="#FF9DB5" opacity="0.7" />
    <circle cx="92" cy="110" r="3" fill={ink} />
    <circle cx="108" cy="110" r="3" fill={ink} />
    <g className={styles.frogTongue}>
      <rect x="95" y="140" width="10" height="62" rx="5" fill="#FF5C7A" />
      <circle cx="100" cy="200" r="9" fill="#FF5C7A" />
    </g>
    <path d="M40 128 Q 100 182 160 128" fill="none" {...line} />
    <path d="M52 128 Q 100 158 148 128" fill="none" stroke="#2B1B10" strokeWidth="0" />
  </svg>
);

export const faces = [
  { id: 'perro', Face: Dog, sound: '¡Guau!', message: 'Calentando el estetoscopio…' },
  { id: 'gato', Face: Cat, sound: '¡Miau!', message: 'Contando bigotes…' },
  { id: 'conejo', Face: Rabbit, sound: '¡Crunch!', message: 'Pelando zanahorias…' },
  { id: 'hamster', Face: Hamster, sound: '¡Ñam ñam!', message: 'Llenando los mofletes…' },
  { id: 'rana', Face: Frog, sound: '¡Croac!', message: '¡Casi listo!' }
];
