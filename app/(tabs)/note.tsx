import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppHeader } from '@/components/AppHeader';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  loadBeehivesData,
  loadBeehiveActivities,
  createBeehiveActivity,
  updateBeehiveActivity,
  deleteBeehiveActivity,
} from '@/services/fastapi-beehive-service';
import { BeehiveData } from '@/types/sensors';
import { AttivitaResponse } from '@/types/api';

export const TIPOLOGIE_ATTIVITA = [
  { value: 'ispezione', label: 'Ispezione', icon: '🔍' },
  { value: 'trattamento', label: 'Trattamento', icon: '💊' },
  { value: 'raccolta_miele', label: 'Raccolta miele', icon: '🍯' },
  { value: 'nutrizione', label: 'Nutrizione', icon: '🥣' },
  { value: 'sostituzione_regina', label: 'Sostituzione regina', icon: '👑' },
  { value: 'controllo_salute', label: 'Controllo salute', icon: '🩺' },
  { value: 'manutenzione', label: 'Manutenzione', icon: '🔧' },
  { value: 'altro', label: 'Altro', icon: '📝' },
] as const;

export function getTipologiaInfo(tipo?: string | null) {
  if (!tipo) return { label: 'Nota manuale', icon: '📝' };
  const found = TIPOLOGIE_ATTIVITA.find(
    (t) => t.value === tipo || t.label.toLowerCase() === tipo.toLowerCase()
  );
  if (found) return found;
  return { label: tipo, icon: '📝' };
}

interface NoteItemWithHive extends AttivitaResponse {
  hiveName?: string;
  hiveId: string;
  tipo_Attivita?: string;
}

export default function NoteScreen() {
  const [beehives, setBeehives] = useState<BeehiveData[]>([]);
  const [notes, setNotes] = useState<NoteItemWithHive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHiveId, setSelectedHiveId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hiveFilterOpen, setHiveFilterOpen] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItemWithHive | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [targetHiveId, setTargetHiveId] = useState<string>('');
  const [noteType, setNoteType] = useState<string>('ispezione');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [hiveDropdownOpen, setHiveDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { height: windowHeight } = useWindowDimensions();
  const modalHeight = Math.round(windowHeight * 0.8);

  useEffect(() => {
    loadAllNotes();
  }, []);

  const loadAllNotes = async () => {
    try {
      setLoading(true);
      const hivesResult = await loadBeehivesData();
      let currentHives: BeehiveData[] = [];

      if (hivesResult.success && hivesResult.data && hivesResult.data.length > 0) {
        currentHives = hivesResult.data;
      } else {
        currentHives = [
          {
            id: '1',
            deviceId: 'NODE001',
            name: 'Arnia Alpha',
            weight: [],
            temperature: [],
            humidity: [],
            currentTemperature: 34.5,
            currentWeight: 42.4,
            currentHumidity: 65,
          },
          {
            id: '2',
            deviceId: 'NODE002',
            name: 'Arnia Beta',
            weight: [],
            temperature: [],
            humidity: [],
            currentTemperature: 35.2,
            currentWeight: 38.7,
            currentHumidity: 61,
          },
        ];
      }
      setBeehives(currentHives);

      const allNotesList: NoteItemWithHive[] = [];

      for (const hive of currentHives) {
        const actResult = await loadBeehiveActivities(hive.id);
        if (actResult.success && actResult.data) {
          actResult.data.forEach((act) => {
            allNotesList.push({
              ...act,
              hiveName: hive.name,
              hiveId: hive.id,
            });
          });
        }
      }



      // Sort by newest timestamp
      allNotesList.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setNotes(allNotesList);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllNotes();
    setRefreshing(false);
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    setEditingNote(null);
    setNoteText('');
    setSelectedTime(now);
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setTargetHiveId(selectedHiveId !== 'all' ? selectedHiveId : beehives[0]?.id || '1');
    setNoteType('ispezione');
    setTypeDropdownOpen(false);
    setHiveDropdownOpen(false);
    setModalError(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (note: NoteItemWithHive) => {
    const d = new Date(note.timestamp);
    const valid = !isNaN(d.getTime()) ? d : new Date();
    setEditingNote(note);
    setNoteText(note.descrizione || '');
    setSelectedTime(valid);
    setCalendarMonth(new Date(valid.getFullYear(), valid.getMonth(), 1));
    setTargetHiveId(note.hiveId);
    const found = TIPOLOGIE_ATTIVITA.find(
      (t) => t.value === note.tipo_attivita || t.value === (note as any).tipo_Attivita
    );
    setNoteType(found ? found.value : 'altro');
    setTypeDropdownOpen(false);
    setHiveDropdownOpen(false);
    setModalError(null);
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      setModalError('Inserisci una descrizione per la nota.');
      return;
    }

    if (!targetHiveId) {
      setModalError("Seleziona un'arnia.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const timestamp = !isNaN(selectedTime.getTime())
        ? selectedTime.toISOString()
        : new Date().toISOString();

      const activityPayload = {
        descrizione: noteText.trim(),
        timestamp: timestamp,
        tipo_attivita: noteType,
        tipo_Attivita: noteType,
      };

      if (editingNote) {
        const result = await updateBeehiveActivity(
          editingNote.hiveId,
          editingNote.id_log,
          activityPayload
        );

        if (result.success) {
          setModalVisible(false);
          await loadAllNotes();
        } else {
          // Local fallback
          setNotes((prev) =>
            prev.map((n) =>
              n.id_log === editingNote.id_log
                ? {
                    ...n,
                    descrizione: noteText.trim(),
                    timestamp: timestamp,
                    tipo_attivita: noteType,
                    tipo_Attivita: noteType,
                  }
                : n
            )
          );
          setModalVisible(false);
        }
      } else {
        const result = await createBeehiveActivity(targetHiveId, activityPayload);

        if (result.success) {
          setModalVisible(false);
          await loadAllNotes();
        } else {
          // Local fallback
          const hive = beehives.find((b) => b.id === targetHiveId);
          const newNote: NoteItemWithHive = {
            id_log: Date.now(),
            id_arnia: parseInt(targetHiveId) || 1,
            id_utente: null,
            tipo_attivita: noteType,
            tipo_Attivita: noteType,
            descrizione: noteText.trim(),
            timestamp: timestamp,
            dati: null,
            hiveName: hive?.name || `Arnia ${targetHiveId}`,
            hiveId: targetHiveId,
          };
          setNotes((prev) => [newNote, ...prev]);
          setModalVisible(false);
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;

    const performDelete = async () => {
      setIsSubmitting(true);
      try {
        await deleteBeehiveActivity(editingNote.hiveId, editingNote.id_log);
        setNotes((prev) => prev.filter((n) => n.id_log !== editingNote.id_log));
        setModalVisible(false);
      } catch {
        setNotes((prev) => prev.filter((n) => n.id_log !== editingNote.id_log));
        setModalVisible(false);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler eliminare questa nota?')) {
        performDelete();
      }
    } else {
      Alert.alert('Elimina Nota', 'Sei sicuro di voler eliminare questa nota?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (selectedHiveId !== 'all' && n.hiveId !== selectedHiveId) return false;
    if (
      searchQuery.trim() &&
      !n.descrizione?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !n.hiveName?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#2C2C2E' : '#E5E7EB';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const selectedTypeInfo = getTipologiaInfo(noteType);

  const changeMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const changeHour = (delta: number) => {
    setSelectedTime((prev) => {
      const nd = new Date(prev);
      nd.setHours(prev.getHours() + delta);
      return nd;
    });
  };

  const changeMinute = (delta: number) => {
    setSelectedTime((prev) => {
      const nd = new Date(prev);
      nd.setMinutes(prev.getMinutes() + delta);
      return nd;
    });
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const formattedDateTime =
    selectedTime.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' • ' +
    selectedTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]} edges={['top']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Note & Attività</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Diario interventi in apiario
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.addNoteBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.addNoteBtnText}>Nuova</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Hive Filter Select */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              {
                borderColor: hiveFilterOpen ? '#2563EB' : borderColor,
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
              },
            ]}
            onPress={() => setHiveFilterOpen((prev) => !prev)}
            activeOpacity={0.7}>
            <View style={styles.dropdownValueRow}>
              <Ionicons name="home-outline" size={16} color="#2563EB" />
              <ThemedText
                style={[styles.dropdownValueText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {selectedHiveId === 'all'
                  ? 'Tutte le arnie'
                  : beehives.find((b) => b.id === selectedHiveId)?.name || 'Tutte le arnie'}
              </ThemedText>
            </View>
            <Ionicons
              name={hiveFilterOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          {hiveFilterOpen && (
            <View
              style={[
                styles.dropdownList,
                {
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderColor: borderColor,
                },
              ]}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedHiveId === 'all' && {
                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                  },
                ]}
                onPress={() => {
                  setSelectedHiveId('all');
                  setHiveFilterOpen(false);
                }}>
                <View style={styles.dropdownItemContent}>
                  <ThemedText style={styles.dropdownItemIcon}>📋</ThemedText>
                  <ThemedText
                    style={[
                      styles.dropdownItemLabel,
                      {
                        color: selectedHiveId === 'all' ? '#2563EB' : isDark ? '#F3F4F6' : '#1F2937',
                      },
                      selectedHiveId === 'all' && { fontWeight: '700' },
                    ]}>
                    Tutte le arnie
                  </ThemedText>
                </View>
                {selectedHiveId === 'all' && <Ionicons name="checkmark" size={18} color="#2563EB" />}
              </TouchableOpacity>

              {beehives.map((b) => {
                const isSelected = selectedHiveId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.dropdownItem,
                      isSelected && {
                        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                      },
                    ]}
                    onPress={() => {
                      setSelectedHiveId(b.id);
                      setHiveFilterOpen(false);
                    }}>
                    <View style={styles.dropdownItemContent}>
                      <ThemedText style={styles.dropdownItemIcon}>🏠</ThemedText>
                      <ThemedText
                        style={[
                          styles.dropdownItemLabel,
                          { color: isSelected ? '#2563EB' : isDark ? '#F3F4F6' : '#1F2937' },
                          isSelected && { fontWeight: '700' },
                        ]}>
                        {b.name}
                      </ThemedText>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
            placeholder="Cerca nelle note..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Notes List */}
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
            <ThemedText style={styles.emptyTitle}>Nessuna nota trovata</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
              Tocca &ldquo;Nuova&rdquo; per registrare il tuo primo intervento.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.notesList}>
            {filteredNotes.map((note) => {
              const d = new Date(note.timestamp);
              const dateStr = d.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = d.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const typeInfo = getTipologiaInfo(note.tipo_attivita || note.tipo_Attivita);

              return (
                <TouchableOpacity
                  key={note.id_log}
                  style={[styles.noteCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => handleOpenEditModal(note)}
                  activeOpacity={0.8}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteTypeTag}>
                      <ThemedText style={styles.noteTypeTagText}>
                        {typeInfo.icon} {typeInfo.label}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.noteDateTime, { color: textSecondary }]}>
                      {dateStr} • {timeStr}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.noteHiveBadge}>
                    📍 {note.hiveName}
                  </ThemedText>

                  <ThemedText style={styles.noteDescription}>
                    {note.descrizione}
                  </ThemedText>

                  <View style={styles.noteFooter}>
                    <ThemedText style={[styles.tapToEdit, { color: '#2563EB' }]}>
                      Tocca per modificare o eliminare ✏️
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Note Edit/Create Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { height: modalHeight, maxHeight: modalHeight }]}>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {editingNote ? 'Modifica Nota' : 'Nuova Nota'}
              </ThemedText>

              {modalError && (
                <View style={styles.errorBanner}>
                  <ThemedText style={styles.errorBannerText}>⚠️ {modalError}</ThemedText>
                </View>
              )}

              {/* Target Hive */}
              <ThemedText style={styles.inputLabel}>
                {editingNote ? 'Arnia (non modificabile)' : 'Seleziona Arnia'}
              </ThemedText>
              {editingNote ? (
                <View style={[styles.hiveFixedBox, { borderColor, marginBottom: 14 }]}>
                  <Ionicons name="home-outline" size={16} color="#4F46E5" />
                  <ThemedText style={styles.hiveFixedText}>
                    {beehives.find((b) => b.id === editingNote.hiveId)?.name ||
                      editingNote.hiveName ||
                      `Arnia ${editingNote.hiveId}`}
                  </ThemedText>
                  <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      {
                        borderColor: hiveDropdownOpen ? '#2563EB' : borderColor,
                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      },
                    ]}
                    onPress={() => setHiveDropdownOpen((prev) => !prev)}
                    activeOpacity={0.7}>
                    <View style={styles.dropdownValueRow}>
                      <Ionicons name="home-outline" size={16} color="#2563EB" />
                      <ThemedText
                        style={[
                          styles.dropdownValueText,
                          { color: isDark ? '#FFFFFF' : '#111827' },
                        ]}>
                        {beehives.find((b) => b.id === targetHiveId)?.name || "Seleziona un'arnia"}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={hiveDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>

                  {hiveDropdownOpen && (
                    <View
                      style={[
                        styles.dropdownList,
                        {
                          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                          borderColor: borderColor,
                        },
                      ]}>
                      {beehives.map((b) => {
                        const isSelected = targetHiveId === b.id;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                              },
                            ]}
                            onPress={() => {
                              setTargetHiveId(b.id);
                              setHiveDropdownOpen(false);
                            }}>
                            <View style={styles.dropdownItemContent}>
                              <ThemedText style={styles.dropdownItemIcon}>🏠</ThemedText>
                              <ThemedText
                                style={[
                                  styles.dropdownItemLabel,
                                  {
                                    color: isSelected ? '#2563EB' : isDark ? '#F3F4F6' : '#1F2937',
                                  },
                                  isSelected && { fontWeight: '700' },
                                ]}>
                                {b.name}
                              </ThemedText>
                            </View>
                            {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Tipologia Dropdown */}
              <ThemedText style={styles.inputLabel}>Tipologia</ThemedText>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    {
                      borderColor: typeDropdownOpen ? '#2563EB' : borderColor,
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    },
                  ]}
                  onPress={() => setTypeDropdownOpen((prev) => !prev)}
                  activeOpacity={0.7}>
                  <View style={styles.dropdownValueRow}>
                    <ThemedText style={styles.dropdownValueIcon}>
                      {selectedTypeInfo.icon}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dropdownValueText,
                        { color: isDark ? '#FFFFFF' : '#111827' },
                      ]}>
                      {selectedTypeInfo.label}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={typeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </TouchableOpacity>

                {typeDropdownOpen && (
                  <View
                    style={[
                      styles.dropdownList,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderColor: borderColor,
                      },
                    ]}>
                    {TIPOLOGIE_ATTIVITA.map((item) => {
                      const isSelected = noteType === item.value;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.dropdownItem,
                            isSelected && {
                              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                            },
                          ]}
                          onPress={() => {
                            setNoteType(item.value);
                            setTypeDropdownOpen(false);
                          }}>
                          <View style={styles.dropdownItemContent}>
                            <ThemedText style={styles.dropdownItemIcon}>{item.icon}</ThemedText>
                            <ThemedText
                              style={[
                                styles.dropdownItemLabel,
                                { color: isSelected ? '#2563EB' : isDark ? '#F3F4F6' : '#1F2937' },
                                isSelected && { fontWeight: '700' },
                              ]}>
                              {item.label}
                            </ThemedText>
                          </View>
                          {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <ThemedText style={styles.inputLabel}>Data</ThemedText>
              <View style={[styles.calendarCard, { borderColor }]}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={() => changeMonth(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="chevron-back" size={18} color="#2563EB" />
                  </TouchableOpacity>
                  <ThemedText style={styles.calendarMonthLabel}>
                    {calendarMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => changeMonth(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="chevron-forward" size={18} color="#2563EB" />
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((w, i) => (
                    <ThemedText key={`wd-${i}`} style={[styles.calendarWeekHeader, { color: textSecondary }]}>
                      {w}
                    </ThemedText>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, i) => {
                    const isSelected = day && isSameDay(day, selectedTime);
                    const isToday = day && isSameDay(day, new Date());
                    return (
                      <View key={i} style={styles.calendarDayCell}>
                        {day ? (
                          <TouchableOpacity
                            style={[
                              styles.calendarDayBtn,
                              isSelected && styles.calendarDayBtnActive,
                            ]}
                            onPress={() => {
                              const nd = new Date(selectedTime);
                              nd.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                              setSelectedTime(nd);
                            }}>
                            <ThemedText
                              style={[
                                styles.calendarDayText,
                                isSelected && styles.calendarDayTextActive,
                                isToday && !isSelected && { color: '#2563EB', fontWeight: '800' },
                              ]}>
                              {day.getDate()}
                            </ThemedText>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              <ThemedText style={[styles.inputLabel, { marginTop: 12 }]}>Ora</ThemedText>
              <View style={styles.timePickerRow}>
                <View style={[styles.timeStepper, { borderColor }]}>
                  <TouchableOpacity
                    onPress={() => changeHour(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.timeStepBtn}>
                    <Ionicons name="chevron-up" size={16} color="#2563EB" />
                  </TouchableOpacity>
                  <ThemedText style={styles.timeValue}>
                    {String(selectedTime.getHours()).padStart(2, '0')}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => changeHour(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.timeStepBtn}>
                    <Ionicons name="chevron-down" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.timeColon}>:</ThemedText>
                <View style={[styles.timeStepper, { borderColor }]}>
                  <TouchableOpacity
                    onPress={() => changeMinute(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.timeStepBtn}>
                    <Ionicons name="chevron-up" size={16} color="#2563EB" />
                  </TouchableOpacity>
                  <ThemedText style={styles.timeValue}>
                    {String(selectedTime.getMinutes()).padStart(2, '0')}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => changeMinute(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.timeStepBtn}>
                    <Ionicons name="chevron-down" size={16} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.dateSummaryBox, { backgroundColor: cardBg, borderColor }]}>
                <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                <ThemedText style={styles.dateSummaryText}>{formattedDateTime}</ThemedText>
              </View>

              <ThemedText style={styles.inputLabel}>Contenuto Nota</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  { color: isDark ? '#FFF' : '#000', borderColor },
                ]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Descrivi l'intervento effettuato o l'osservazione..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                  disabled={isSubmitting}>
                  <ThemedText style={styles.btnText}>Annulla</ThemedText>
                </TouchableOpacity>

                {editingNote && (
                  <TouchableOpacity
                    style={[styles.btn, styles.deleteBtn]}
                    onPress={handleDeleteNote}
                    disabled={isSubmitting}>
                    <ThemedText style={styles.btnText}>Elimina</ThemedText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={handleSaveNote}
                  disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <ThemedText style={styles.btnText}>Salva</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addNoteBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  centerLoading: { padding: 40, alignItems: 'center' },
  notesList: { gap: 12 },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTypeTag: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noteTypeTagText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  noteDateTime: { fontSize: 12 },
  noteHiveBadge: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#4F46E5' },
  noteDescription: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  noteFooter: { borderTopWidth: 0.5, borderTopColor: 'rgba(150,150,150,0.15)', paddingTop: 6 },
  tapToEdit: { fontSize: 11, fontWeight: '500' },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  modalScrollView: {
    width: '100%',
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  modalTitle: { marginBottom: 16, textAlign: 'center', fontWeight: '700' },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorBannerText: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, opacity: 0.8 },
  hiveFixedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  hiveFixedText: { fontSize: 14, fontWeight: '600', flex: 1 },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarWeekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calendarDayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayBtnActive: {
    backgroundColor: '#2563EB',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeStepper: {
    width: 72,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  timeStepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '700',
    opacity: 0.6,
  },
  dateSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 14,
  },
  dateSummaryText: { fontSize: 14, fontWeight: '600' },
  dropdownContainer: {
    marginBottom: 14,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownValueIcon: {
    fontSize: 16,
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemIcon: {
    fontSize: 16,
  },
  dropdownItemLabel: {
    fontSize: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    fontSize: 14,
  },
  modalTextArea: { height: 90, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { backgroundColor: '#8E8E93' },
  saveBtn: { backgroundColor: '#2563EB' },
  deleteBtn: { backgroundColor: '#EF4444' },
});
