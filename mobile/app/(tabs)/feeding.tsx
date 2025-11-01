import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AnimalSelector } from '@/components/animal-selector'
import { ThemedSurface } from '@/components/themed-surface'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useAuth } from '@/hooks/use-auth'
import { useAnimals } from '@/hooks/use-animals'
import { apiRequest, ApiError } from '@/lib/api'

const measurementPresets = [
  { label: 'Weight', value: 'weight', defaultUnit: 'g' },
  { label: 'Length', value: 'length', defaultUnit: 'cm' },
  { label: 'Note', value: 'note', defaultUnit: '' },
] as const

type Segment = 'feedings' | 'health'

type FeedingRecordResponse = {
  id: string
  feedingDate: string
  consumed: 'fully' | 'partially' | 'refused'
  foodType: string | null
  quantity: string | null
  notes: string | null
  weight: number | null
  animalId: string | null
  createdAt: string
  updatedAt: string
}

type MeasurementRecordResponse = {
  id: string
  metricType: string
  value: number | null
  unit: string | null
  notes: string | null
  recordedAt: string
  animalId: string | null
  createdAt: string
  updatedAt: string
}

type Feeding = {
  id: string
  foodType: string
  quantity: string
  notes?: string
  date: Date
}

type Measurement = {
  id: string
  metricType: string
  value?: number
  unit?: string
  notes?: string
  recordedAt: Date
}

export default function FeedingScreen() {
  const colorScheme = useColorScheme()
  const { session } = useAuth()
  const { selectedAnimal, isHydrated: animalsHydrated } = useAnimals()
  const insets = useSafeAreaInsets()
  const [activeSegment, setActiveSegment] = useState<Segment>('feedings')
  const [showForm, setShowForm] = useState(false)

  const [feedings, setFeedings] = useState<Feeding[]>([])
  const [foodType, setFoodType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [measurementType, setMeasurementType] = useState<string>('weight')
  const [measurementValue, setMeasurementValue] = useState('')
  const [measurementUnit, setMeasurementUnit] = useState('g')
  const [measurementNotes, setMeasurementNotes] = useState('')

  const [isLoadingFeedings, setIsLoadingFeedings] = useState(false)
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false)
  const [isSubmittingFeeding, setIsSubmittingFeeding] = useState(false)
  const [isSubmittingMeasurement, setIsSubmittingMeasurement] = useState(false)

  const token = session?.token ?? null
  const activeAnimalId = selectedAnimal?.id ?? null
  const canLogEntries = Boolean(activeAnimalId)
  const showAnimalPrompt = animalsHydrated && !canLogEntries

  const loadFeedings = useCallback(async () => {
    if (!token || !activeAnimalId) {
      setFeedings([])
      return
    }

    setIsLoadingFeedings(true)
    try {
      const query = new URLSearchParams({ animalId: activeAnimalId }).toString()
      const response = await apiRequest<FeedingRecordResponse[]>(`/feedings?${query}`, {
        token,
        method: 'GET',
      })

      const nextFeedings = response.map((record) => ({
        id: record.id,
        foodType: record.foodType ?? 'Unknown food',
        quantity:
          record.quantity ??
          (record.weight != null ? `${record.weight.toFixed(1)} g` : 'Unspecified'),
        notes: record.notes ?? undefined,
        date: new Date(record.feedingDate),
      }))

      setFeedings(nextFeedings)
    } catch (error) {
      console.error('Failed to load feedings', error)
      Alert.alert('Unable to load feedings', 'Please try again later.')
    } finally {
      setIsLoadingFeedings(false)
    }
  }, [activeAnimalId, token])

  const loadMeasurements = useCallback(async () => {
    if (!token || !activeAnimalId) {
      setMeasurements([])
      return
    }

    setIsLoadingMeasurements(true)
    try {
      const query = new URLSearchParams({ animalId: activeAnimalId }).toString()
      const response = await apiRequest<MeasurementRecordResponse[]>(`/measurements?${query}`, {
        token,
        method: 'GET',
      })

      const nextMeasurements = response.map((record) => ({
        id: record.id,
        metricType: record.metricType,
        value: record.value ?? undefined,
        unit: record.unit ?? undefined,
        notes: record.notes ?? undefined,
        recordedAt: new Date(record.recordedAt),
      }))

      setMeasurements(nextMeasurements)
    } catch (error) {
      console.error('Failed to load measurements', error)
      Alert.alert('Unable to load measurements', 'Please try again later.')
    } finally {
      setIsLoadingMeasurements(false)
    }
  }, [activeAnimalId, token])

  useEffect(() => {
    if (!animalsHydrated) {
      return
    }

    if (!activeAnimalId) {
      setFeedings([])
      setMeasurements([])
      return
    }

    loadFeedings()
    loadMeasurements()
  }, [activeAnimalId, animalsHydrated, loadFeedings, loadMeasurements])

  useEffect(() => {
    if (!activeAnimalId) {
      setShowForm(false)
    }
  }, [activeAnimalId])

  useEffect(() => {
    setShowForm(false)
  }, [activeSegment])

  const addFeeding = useCallback(async () => {
    if (!token) {
      Alert.alert('Not authenticated', 'Sign in to log a feeding record.')
      return
    }

    if (!selectedAnimal?.id) {
      Alert.alert('Select an animal', 'Please choose or create an animal before logging feedings.')
      return
    }

    if (!foodType.trim() || !quantity.trim()) {
      Alert.alert('Required Fields', 'Please fill in food type and quantity')
      return
    }

    const trimmedFoodType = foodType.trim()
    const trimmedQuantity = quantity.trim()
    const trimmedNotes = notes.trim()

    setIsSubmittingFeeding(true)
    try {
      const record = await apiRequest<FeedingRecordResponse>('/feedings', {
        method: 'POST',
        token,
        body: {
          animalId: selectedAnimal.id,
          foodType: trimmedFoodType,
          quantity: trimmedQuantity,
          notes: trimmedNotes ? trimmedNotes : undefined,
        },
      })

      const next: Feeding = {
        id: record.id,
        foodType: record.foodType ?? trimmedFoodType,
        quantity: record.quantity ?? trimmedQuantity,
        notes: record.notes ?? (trimmedNotes || undefined),
        date: new Date(record.feedingDate),
      }

      setFeedings((current) => [next, ...current])
      setFoodType('')
      setQuantity('')
      setNotes('')
      setShowForm(false)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to save feeding record. Please try again.'
      Alert.alert('Failed to save feeding', message)
    } finally {
      setIsSubmittingFeeding(false)
    }
  }, [foodType, notes, quantity, selectedAnimal?.id, token])

  const deleteFeeding = useCallback(
    (id: string) => {
      if (!token) {
        Alert.alert('Not authenticated', 'Sign in to manage feeding records.')
        return
      }

    Alert.alert(
      'Delete Feeding',
      'Are you sure you want to delete this feeding record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
            onPress: async () => {
              try {
                await apiRequest<{ success: boolean }>(`/feedings/${id}`, {
                  method: 'DELETE',
                  token,
                })
                setFeedings((current) => current.filter((feeding) => feeding.id !== id))
              } catch (error) {
                const message =
                  error instanceof ApiError
                    ? error.message
                    : 'Unable to delete feeding record. Please try again.'
                Alert.alert('Delete failed', message)
              }
            },
          },
        ],
      )
    },
    [token],
  )

  const addMeasurement = useCallback(async () => {
    if (!token) {
      Alert.alert('Not authenticated', 'Sign in to log health data.')
      return
    }

    if (!selectedAnimal?.id) {
      Alert.alert('Select an animal', 'Choose or create an animal before logging health data.')
      return
    }

    const trimmedType = measurementType.trim()
    if (!trimmedType) {
      Alert.alert('Required Field', 'Please provide a measurement type')
      return
    }

    const trimmedUnit = measurementUnit.trim()
    const trimmedNotes = measurementNotes.trim()
    const requiresValue = trimmedType.toLowerCase() !== 'note'

    let numericValue: number | undefined
    if (measurementValue.trim().length > 0) {
      numericValue = Number(measurementValue)
    }

    if (requiresValue && (numericValue === undefined || Number.isNaN(numericValue))) {
      Alert.alert('Invalid Value', 'Enter a numeric value for this measurement')
      return
    }

    setIsSubmittingMeasurement(true)
    try {
      const payload = await apiRequest<MeasurementRecordResponse>('/measurements', {
        method: 'POST',
        token,
        body: {
          animalId: selectedAnimal.id,
          metricType: trimmedType,
          value: numericValue,
          unit: trimmedUnit ? trimmedUnit : undefined,
          notes: trimmedNotes ? trimmedNotes : undefined,
        },
      })

      const created: Measurement = {
        id: payload.id,
        metricType: payload.metricType,
        value: payload.value ?? undefined,
        unit: payload.unit ?? undefined,
        notes: payload.notes ?? undefined,
        recordedAt: new Date(payload.recordedAt),
      }

      setMeasurements((current) => [created, ...current])
      setMeasurementNotes('')
      setMeasurementValue('')
      setShowForm(false)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to save measurement. Please try again.'
      Alert.alert('Failed to save measurement', message)
    } finally {
      setIsSubmittingMeasurement(false)
    }
  }, [measurementNotes, measurementType, measurementUnit, measurementValue, selectedAnimal?.id, token])

  const deleteMeasurement = useCallback(
    (id: string) => {
      if (!token) {
        Alert.alert('Not authenticated', 'Sign in to manage health logs.')
        return
      }

      Alert.alert(
        'Delete Entry',
        'Are you sure you want to delete this measurement?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await apiRequest<{ success: boolean }>(`/measurements/${id}`, {
                  method: 'DELETE',
                  token,
                })
                setMeasurements((current) => current.filter((measurement) => measurement.id !== id))
              } catch (error) {
                const message =
                  error instanceof ApiError
                    ? error.message
                    : 'Unable to delete measurement. Please try again.'
                Alert.alert('Delete failed', message)
              }
            },
        },
        ],
      )
    },
    [token],
  )

  const colors = Colors[colorScheme ?? 'light']
  const primaryColor = colors.primary

  const sortedFeedings = useMemo(
    () => [...feedings].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [feedings],
  )

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()),
    [measurements],
  )

  const isLoadingActiveSegment =
    activeSegment === 'feedings' ? isLoadingFeedings : isLoadingMeasurements

  const isSubmittingActiveSegment =
    activeSegment === 'feedings' ? isSubmittingFeeding : isSubmittingMeasurement

  const activeButtonLabel =
    activeSegment === 'feedings'
      ? isSubmittingFeeding
        ? 'Saving…'
        : 'Add Feeding'
      : isSubmittingMeasurement
      ? 'Saving…'
      : 'Add Entry'

  const handlePresetSelect = useCallback((value: typeof measurementPresets[number]) => {
    setMeasurementType(value.value)
    setMeasurementUnit(value.defaultUnit)
    if (value.value === 'note') {
      setMeasurementValue('')
    }
  }, [])

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <AnimalSelector />
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ color: colors.text }}>
            Husbandry Log
          </ThemedText>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.addButton, { backgroundColor: primaryColor, ...Shadows.sm }]}
            onPress={() => {
              if (!selectedAnimal?.id) {
                Alert.alert('Select an animal', 'Add an animal before logging entries.')
                return
              }
              setShowForm((current) => !current)
            }}
            disabled={!canLogEntries}
          >
            <IconSymbol name={showForm ? 'xmark' : 'plus'} size={22} color="#fff" />
          </TouchableOpacity>
        </ThemedView>

        <View style={[styles.segmentedControl, { borderColor: colors.border }]}> 
          {(['feedings', 'health'] as Segment[]).map((segment) => (
            <TouchableOpacity
              key={segment}
              activeOpacity={0.8}
              style={[
                styles.segmentButton,
                {
                  backgroundColor:
                    activeSegment === segment ? primaryColor : colors.background,
                  borderColor:
                    activeSegment === segment ? primaryColor : colors.border,
                },
              ]}
              onPress={() => setActiveSegment(segment)}
            >
              <ThemedText
                style={{
                  color: activeSegment === segment ? colors.background : colors.text,
                  fontWeight: activeSegment === segment ? '600' : '500',
                }}
              >
                {segment === 'feedings' ? 'Feeding History' : 'Health Log'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {showForm && (
          <ThemedSurface elevation="md" style={styles.form}>
            {activeSegment === 'feedings' ? (
              <>
            <ThemedText type="subtitle" style={[styles.formTitle, { color: colors.text }]}>
              Log New Feeding
            </ThemedText>
            
            <ThemedText style={[styles.label, { color: colors.text }]}>Food Type *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="e.g., Crickets, Mealworms, Vegetables"
              placeholderTextColor={colors.textTertiary}
              value={foodType}
              onChangeText={setFoodType}
            />

            <ThemedText style={[styles.label, { color: colors.text }]}>Quantity *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="e.g., 5, 10g, 2 pieces"
              placeholderTextColor={colors.textTertiary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="default"
            />

            <ThemedText style={[styles.label, { color: colors.text }]}>Notes (Optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.submitButton, { backgroundColor: primaryColor, ...Shadows.sm }]}
                  onPress={addFeeding}
                  disabled={isSubmittingFeeding}
                >
                  <ThemedText style={styles.submitButtonText}>{activeButtonLabel}</ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedText type="subtitle" style={[styles.formTitle, { color: colors.text }]}>
                  Log Health Measurement
                </ThemedText>

                <ThemedText style={[styles.label, { color: colors.text }]}>Measurement Type *</ThemedText>
                <View style={styles.measurementPresets}>
                  {measurementPresets.map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      activeOpacity={0.8}
                      style={[
                        styles.measurementPresetButton,
                        {
                          backgroundColor:
                            measurementType.toLowerCase() === preset.value
                              ? primaryColor
                              : colors.backgroundSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handlePresetSelect(preset)}
                    >
                      <ThemedText
                        style={{
                          color:
                            measurementType.toLowerCase() === preset.value
                              ? colors.background
                              : colors.text,
                          fontWeight:
                            measurementType.toLowerCase() === preset.value ? '600' : '500',
                        }}
                      >
                        {preset.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  placeholder="e.g., Weight"
                  placeholderTextColor={colors.textTertiary}
                  value={measurementType}
                  onChangeText={(text) => setMeasurementType(text)}
                />

                {measurementType.toLowerCase() !== 'note' && (
                  <>
                    <ThemedText style={[styles.label, { color: colors.text }]}>Value *</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: colors.border,
                          color: colors.text,
                          backgroundColor: colors.backgroundSecondary,
                        },
                      ]}
                      placeholder="e.g., 452"
                      placeholderTextColor={colors.textTertiary}
                      value={measurementValue}
                      onChangeText={setMeasurementValue}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}

                <ThemedText style={[styles.label, { color: colors.text }]}>Unit</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  placeholder="e.g., g, cm"
                  placeholderTextColor={colors.textTertiary}
                  value={measurementUnit}
                  onChangeText={setMeasurementUnit}
                />

                <ThemedText style={[styles.label, { color: colors.text }]}>Notes</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  placeholder="Additional context..."
                  placeholderTextColor={colors.textTertiary}
                  value={measurementNotes}
                  onChangeText={setMeasurementNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.submitButton, { backgroundColor: primaryColor, ...Shadows.sm }]}
                  onPress={addMeasurement}
                  disabled={isSubmittingMeasurement}
                >
                  <ThemedText style={styles.submitButtonText}>{activeButtonLabel}</ThemedText>
            </TouchableOpacity>
              </>
            )}
          </ThemedSurface>
        )}

        {activeSegment === 'feedings' ? (
          <ThemedView style={styles.sectionContainer}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.text }]}>
              Feeding History
            </ThemedText>
            {showAnimalPrompt ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol name="tortoise" size={48} color={colors.iconSecondary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  Select or add an animal above to start logging feedings.
                </ThemedText>
              </ThemedView>
            ) : isLoadingActiveSegment ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol
                  name="arrow.triangle.2.circlepath"
                  size={36}
                  color={colors.iconSecondary}
                />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading feedings…
                </ThemedText>
              </ThemedView>
            ) : sortedFeedings.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol name="fork.knife" size={48} color={colors.iconSecondary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No feedings logged yet. Tap the + button to add your first feeding!
                </ThemedText>
              </ThemedView>
            ) : (
              sortedFeedings.map((feeding) => {
                const dateLabel = feeding.date.toLocaleDateString()
                const timeLabel = feeding.date.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <ThemedSurface key={feeding.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardInfo}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={[styles.cardTitle, { color: colors.text }]}
                        >
                      {feeding.foodType}
                    </ThemedText>
                        <ThemedText style={{ color: colors.textSecondary }}>
                      {feeding.quantity}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => deleteFeeding(feeding.id)}
                        style={styles.deleteButton}
                      >
                    <IconSymbol name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
                
                    <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="calendar" size={16} color={primaryColor} />
                    <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                          {dateLabel}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol name="clock" size={16} color={primaryColor} />
                    <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                          {timeLabel}
                    </ThemedText>
                  </View>
                </View>

                {feeding.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.divider }]}>
                        <ThemedText style={[styles.notesText, { color: colors.textSecondary }]}>
                      {feeding.notes}
                    </ThemedText>
                  </View>
                )}
              </ThemedSurface>
                )
              })
            )}
          </ThemedView>
        ) : (
          <ThemedView style={styles.sectionContainer}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.text }]}>
              Health Log
            </ThemedText>
            {showAnimalPrompt ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol name="stethoscope" size={48} color={colors.iconSecondary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  Select or add an animal above to start logging health data.
                </ThemedText>
              </ThemedView>
            ) : isLoadingActiveSegment ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol
                  name="arrow.triangle.2.circlepath"
                  size={36}
                  color={colors.iconSecondary}
                />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading measurements…
                </ThemedText>
              </ThemedView>
            ) : sortedMeasurements.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <IconSymbol name="chart.bar" size={48} color={colors.iconSecondary} />
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No health entries yet. Log a weight, length, or note to begin tracking.
                </ThemedText>
              </ThemedView>
            ) : (
              sortedMeasurements.map((measurement) => {
                const dateLabel = measurement.recordedAt.toLocaleDateString()
                const timeLabel = measurement.recordedAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <ThemedSurface key={measurement.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardInfo}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={[styles.cardTitle, { color: colors.text }]}
                        >
                          {measurement.metricType}
                        </ThemedText>
                        {measurement.value != null && (
                          <ThemedText style={{ color: colors.textSecondary }}>
                            {measurement.value}{' '}
                            {measurement.unit?.trim() ?? ''}
                          </ThemedText>
                        )}
                        {measurement.value == null && measurement.unit && (
                          <ThemedText style={{ color: colors.textSecondary }}>
                            {measurement.unit}
                          </ThemedText>
                        )}
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => deleteMeasurement(measurement.id)}
                        style={styles.deleteButton}
                      >
                        <IconSymbol name="trash" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <IconSymbol name="calendar" size={16} color={primaryColor} />
                        <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                          {dateLabel}
                        </ThemedText>
                      </View>
                      <View style={styles.metaItem}>
                        <IconSymbol name="clock" size={16} color={primaryColor} />
                        <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                          {timeLabel}
                        </ThemedText>
                      </View>
                    </View>

                    {measurement.notes && (
                      <View style={[styles.notesContainer, { borderTopColor: colors.divider }]}>
                        <ThemedText style={[styles.notesText, { color: colors.textSecondary }]}>
                          {measurement.notes}
                        </ThemedText>
                      </View>
                    )}
                  </ThemedSurface>
                )
              })
          )}
        </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginBottom: Spacing.lg,
  },
  formTitle: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  submitButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
  notesContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  measurementPresets: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  measurementPresetButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
})

