import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native'
import { createServiceRequest, getServiceRequests, getStorageItem } from '@table-ready/shared'

const REQUEST_TYPES = [
  { key: 'refill', label: 'Water', icon: '💧' },
  { key: 'other', label: 'Napkins', icon: '🧻' },
  { key: 'bill_request', label: 'Bill', icon: '🧾' },
  { key: 'call_server', label: 'Assistance', icon: '🆘' },
]

export default function ServiceRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await getServiceRequests()
      setRequests(res.requests)
    } catch (err) {
      console.error('Failed to load service requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (request_type: string) => {
    try {
      const stored = await getStorageItem('tableready_table_number')
      const table_number = stored ? Number(stored) : 0
      await createServiceRequest({ table_number, request_type, notes: '' })
      Alert.alert('Request Sent', 'Staff has been notified')
      loadRequests()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send request')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f97316'
      case 'acknowledged': return '#2563eb'
      case 'completed': return '#16a34a'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Requests</Text>

      <View style={styles.quickActions}>
        {REQUEST_TYPES.map((req) => (
          <TouchableOpacity key={req.key} style={styles.actionButton} onPress={() => handleRequest(req.key)}>
            <Text style={styles.actionIcon}>{req.icon}</Text>
            <Text style={styles.actionLabel}>{req.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.listTitle}>Recent Requests</Text>
      {requests.length === 0 ? (
        <Text style={styles.empty}>No requests yet</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.request_type.replace('_', ' ').toUpperCase()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardDetail}>{item.notes || 'No additional notes'}</Text>
              <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  empty: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
})
