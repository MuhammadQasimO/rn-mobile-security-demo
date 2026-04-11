import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface Props {
  status: number;
  body: unknown;
}

export function ResultCard({ status, body }: Props): React.JSX.Element {
  const ok = status >= 200 && status < 300;
  return (
    <View style={[styles.card, ok ? styles.ok : styles.fail]}>
      <Text style={[styles.status, ok ? styles.statusOk : styles.statusFail]}>
        {ok ? 'PASS' : 'REJECTED'} · HTTP {status}
      </Text>
      <Text style={styles.pre}>{stringify(body)}</Text>
    </View>
  );
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  ok: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  fail: { backgroundColor: '#450a0a', borderColor: '#ef4444' },
  status: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  statusOk: { color: '#86efac' },
  statusFail: { color: '#fca5a5' },
  pre: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
