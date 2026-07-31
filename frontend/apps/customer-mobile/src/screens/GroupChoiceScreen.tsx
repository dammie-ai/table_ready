import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Button from '../components/Button'
import Card from '../components/Card'
import { colors, spacing, typography } from '../../theme'

export default function GroupChoiceScreen({ navigation }: any) {
  const [selected, setSelected] = useState<'solo' | 'group' | null>(null)

  return (
    <View style={styles.container}>
      <Text style={typography.h2}>How are you ordering?</Text>
      <Text style={styles.subtitle}>Choose your dining style to get started</Text>

      <View style={styles.cards}>
        <TouchableOpacity
          onPress={() => setSelected('solo')}
          activeOpacity={0.9}
        >
          <Card
            title="Just Me"
            subtitle="Ordering alone, paying alone"
            icon="👤"
            selected={selected === 'solo'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelected('group')}
          activeOpacity={0.9}
        >
          <Card
            title="Group Order"
            subtitle="Dining together, split the bill"
            icon="👥"
            selected={selected === 'group'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={() => navigation.replace('Welcome')}
          disabled={!selected}
          variant={selected ? 'primary' : 'tertiary'}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  cards: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    marginBottom: 32,
  },
  footer: {
    width: '100%',
    maxWidth: 360,
  },
})
