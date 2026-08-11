import { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getOrderHistory, type Order } from '@table-ready/shared'
import { useAuthStore } from '@table-ready/shared'
import { useThemeStore } from '../stores/themeStore'
import BackButton from '../components/BackButton'

export default function OrderHistoryScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors)
  const styles = useMemo(() => createStyles(colors), [colors])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    if (!user) return
    try {
      const res = await getOrderHistory(user.id)
      setOrders(res.orders)
    } catch (err) {
      console.error('Failed to load order history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderTracking', { id: item.master_order_id.toString() })}>
      <View style={styles.row}>
        <Text style={styles.orderId}>Order #{item.master_order_id}</Text>
        <Text style={styles.status}>{item.status.replace(/_/g, ' ')}</Text>
      </View>
      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      <View style={styles.footer}>
        <Text style={styles.type}>{item.order_type.replace(/_/g, ' ')}</Text>
        <Text style={styles.total}>${parseFloat(item.total_amount as any).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BackButton navigation={navigation} />
      {orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No orders yet</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
            <Text style={styles.link}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={orders} renderItem={renderOrder} keyExtractor={(item) => item.master_order_id.toString()} />
      )}
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
    gap: 12,
  },
  empty: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  status: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  type: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
})
