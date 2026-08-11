import { useState, useMemo, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { verifyTableCode, setStorageItem } from '@table-ready/shared'
import Button from '../components/Button'
import { spacing, borderRadius, typography } from '../theme'
import { useThemeStore } from '../stores/themeStore'

// A table's QR encodes a staff-web URL like
// https://.../table-pin?table=5&code=1234 — the same format staff-web's own
// TablePin page reads directly from its route query string. We only need
// the two params out of it, so a small regex avoids depending on the
// `URL`/`URLSearchParams` globals (not guaranteed present in the RN JS
// runtime the way they are in a browser).
function parseTableQr(raw: string): { table: string; code: string } | null {
  const tableMatch = raw.match(/[?&]table=(\d+)/)
  const codeMatch = raw.match(/[?&]code=(\d{4})/)
  if (!tableMatch || !codeMatch) return null
  return { table: tableMatch[1], code: codeMatch[1] }
}

export default function TablePinScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors)
  const styles = useMemo(() => createStyles(colors), [colors])
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [tableNumber, setTableNumber] = useState('')
  const [pin, setPin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<{ table: string; code: string } | null>(null)
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraStalled, setCameraStalled] = useState(false)
  // expo-camera on Android is well known for failing to activate the
  // physical camera on a CameraView's very first mount, producing exactly
  // a blank/black preview with no error — and working the moment the view
  // unmounts and remounts. Bumping this forces React to fully recreate the
  // <CameraView> (rather than just reload the JS), which reliably clears it.
  const [cameraKey, setCameraKey] = useState(0)
  const scannedRef = useRef(false)
  const autoRetriedRef = useRef(false)

  useEffect(() => {
    autoRetriedRef.current = false
  }, [mode, permission?.granted])

  useEffect(() => {
    if (mode !== 'scan' || !permission?.granted) {
      setCameraStalled(false)
      return
    }
    setCameraReady(false)
    setCameraStalled(false)
    const timeout = setTimeout(() => {
      setCameraReady((ready) => {
        if (ready) return ready
        // The known fix is remounting the view — try that once on our own
        // before bothering the user with a "camera broken" message.
        if (!autoRetriedRef.current) {
          autoRetriedRef.current = true
          setCameraKey((k) => k + 1)
        } else {
          setCameraStalled(true)
        }
        return ready
      })
    }, 4000)
    return () => clearTimeout(timeout)
  }, [mode, permission?.granted, cameraKey])

  const retryCamera = () => {
    setCameraStalled(false)
    setCameraReady(false)
    autoRetriedRef.current = true
    setCameraKey((k) => k + 1)
  }

  const verify = async (table: string, code: string) => {
    setVerifying(true)
    setError('')
    try {
      const res = await verifyTableCode({ table_number: Number(table), code })
      await setStorageItem('tableready_table_id', String(res.table_id))
      await setStorageItem('tableready_table_number', table)
      if (res.waiter_name) {
        await setStorageItem('tableready_waiter_name', res.waiter_name)
      }
      setVerified({ table, code })
      setTimeout(() => {
        navigation.replace('Menu', { mode: 'dine-in', table_number: Number(table) })
      }, 1800)
    } catch (err) {
      scannedRef.current = false
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || verifying) return
    const parsed = parseTableQr(data)
    if (!parsed) {
      // Previously silent — a misread or a QR code that isn't one of ours
      // looked identical to a fully broken scanner, with zero indication
      // why nothing happened.
      setError("That doesn't look like a TableReady table code — try again or enter it manually.")
      return
    }
    scannedRef.current = true
    setError('')
    verify(parsed.table, parsed.code)
  }

  const handleManualSubmit = () => {
    if (!tableNumber || pin.length !== 4) return
    verify(tableNumber, pin)
  }

  if (verified) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Table {verified.table} confirmed!</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Table Code</Text>
          <Text style={styles.codeValue}>{verified.code}</Text>
        </View>
        <Text style={styles.successHint}>
          Dining with others? Share this code — they can enter it under "Dine In" to join this table too.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>{mode === 'scan' ? 'Scan Table QR Code' : 'Enter Table Code'}</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {mode === 'scan' ? (
        <View style={styles.scanArea}>
          {!permission ? (
            <View style={styles.permissionBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionIcon}>📷</Text>
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionText}>
                Point your camera at the QR code on your table to seat yourself instantly.
              </Text>
              <Button title="Grant Camera Access" onPress={requestPermission} variant="primary" style={styles.permissionButton} />
            </View>
          ) : cameraStalled ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionIcon}>📷</Text>
              <Text style={styles.permissionTitle}>Camera preview didn't start</Text>
              <Text style={styles.permissionText}>
                This is a known Android quirk with the camera failing to activate on its first try
                — retrying almost always fixes it.
              </Text>
              <Button title="Retry Camera" onPress={retryCamera} variant="primary" style={styles.permissionButton} />
              <Button title="Enter Code Manually" onPress={() => setMode('manual')} variant="secondary" style={styles.permissionButton} />
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <CameraView
                key={cameraKey}
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={verifying ? undefined : handleBarcodeScanned}
                onCameraReady={() => setCameraReady(true)}
              />
              <View style={styles.scanFrame} pointerEvents="none" />
              {!cameraReady && (
                <View style={styles.scanOverlay}>
                  <ActivityIndicator color="#ffffff" size="large" />
                </View>
              )}
              {cameraReady && verifying && (
                <View style={styles.scanOverlay}>
                  <ActivityIndicator color="#ffffff" size="large" />
                </View>
              )}
            </View>
          )}
          <Text style={styles.scanHint}>Point your camera at the QR code on your table</Text>
        </View>
      ) : (
        <View style={styles.manualForm}>
          <Text style={styles.fieldLabel}>Table Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 12"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={tableNumber}
            onChangeText={setTableNumber}
          />
          <Text style={styles.fieldLabel}>4-Digit Table Code</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={4}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          />
          <Text style={styles.manualHint}>Ask your server for the table code, or scan the QR code instead.</Text>
          <Button
            title={verifying ? 'Verifying...' : 'Confirm Table'}
            onPress={handleManualSubmit}
            disabled={verifying || !tableNumber || pin.length !== 4}
            variant="primary"
            style={styles.confirmButton}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={() => { setError(''); setMode(mode === 'scan' ? 'manual' : 'scan') }}
        style={styles.switchModeButton}
      >
        <Text style={styles.switchModeText}>
          {mode === 'scan' ? 'Enter Code Manually' : 'Scan QR Code Instead'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    margin: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  scanArea: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '15%',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionBox: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionIcon: {
    fontSize: 40,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  permissionText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  manualForm: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  pinInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  manualHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  confirmButton: {
    marginTop: spacing.xl,
  },
  switchModeButton: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  switchModeText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 6,
  },
  successHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
})
