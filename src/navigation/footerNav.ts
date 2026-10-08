import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

type Nav = NavigationProp<RootStackParamList>;

export function handleFooterNav(
  navigation: Nav,
  key: string,
  context?: { slug: string; language: string }
) {
  if (key === 'home') {
    navigation.navigate('Home');
    return;
  }
  if (key === 'downloads') {
    navigation.navigate('Downloads');
    return;
  }
  if (key === 'sync') {
    if (context) {
      navigation.navigate('Sync', context);
    } else {
      // No movie context available (e.g. tapped from Home) — Sync needs a
      // specific downloaded title, so send the user to pick one first.
      navigation.navigate('Downloads');
    }
    return;
  }
}
