import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';

const MIN_LENGTH = 3;
const DEBOUNCE_MS = 180;

/**
 * TextInput invisible que captura input de scanners físicos HID (Bluetooth/USB).
 * Los scanners HID envían el código como keystrokes seguidos de Enter.
 * Se mantiene enfocado mientras la pantalla está activa.
 *
 * Props:
 *   onScanned(code: string) — se llama con el código completo
 *   enabled — montar/desmontar el input (default true)
 *   inputRef — ref externo opcional para poder llamar a .focus() desde el padre
 */
export default function HidScannerInput({ onScanned, enabled = true, inputRef: externalRef }) {
  const internalRef = useRef(null);
  const ref = externalRef ?? internalRef;
  const bufferRef = useRef('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => ref.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [enabled, ref]);

  const dispatch = useCallback((raw) => {
    clearTimeout(debounceRef.current);
    bufferRef.current = '';
    ref.current?.clear();
    const code = raw.trim();
    if (code.length >= MIN_LENGTH) onScanned(code);
    setTimeout(() => ref.current?.focus(), 80);
  }, [onScanned, ref]);

  const onChangeText = useCallback((text) => {
    bufferRef.current = text;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => dispatch(bufferRef.current), DEBOUNCE_MS);
  }, [dispatch]);

  const onSubmitEditing = useCallback((e) => {
    dispatch(e.nativeEvent.text || bufferRef.current);
  }, [dispatch]);

  if (!enabled) return null;

  return (
    <TextInput
      ref={ref}
      style={styles.hidden}
      autoFocus
      showSoftInputOnFocus={false}
      blurOnSubmit={false}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
    />
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
