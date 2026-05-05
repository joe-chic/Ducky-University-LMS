export const colors = {
  primary: '#FFD400',
  primaryDark: '#E6BF00',
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray400: '#BDBDBD',
  gray600: '#757575',
  gray800: '#424242',
  available: '#2E8B57',
  availableBg: '#E8F5E9',
  unavailable: '#AA0000',
  unavailableBg: '#FFEBEE',
  amber: '#F57F17',
  amberBg: '#FFF8E1',
};

export const typography = {
  h1: { fontSize: 22, fontWeight: '700', color: colors.black },
  h2: { fontSize: 18, fontWeight: '700', color: colors.black },
  h3: { fontSize: 15, fontWeight: '700', color: colors.black },
  body: { fontSize: 13, color: colors.gray800 },
  caption: { fontSize: 11, color: colors.gray600 },
  tiny: { fontSize: 10, color: colors.gray400 },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

export const radius = {
  sm: 6, md: 10, lg: 16, pill: 999,
};