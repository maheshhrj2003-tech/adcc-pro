export const ABOUT_TEXT = {
  body: "For millions of people who are blind, low-vision, deaf, or hard of hearing, going to the movies has never been as simple as buying a ticket. Audio description narrates the visual moments a film doesn't explain in dialogue. Closed captions make every line, sound, and cue readable. Our app brings both to your pocket — synced precisely with the film you're watching, wherever you're watching it.",
  highlight:
    "We don't stream movies. We deliver the missing piece: the audio and text tracks that make the movie experience whole.",
  footer: 'ADCC is built and operated by EKARI FILMS, a Hyderabad-based production house founded by Ekari Sathyanarayana.',
};

export const HOW_IT_WORKS_STEPS = [
  {
    num: '01',
    title: 'Browse',
    body: 'Search our growing library of films with available audio description and closed caption tracks.',
  },
  {
    num: '02',
    title: 'Download',
    body: 'Save the AD audio and CC files to your device before you head to the theater — no data connection needed once you’re there.',
  },
  {
    num: '03',
    title: 'Play & Immerse',
    body: 'Start playback in sync with the movie and enjoy the full story, exactly as it was meant to be experienced.',
  },
];

export const FEATURES = [
  { title: 'Extensive Library', body: 'A growing catalog of audio-described and captioned films across every genre.' },
  { title: 'Offline Ready', body: 'Download once, watch anywhere — even without signal in a theater.' },
  { title: 'Precise Sync', body: 'Audio narration and captions timed to match the film, adjustable on the fly.' },
  { title: 'Favorites & Recommendations', body: 'Save titles you love and discover new ones tailored to your taste.' },
  { title: 'Simple, Intuitive Design', body: 'Built with accessibility at the core, not bolted on as an afterthought.' },
  { title: 'Privacy First', body: 'We don’t collect or share your personal data.' },
];

export const MISSION = {
  stat: '2.2 billion',
  paragraphs: [
    'An estimated 2.2 billion people worldwide live with some form of vision impairment, and hundreds of millions more live with hearing loss. Despite legal mandates in many countries requiring accessible media, actually finding and using audio description and captions at the moment you need them — in a theater seat, mid-film — remains difficult.',
    'We built this app to close that gap: giving people a simple way to access the accessibility tracks that already exist, right when and where they need them.',
  ],
};

export const FAQS = [
  {
    q: 'Does this app include the movie itself?',
    a: 'No. Our app provides only the audio description and caption tracks. You’ll need to be watching the film separately — in a theater, on a disc, or through your own streaming subscription.',
  },
  {
    q: 'Do I need an internet connection to use it?',
    a: 'Only to download tracks in advance. Once downloaded, playback works fully offline.',
  },
  {
    q: 'How does the audio stay in sync with the movie?',
    a: 'You start playback at the beginning of the film, and ADCC reads the movie’s master clock every 500ms to keep pace — captions stay locked at 60fps and audio description auto-adjusts within milliseconds.',
  },
  {
    q: 'Is the app free?',
    a: 'Yes, the app and its content library are free to download and use.',
  },
  {
    q: 'What devices are supported?',
    a: 'Available on Android.',
  },
];

export const CONTACT = {
  email: 'support@adccpro.com',
  phone: '+91 84329 99900',
  address: '8-3-231/A/73, Beside Labour Adda, S.K. Nagar, Yousufguda, Hyderabad, Telangana 500045, India',
};

export const OWNER = {
  name: 'Ekari Sathyanarayana',
  title: 'Founder, EKARI FILMS',
};

export interface LegalSection {
  heading: string;
  body: string;
}

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: 'Overview',
    body: 'ADCC ("we", "us", "our") respects your privacy. This Privacy Policy explains what information our app and website collect, how it is used, and the choices you have.',
  },
  {
    heading: 'Information We Collect',
    body: 'ADCC does not require you to create an account to use the app. We do not collect personal information such as your name, email address, or precise location. We may collect basic, anonymized device and usage data (such as app version or crash reports) solely to maintain and improve the app.',
  },
  {
    heading: 'Downloaded Content',
    body: 'Audio description and closed caption files you choose to download are stored locally on your own device for offline playback. These files are not uploaded to our servers, and we do not track which titles you play.',
  },
  {
    heading: 'Third-Party Services',
    body: 'We do not sell, rent, or share your data with third parties for advertising purposes. Where third-party services are used (for example, to host downloadable files), they are bound to use data only to provide that service.',
  },
  {
    heading: "Children's Privacy",
    body: 'Our app is not directed at children under 13, and we do not knowingly collect personal information from children.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Continued use of the app or website after changes are posted means you accept the updated policy.',
  },
  {
    heading: 'Contact Us',
    body: 'Questions about this policy can be sent to support@adccpro.com.',
  },
];

export const TERMS_OF_USE: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: 'By downloading, accessing, or using the ADCC app or website, you agree to be bound by these Terms of Use. If you do not agree, please do not use the app or website.',
  },
  {
    heading: 'License to Use',
    body: 'We grant you a limited, non-exclusive, non-transferable, revocable license to use the ADCC app for your own personal, non-commercial use, in accordance with these terms.',
  },
  {
    heading: 'Prohibited Uses',
    body: 'You may not redistribute, resell, sublicense, or publicly share any audio description or caption files obtained through the app. You may not reverse-engineer, decompile, or attempt to extract the source code of the app, or use it for any unlawful purpose.',
  },
  {
    heading: 'Intellectual Property',
    body: 'The ADCC name, logo, app design, and all associated branding are the property of ADCC unless otherwise noted. Movie titles, artwork, and metadata referenced in the app remain the property of their respective owners.',
  },
  {
    heading: 'Disclaimer of Warranties',
    body: 'The app and website are provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to fitness for a particular purpose or uninterrupted availability.',
  },
  {
    heading: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, ADCC is not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the app or website.',
  },
  {
    heading: 'Governing Law',
    body: 'These terms are governed by the laws of Telangana, India, without regard to its conflict of law provisions.',
  },
  {
    heading: 'Contact Us',
    body: 'Questions about these terms can be sent to support@adccpro.com.',
  },
];

export const TERMS_AND_CONDITIONS: LegalSection[] = [
  {
    heading: 'Our Service',
    body: 'ADCC provides downloadable audio description (AD) and closed caption (CC) tracks synced to select films. We do not provide, host, or stream the films themselves.',
  },
  {
    heading: 'Your Responsibility',
    body: 'You are responsible for legally accessing the film separately — in a theater, on a physical disc, or through your own streaming subscription — before using our synced accessibility tracks alongside it.',
  },
  {
    heading: 'Content Accuracy',
    body: 'While we strive for precise synchronization, timing may vary slightly depending on the specific release, cut, or playback source of the film you are watching. We are not responsible for sync drift caused by a source outside our control.',
  },
  {
    heading: 'Availability of Titles',
    body: 'Titles, languages, and accessibility tracks are added and removed from our library periodically and are not guaranteed to remain available indefinitely.',
  },
  {
    heading: 'Free of Charge',
    body: 'The app and its content library are currently free to download and use. This may change in the future, and we will provide advance notice of any pricing changes.',
  },
  {
    heading: 'Termination',
    body: 'We reserve the right to suspend or terminate access to the service for any user who violates these Terms & Conditions or our Terms of Use.',
  },
  {
    heading: 'Updates to These Terms',
    body: 'We may revise these Terms & Conditions from time to time. Continued use of the app or website after changes are posted constitutes acceptance of the revised terms.',
  },
  {
    heading: 'Contact Us',
    body: 'Questions about these terms can be sent to support@adccpro.com.',
  },
];
