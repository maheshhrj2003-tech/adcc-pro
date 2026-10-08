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
  // autoSync: only true when arriving from a direct Play (MovieDetailScreen)
  // — mic auto-sync should not fire (or even be offered) when replaying an
  // already-downloaded title from the Downloads library.
  Player: { slug: string; language: string; autoSync?: boolean };
  Sync: { slug: string; language: string };
  Downloads: undefined;
  Menu: undefined;
  Info: { section: InfoSection };
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Favorites: undefined;
  Screenings: undefined;
  ScreeningDetail: { slug: string };
  AccessibilitySettings: undefined;
};
