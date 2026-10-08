import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, InfoSection } from '../navigation/types';
import ChromeHeader from '../components/ChromeHeader';
import {
  ABOUT_TEXT,
  HOW_IT_WORKS_STEPS,
  FEATURES,
  MISSION,
  FAQS,
  CONTACT,
  OWNER,
  PRIVACY_POLICY,
  TERMS_OF_USE,
  TERMS_AND_CONDITIONS,
  LegalSection,
} from '../content';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Info'>;

const TITLES: Record<InfoSection, string> = {
  about: 'About',
  'how-it-works': 'How It Works',
  features: 'Features',
  mission: 'Mission',
  faq: 'FAQ',
  contact: 'Contact',
  'terms-of-use': 'Terms of Use',
  'terms-conditions': 'Terms & Conditions',
  'privacy-policy': 'Privacy Policy',
};

function LegalContent({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <View key={s.heading} style={{ marginBottom: spacing.lg }}>
          <Text style={styles.legalHeading}>{s.heading}</Text>
          <Text style={styles.paragraph}>{s.body}</Text>
        </View>
      ))}
    </>
  );
}

function AboutContent() {
  return (
    <>
      <Text style={styles.paragraph}>{ABOUT_TEXT.body}</Text>
      <View style={styles.highlightCard}>
        <Text style={styles.highlightText}>{ABOUT_TEXT.highlight}</Text>
      </View>
      <Text style={[styles.paragraph, { marginTop: spacing.md }]}>{ABOUT_TEXT.footer}</Text>

      <View style={styles.ownerCard}>
        <Image source={require('../../assets/brand/owner.jpeg')} style={styles.ownerPhoto} />
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{OWNER.name}</Text>
          <Text style={styles.ownerTitle}>{OWNER.title}</Text>
        </View>
      </View>
    </>
  );
}

function HowItWorksContent() {
  return (
    <>
      {HOW_IT_WORKS_STEPS.map((step) => (
        <View key={step.num} style={styles.stepCard}>
          <Text style={styles.stepNum}>{step.num}</Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
        </View>
      ))}
    </>
  );
}

function FeaturesContent() {
  return (
    <View style={styles.featuresGrid}>
      {FEATURES.map((f) => (
        <View key={f.title} style={styles.featureCard}>
          <Text style={styles.featureTitle}>{f.title}</Text>
          <Text style={styles.featureBody}>{f.body}</Text>
        </View>
      ))}
    </View>
  );
}

function MissionContent() {
  return (
    <>
      <Text style={styles.missionStat}>{MISSION.stat}</Text>
      <Text style={styles.missionStatLabel}>people worldwide live with some form of vision impairment</Text>
      {MISSION.paragraphs.map((p, i) => (
        <Text key={i} style={styles.paragraph}>{p}</Text>
      ))}
    </>
  );
}

function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <>
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <TouchableOpacity
            key={item.q}
            style={styles.faqItem}
            activeOpacity={0.8}
            onPress={() => setOpenIndex(isOpen ? null : i)}
            accessibilityRole="button"
            accessibilityLabel={item.q}
            accessibilityState={{ expanded: isOpen }}
          >
            <View style={styles.faqQuestionRow}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Ionicons name={isOpen ? 'remove' : 'add'} size={20} color={colors.gold} />
            </View>
            {isOpen && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function ContactContent() {
  return (
    <View style={styles.contactCard}>
      <View style={styles.contactRow}>
        <Ionicons name="mail-outline" size={18} color={colors.gold} />
        <Text style={styles.contactText}>{CONTACT.email}</Text>
      </View>
      {!!CONTACT.phone && (
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={18} color={colors.gold} />
          <Text style={styles.contactText}>{CONTACT.phone}</Text>
        </View>
      )}
      <View style={styles.contactRow}>
        <Ionicons name="location-outline" size={18} color={colors.gold} />
        <Text style={styles.contactText}>{CONTACT.address}</Text>
      </View>
    </View>
  );
}

export default function InfoScreen({ route, navigation }: Props) {
  const { section } = route.params;

  return (
    <View style={styles.screen}>
      <ChromeHeader title={TITLES[section]} subtitle="ADCC PRO" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === 'about' && <AboutContent />}
        {section === 'how-it-works' && <HowItWorksContent />}
        {section === 'features' && <FeaturesContent />}
        {section === 'mission' && <MissionContent />}
        {section === 'faq' && <FaqContent />}
        {section === 'contact' && <ContactContent />}
        {section === 'terms-of-use' && <LegalContent sections={TERMS_OF_USE} />}
        {section === 'terms-conditions' && <LegalContent sections={TERMS_AND_CONDITIONS} />}
        {section === 'privacy-policy' && <LegalContent sections={PRIVACY_POLICY} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  paragraph: { ...type.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  legalHeading: { ...type.h2, fontSize: 16, color: colors.goldBright, marginBottom: spacing.sm },
  highlightCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingLeft: spacing.md,
    marginTop: spacing.sm,
  },
  highlightText: { ...type.body, color: colors.text, fontWeight: '600', lineHeight: 22 },

  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  ownerPhoto: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceRaised },
  ownerInfo: { flex: 1 },
  ownerName: { ...type.body, color: colors.text, fontWeight: '700' },
  ownerTitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  stepCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepNum: { ...type.label, color: colors.gold, fontSize: 13, letterSpacing: 2, marginBottom: spacing.sm },
  stepTitle: { ...type.h2, color: colors.text, marginBottom: spacing.xs },
  stepBody: { ...type.body, color: colors.textMuted, lineHeight: 20 },

  featuresGrid: { gap: spacing.md },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    borderTopColor: colors.goldDim,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  featureTitle: { ...type.h2, fontSize: 16, color: colors.goldBright, marginBottom: spacing.xs },
  featureBody: { ...type.body, color: colors.textMuted, lineHeight: 20 },

  missionStat: { ...type.display, fontSize: 40, color: colors.gold, marginBottom: spacing.xs },
  missionStatLabel: { ...type.caption, color: colors.textFaint, marginBottom: spacing.lg },

  faqItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  faqQuestion: { ...type.body, color: colors.text, fontWeight: '700', flex: 1 },
  faqAnswer: { ...type.body, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },

  contactCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactText: { ...type.body, color: colors.text },
});
