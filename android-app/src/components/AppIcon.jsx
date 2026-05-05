import { Image, Text } from 'react-native';

const EMOJI_FALLBACK = {
  homeInactive:    '🏠',
  homeActive:      '🏠',
  catalogInactive: '📚',
  catalogActive:   '📚',
  profileInactive: '👤',
  profileActive:   '👤',
  searchInactive:  '🔍',
  searchActive:    '🔍',
  bellInactive:    '🔔',
  bellActive:      '🔔',
  back:            '←',
  filter:          '⚙',
  location:        '📍',
  logout:          '🚪',
  support:         '💬',
  duck:            '🦆',
};

const ICON_MAP = {
  homeInactive:    () => require('../../assets/icon-home.png'),
  homeActive:      () => require('../../assets/icon-home-active.png'),
  catalogInactive: () => require('../../assets/icon-catalog.png'),
  catalogActive:   () => require('../../assets/icon-catalog-active.png'),
  profileInactive: () => require('../../assets/icon-profile.png'),
  profileActive:   () => require('../../assets/icon-profile-active.png'),
  searchInactive:  () => require('../../assets/icon-search.png'),
  searchActive:    () => require('../../assets/icon-search-active.png'),
  bellInactive:    () => require('../../assets/icon-bell.png'),
  bellActive:      () => require('../../assets/icon-bell-active.png'),
  back:            () => require('../../assets/icon-back.png'),
  filter:          () => require('../../assets/icon-search.png'),
  location:        () => require('../../assets/icon-location.png'),
  logout:          () => require('../../assets/icon-back.png'),
  support:         () => require('../../assets/icon-support.png'),
  duck:            () => require('../../assets/icon-duck.png'),
};

const ICON_READY = {
  homeInactive:    true,
  homeActive:      true,
  catalogInactive: true,
  catalogActive:   true,
  profileInactive: true,
  profileActive:   true,
  searchInactive:  true,
  searchActive:    true,
  bellInactive:    true,
  bellActive:      true,
  back:            true,
  filter:          true,
  location:        true,
  logout:          false,
  support:         true,
  duck:            true,
};

export default function AppIcon({ name, size = 22, tintColor, style }) {
  if (ICON_READY[name]) {
    let source;
    try { source = ICON_MAP[name](); } catch { source = null; }
    if (source) {
      return (
        <Image
          source={source}
          resizeMode="contain"
          tintColor={tintColor}
          style={[
            { width: size, height: size },
            style,
          ]}
        />
      );
    }
  }
  return (
    <Text style={[{ fontSize: size * 0.85, lineHeight: size }, style]}>
      {EMOJI_FALLBACK[name] || '?'}
    </Text>
  );
}