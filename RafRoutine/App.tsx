/**
 * Raf Routine — companion app.
 *
 * Single dark screen that holds the routine locally, shows a faithful in-app
 * preview of the home-screen widget, and exposes two actions:
 *   - Push to widget  -> serialize + send to native via WidgetBridge
 *   - Reset to sample  -> restore canonical sample data
 *
 * A 1s interval ticks a `now` clock so the preview's live state stays current.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {Routine} from './src/types/routine';
import {tokens} from './src/theme/tokens';
import {
  resetToSample,
  saveRoutine,
  seedIfEmpty,
} from './src/storage/routineStorage';
import {fetchRoutine} from './src/services/routineApi';
import {WidgetBridge, isWidgetBridgeAvailable} from './src/native/WidgetBridge';
import WidgetPreview from './src/components/WidgetPreview';
import PrimaryButton from './src/components/PrimaryButton';

function App(): React.JSX.Element {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [pushing, setPushing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Track mount state so async callbacks don't set state after unmount.
  const mountedRef = useRef(true);

  const syncWidget = useCallback(async (nextRoutine: Routine): Promise<void> => {
    if (!isWidgetBridgeAvailable()) {
      return;
    }
    await WidgetBridge.pushRoutine(nextRoutine);
  }, []);

  // Pull live data from the backend, cache it, and show it. On any failure keep
  // whatever is already displayed (cached/sample) and report offline.
  const loadFromServer = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      const live = await fetchRoutine();
      await saveRoutine(live);
      await syncWidget(live);
      if (!mountedRef.current) {
        return;
      }
      setRoutine(live);
      setNow(new Date());
      setStatus('Live data loaded from server and synced to widget.');
    } catch (err) {
      console.warn('[App] server fetch failed:', err);
      if (mountedRef.current) {
        setStatus('Offline — showing saved data.');
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, []);

  // Seed cached/sample data for an instant paint, then replace it with live
  // backend data.
  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    seedIfEmpty()
      .then(loaded => {
        void syncWidget(loaded).catch(err => {
          console.warn('[App] initial widget sync failed:', err);
        });
        if (active) {
          setRoutine(loaded);
        }
      })
      .catch(err => {
        console.warn('[App] seedIfEmpty failed:', err);
      })
      .finally(() => {
        void loadFromServer();
      });
    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [loadFromServer]);

  // Tick the clock every second so live state updates.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handlePush = useCallback(async () => {
    if (!routine) {
      return;
    }
    setPushing(true);
    setStatus('');
    try {
      await WidgetBridge.pushRoutine(routine);
      if (!mountedRef.current) {
        return;
      }
      if (isWidgetBridgeAvailable()) {
        setStatus('Pushed to widget.');
        Alert.alert('Raf Routine', 'Routine pushed to the home-screen widget.');
      } else {
        setStatus('Widget module not linked on this build (no-op).');
      }
    } catch (err) {
      console.warn('[App] push failed:', err);
      if (mountedRef.current) {
        setStatus('Push failed — see logs.');
      }
    } finally {
      if (mountedRef.current) {
        setPushing(false);
      }
    }
  }, [routine]);

  const handleReset = useCallback(async () => {
    try {
      const sample = await resetToSample();
      await syncWidget(sample);
      if (!mountedRef.current) {
        return;
      }
      setRoutine(sample);
      setNow(new Date());
      setStatus('Reset to sample data and synced to widget.');
    } catch (err) {
      console.warn('[App] reset failed:', err);
      if (mountedRef.current) {
        setStatus('Reset failed — see logs.');
      }
    }
  }, [syncWidget]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={tokens.screenBg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Raf Routine</Text>
        <Text style={styles.subtitle}>
          Your class routine, live on the home screen.
        </Text>

        <View style={styles.previewWrap}>
          {routine ? (
            <WidgetPreview routine={routine} now={now} />
          ) : (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Loading routine…</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Push to widget"
            onPress={handlePush}
            variant="solid"
            loading={pushing}
            disabled={!routine}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title="Refresh from server"
            onPress={loadFromServer}
            variant="ghost"
            loading={refreshing}
            disabled={refreshing}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title="Reset to sample"
            onPress={handleReset}
            variant="ghost"
            disabled={!routine}
          />
        </View>

        {status ? <Text style={styles.statusLine}>{status}</Text> : null}

        <Text style={styles.help}>
          Tip: long-press your home screen, choose Widgets, and add the “Raf
          Routine” widget. Tap “Push to widget” after any change to refresh it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.screenBg,
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  title: {
    color: tokens.text.title,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: tokens.text.secondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },
  previewWrap: {
    marginBottom: 22,
  },
  loading: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: tokens.text.muted,
    fontSize: 13,
  },
  actions: {
    marginBottom: 12,
  },
  gap: {
    height: 12,
  },
  statusLine: {
    color: tokens.accent.greenText,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  help: {
    color: tokens.text.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});

export default App;
