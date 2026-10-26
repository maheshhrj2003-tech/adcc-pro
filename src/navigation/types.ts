export type InfoSection =
  | 'about'
  | 'how-it-works'
  | 'features'
  | 'mission'
  | 'faq'
  | 'contact'
  | 'terms-of-use'
  | 'terms-conditions'
  | 'privacy-policy';

export type RootStackParamList = {
  Home: undefined;
  MovieDetail: { slug: string };
  Player: { slug: string; language: string };
  Sync: { slug: string; language: string };
  Downloads: undefined;
  Menu: undefined;
  Settings: undefined;
  Info: { section: InfoSection };
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Favorites: undefined;
  Screenings: undefined;
  ScreeningDetail: { slug: string };
  AccessibilitySettings: undefined;
};
