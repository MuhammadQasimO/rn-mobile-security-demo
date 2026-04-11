import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { AttackScreen } from './src/screens/AttackScreen';

type Tab = 'home' | 'attack';

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
      <View style={styles.header}>
        <Text style={styles.title}>Mobile Security Demo</Text>
        <Text style={styles.subtitle}>Native SSL pinning + HMAC request signing</Text>
      </View>
      <View style={styles.tabs}>
        <TabButton label="Home" active={tab === 'home'} onPress={() => setTab('home')} />
        <TabButton label="Attack" active={tab === 'attack'} onPress={() => setTab('attack')} />
      </View>
      <View style={styles.content}>{tab === 'home' ? <HomeScreen /> : <AttackScreen />}</View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  header: { padding: 20, gap: 4 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#94a3b8', fontSize: 13 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1e293b',
  },
  tabActive: { backgroundColor: '#22c55e' },
  tabText: { color: '#cbd5e1', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#052e16' },
  content: { flex: 1 },
});
