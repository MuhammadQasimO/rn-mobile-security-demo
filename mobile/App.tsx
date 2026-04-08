import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
      <View style={styles.body}>
        <Text style={styles.title}>Mobile Security Demo</Text>
        <Text style={styles.subtitle}>Native SSL pinning + HMAC request signing</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
