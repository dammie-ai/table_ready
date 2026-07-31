import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { getComboMeals, type ComboMeal } from '@table-ready/shared';

type Step = 1 | 2 | 3 | 4;

const STEPS = ['Select Combo', 'Pick Main', 'Pick Sides', 'Review'];

export default function ComboBuilderScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>(1);
  const [combos, setCombos] = useState<ComboMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCombo, setSelectedCombo] = useState<ComboMeal | null>(null);
  const [selectedMain, setSelectedMain] = useState<any>(null);
  const [selectedSides, setSelectedSides] = useState<any[]>([]);

  useState(() => {
    getComboMeals()
      .then((res) => {
        setCombos(res.combos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  });

  const mainItems = selectedCombo
    ? combos.flatMap((c) => []).concat(
        // We'll use a fallback: filter menu items by category
        []
      )
    : [];
  
  // For demo purposes, we use static menu items matching the combo category
  const demoMenuItems = [
    { id: '1', name: 'Classic Burger', category: 'Entrees', price: 14.99, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&h=200&fit=crop' },
    { id: '2', name: 'Grilled Chicken', category: 'Entrees', price: 16.99, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=200&h=200&fit=crop' },
    { id: '3', name: 'Caesar Salad', category: 'Entrees', price: 12.99, image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=200&h=200&fit=crop' },
    { id: '4', name: 'Fish & Chips', category: 'Entrees', price: 17.99, image: 'https://images.unsplash.com/photo-1579208030886-b937da0925dc?w=200&h=200&fit=crop' },
    { id: '5', name: 'French Fries', category: 'Sides', price: 5.99, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&h=200&fit=crop' },
    { id: '6', name: 'Onion Rings', category: 'Sides', price: 6.99, image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=200&h=200&fit=crop' },
    { id: '7', name: 'Coleslaw', category: 'Sides', price: 4.99, image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=200&h=200&fit=crop' },
    { id: '8', name: 'Chocolate Cake', category: 'Desserts', price: 8.99, image: 'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=200&h=200&fit=crop' },
    { id: '9', name: 'Ice Cream', category: 'Desserts', price: 6.99, image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&h=200&fit=crop' },
    { id: '10', name: 'Cheesecake', category: 'Desserts', price: 7.99, image: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=200&h=200&fit=crop' },
  ];

  const availableMains = selectedCombo
    ? demoMenuItems.filter((m) => m.category === selectedCombo.required_main_category)
    : [];
  const availableSides = demoMenuItems.filter((m) => m.category === selectedCombo?.sides_category || 'Sides');
  const maxSides = selectedCombo?.max_sides || 0;

  const handleSelectCombo = (combo: ComboMeal) => {
    setSelectedCombo(combo);
    setSelectedMain(null);
    setSelectedSides([]);
    setStep(2);
  };

  const handleSelectMain = (item: any) => {
    setSelectedMain(item);
  };

  const handleToggleSide = (item: any) => {
    setSelectedSides((prev) => {
      const exists = prev.find((s) => s.id === item.id);
      if (exists) return prev.filter((s) => s.id !== item.id);
      if (prev.length >= maxSides) return prev;
      return [...prev, item];
    });
  };

  const handleAddToCart = () => {
    if (!selectedCombo || !selectedMain) return;
    navigation.navigate('Cart', {
      newCombo: {
        name: selectedCombo.name,
        price: selectedCombo.base_price,
        main: selectedMain,
        sides: selectedSides,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading combos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 1 ? navigation.goBack() : setStep((s) => (s - 1) as Step))}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={typography.h3}>Combo Builder</Text>
      </View>

      <View style={styles.stepIndicator}>
        {STEPS.map((label, idx) => {
          const stepNum = (idx + 1) as Step;
          const isActive = stepNum === step;
          const isDone = stepNum < step;
          return (
            <View key={stepNum} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                { backgroundColor: isDone ? colors.success : isActive ? colors.primary : '#e5e7eb' },
              ]}>
                <Text style={[
                  styles.stepNumber,
                  { color: isDone || isActive ? '#ffffff' : '#9ca3af' },
                ]}>
                  {isDone ? '✓' : stepNum}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                { color: isActive ? colors.primary : isDone ? colors.success : '#9ca3af' },
              ]}>
                {label}
              </Text>
              {idx < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: stepNum < step ? colors.success : '#e5e7eb' },
                ]} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Choose a combo deal to get started</Text>
            {combos.map((combo) => (
              <TouchableOpacity
                key={combo.combo_id}
                onPress={() => handleSelectCombo(combo)}
                style={styles.comboCard}
              >
                <View style={styles.comboHeader}>
              <View style={styles.comboInfo}>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <Text style={styles.comboDesc}>{combo.description}</Text>
                </View>
                <Text style={styles.comboPrice}>${combo.base_price.toFixed(2)}</Text>
              </View>
              <View style={styles.comboTags}>
                <View style={styles.comboTag}>
                  <Text style={styles.comboTagText}>1 {selectedCombo?.required_main_category === 'Desserts' ? 'Dessert' : 'Entree'}</Text>
                </View>
                <View style={[styles.comboTag, styles.comboTagOrange]}>
                  <Text style={[styles.comboTagText, styles.comboTagTextOrange]}>
                    {combo.max_sides} Side{combo.max_sides > 1 ? 's' : ''}
                  </Text>
                </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && selectedCombo && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Pick Your Main</Text>
            <Text style={styles.stepSubtitle}>
              Choose one {selectedCombo.required_main_category === 'Desserts' ? 'Dessert' : 'Entree'}
            </Text>
            <View style={styles.itemList}>
              {availableMains.map((item) => {
                const isSelected = selectedMain?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectMain(item)}
                    style={[
                      styles.itemCard,
                      isSelected && styles.itemCardSelected,
                    ]}
                  >
                    <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button
              title="Continue →"
              onPress={() => selectedMain && setStep(3)}
              disabled={!selectedMain}
              variant="primary"
              style={styles.stepButton}
            />
          </View>
        )}

        {step === 3 && selectedCombo && (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View>
                <Text style={styles.stepTitle}>Step 2: Pick Your Sides</Text>
                <Text style={styles.stepSubtitle}>Choose {maxSides} side{maxSides > 1 ? 's' : ''}</Text>
              </View>
              <View style={[
                styles.counterBadge,
                selectedSides.length === maxSides && styles.counterBadgeFull,
              ]}>
                <Text style={[
                  styles.counterText,
                  selectedSides.length === maxSides && styles.counterTextFull,
                ]}>
                  {selectedSides.length} / {maxSides}
                </Text>
              </View>
            </View>
            <View style={styles.sideGrid}>
              {availableSides.map((item) => {
                const isSelected = selectedSides.some((s) => s.id === item.id);
                const isDisabled = !isSelected && selectedSides.length >= maxSides;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => !isDisabled && handleToggleSide(item)}
                    disabled={isDisabled}
                    style={[
                      styles.sideCard,
                      isSelected && styles.sideCardSelected,
                      isDisabled && styles.sideCardDisabled,
                    ]}
                  >
                    <Image source={{ uri: item.image }} style={styles.sideImage} resizeMode="cover" />
                    {isSelected && (
                      <View style={styles.sideCheck}>
                        <Text style={styles.sideCheckText}>✓</Text>
                      </View>
                    )}
                    <View style={styles.sideContent}>
                      <Text style={styles.sideName}>{item.name}</Text>
                      <Text style={styles.sidePrice}>${item.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button
              title="Review Order →"
              onPress={() => selectedSides.length === maxSides && setStep(4)}
              disabled={selectedSides.length !== maxSides}
              variant="primary"
              style={styles.stepButton}
            />
          </View>
        )}

        {step === 4 && selectedCombo && selectedMain && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Combo</Text>
            <View style={styles.reviewCard}>
              <Image source={{ uri: selectedMain.image }} style={styles.reviewImage} resizeMode="cover" />
              <View style={styles.reviewContent}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewComboName}>{selectedCombo.name}</Text>
                  <Text style={styles.reviewPrice}>${selectedCombo.base_price.toFixed(2)}</Text>
                </View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionLabel}>Main</Text>
                  <View style={styles.reviewItemRow}>
                    <View style={styles.reviewDot} />
                    <Text style={styles.reviewItemText}>{selectedMain.name}</Text>
                  </View>
                </View>
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionLabel}>Sides ({selectedSides.length})</Text>
                  {selectedSides.map((side, i) => (
                    <View key={side.id} style={styles.reviewItemRow}>
                      <View style={[styles.reviewDot, styles.reviewDotOrange]} />
                      <Text style={styles.reviewItemText}>Side {i + 1}: {side.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <Button title={`Add to Cart — $${selectedCombo.base_price.toFixed(2)}`} onPress={handleAddToCart} variant="primary" style={styles.stepButton} />
            <Button title="← Back" onPress={() => setStep(3)} variant="secondary" style={styles.stepButton} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '60%',
    right: '-40%',
    height: 2,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stepContent: {
    gap: spacing.lg,
  },
  stepTitle: {
    ...typography.h3,
  },
  stepSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comboCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  comboInfo: {
    flex: 1,
  },
  comboName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  comboDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  comboPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  comboTags: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comboTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  comboTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  comboTagOrange: {
    backgroundColor: '#fff7ed',
  },
  comboTagTextOrange: {
    color: colors.secondary,
  },
  itemList: {
    gap: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#e5e7eb',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepButton: {
    width: '100%',
  },
  counterBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#eff6ff',
  },
  counterBadgeFull: {
    backgroundColor: '#dcfce7',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  counterTextFull: {
    color: colors.success,
  },
  sideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sideCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sideCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  sideCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f9fafb',
  },
  sideImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#e5e7eb',
  },
  sideCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCheckText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sideContent: {
    padding: spacing.md,
  },
  sideName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  sidePrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#e5e7eb',
  },
  reviewContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewComboName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  reviewPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  reviewSection: {
    gap: spacing.xs,
  },
  reviewSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  reviewDotOrange: {
    backgroundColor: colors.secondary,
  },
  reviewItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
