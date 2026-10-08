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
  if (key === 'menu') {
    navigation.navigate('Menu');
    return;
  }
}
