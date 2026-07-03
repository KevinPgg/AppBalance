import { Alert, Platform } from 'react-native';

// En React Native Web, Alert.alert con botones NO se muestra: el onPress del
// botón destructivo nunca corre, así que "eliminar" parecía no funcionar.
// Estos helpers usan las APIs del navegador en web y Alert en nativo.

export function confirmAsync(
  title: string,
  message?: string,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== 'undefined' ? window.confirm(text) : false;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// Aviso simple (un solo botón). También roto en web con Alert.alert.
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
