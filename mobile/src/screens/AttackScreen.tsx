import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signedFetch, type SignedFetchResult } from '../api/client';
import { ResultCard } from '../components/ResultCard';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
}) as string;

type AttackKind = 'tampered_body' | 'stale_timestamp' | 'unsigned';

interface AttackSpec {
  kind: AttackKind;
  label: string;
  description: string;
  expectedError: string;
}

const ATTACKS: AttackSpec[] = [
  {
    kind: 'tampered_body',
    label: 'Tamper the body after signing',
    description:
      'Sign a small payload, then ship a different (larger) payload on the wire. Server recomputes the hash and rejects.',
    expectedError: 'bad_signature',
  },
  {
    kind: 'stale_timestamp',
    label: 'Replay with a 10-minute-old timestamp',
    description:
      'Forge a signature for a timestamp outside the server window. Catches captured-and-resent requests.',
    expectedError: 'stale_timestamp',
  },
  {
    kind: 'unsigned',
    label: 'Send the request unsigned',
    description: 'Skip signature headers entirely — server should refuse to process.',
    expectedError: 'missing_headers',
  },
];

export function AttackScreen(): React.JSX.Element {
  const [results, setResults] = useState<Partial<Record<AttackKind, SignedFetchResult>>>({});
  const [running, setRunning] = useState<AttackKind | null>(null);

  const run = async (attack: AttackSpec): Promise<void> => {
    setRunning(attack.kind);
    try {
      const legitBody = { amount: 100 };
      const tamperedBody = JSON.stringify({ amount: 999_999 });
      const tenMinutesAgo = String(Date.now() - 10 * 60 * 1000);

      const res = await signedFetch({
        baseUrl: BASE_URL,
        path: '/secure/echo',
        method: 'POST',
        body: legitBody,
        tamperedBody: attack.kind === 'tampered_body' ? tamperedBody : undefined,
        forcedTimestamp: attack.kind === 'stale_timestamp' ? tenMinutesAgo : undefined,
        unsigned: attack.kind === 'unsigned',
      });
      setResults((prev) => ({ ...prev, [attack.kind]: res }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.heading}>Try to defeat the signing layer</Text>
      <Text style={styles.copy}>
        Each scenario manipulates the outgoing request in a different way an attacker would.
        The server should reject all three with the matching error code.
      </Text>

      {ATTACKS.map((attack) => {
        const result = results[attack.kind];
        const isRunning = running === attack.kind;
        return (
          <View key={attack.kind} style={styles.scenario}>
            <Text style={styles.scenarioTitle}>{attack.label}</Text>
            <Text style={styles.scenarioCopy}>{attack.description}</Text>
            <Text style={styles.expected}>Expected: 401 {attack.expectedError}</Text>
            <Pressable
              style={[styles.button, isRunning && styles.buttonDisabled]}
              onPress={() => run(attack)}
              disabled={isRunning}
            >
              <Text style={styles.buttonText}>{isRunning ? 'Running…' : 'Run attack'}</Text>
            </Pressable>
            {result && <ResultCard status={result.status} body={result.body} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '600' },
  copy: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  scenario: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, gap: 8 },
  scenarioTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  scenarioCopy: { color: '#94a3b8', fontSize: 12, lineHeight: 16 },
  expected: { color: '#fbbf24', fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#450a0a', fontWeight: '600', fontSize: 13 },
});
