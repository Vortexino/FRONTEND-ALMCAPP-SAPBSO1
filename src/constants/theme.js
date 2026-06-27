// Tokens de diseño compartidos para toda la app.
// Primario: navy #1B3A6B — profesional, logística, no el violet genérico de IA.
// Grises con tinte azul, no neutros puros de librería.

export const C = {
  // Marca
  primary:      '#1B3A6B',
  primaryLight: '#E8EFF8',
  primaryDim:   '#4A6FA5',
  primaryShadow:'#0F1A2E',

  // Estados semánticos
  success:      '#0B7A75',
  successLight: '#DFF5F3',
  warn:         '#B45309',
  warnLight:    '#FEF3C7',
  danger:       '#B91C1C',
  dangerLight:  '#FEE2E2',
  info:         '#1E40AF',
  infoLight:    '#DBEAFE',

  // Texto (grises con base azul, no neutros puros)
  text:         '#0F1A2E',
  textSec:      '#5A6A84',
  textMuted:    '#9AAAB8',

  // Superficies
  bg:           '#F4F7FB',
  surface:      '#FFFFFF',
  border:       '#E2E8F2',
  borderStrong: '#C8D3E8',

  // Sombra con tinte (no #000 puro)
  shadow:       '#0F1A2E',
};

// Escala de espaciado — se varía según jerarquía, no se usa un valor para todo
export const S = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl:48,
};

export const shadow = {
  sm: {
    shadowColor: C.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  md: {
    shadowColor: C.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};
