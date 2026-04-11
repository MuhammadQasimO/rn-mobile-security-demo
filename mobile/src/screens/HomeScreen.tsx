import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signedFetch, type SignedFetchResult } from '../api/client';
import { ResultCard } from '../components/ResultCard';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
}) as string;

export function HomeScreen(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignedFetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await signedFetch({
        baseUrl: BASE_URL,
        path: '/secure/echo',
        method: 'POST',
        body: { hello: 'world', at: new Date().toISOString() },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.heading}>Signed request</Text>
      <Text style={styles.copy}>
        Tap the button below to send a JSON payload to {BASE_URL}/secure/echo.
        The client signs the request with HMAC-SHA256 over a canonical string
        of timestamp + method + path + body hash. The server validates the
        signature and timestamp window before returning a 200.
      </Text>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={run} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send signed POST'}</Text>
      </Pressable>

      {result && <ResultCard status={result.status} body={result.body} />}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '600' },
  copy: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#052e16', fontWeight: '600', fontSize: 14 },
  errorBox: { backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8 },
  errorText: { color: '#fee2e2', fontSize: 12 },
});
