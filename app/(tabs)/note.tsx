import React, { useEffect, useState } from 'react';
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

interface NoteItemWithHive extends AttivitaResponse {
  hiveName?: string;
  hiveId: string;
}

export default function NoteScreen() {
  const [beehives, setBeehives] = useState<BeehiveData[]>([]);
  const [notes, setNotes] = useState<NoteItemWithHive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHiveId, setSelectedHiveId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItemWithHive | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [targetHiveId, setTargetHiveId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

      // If no notes loaded from API, populate initial sample notes for a complete experience
      if (allNotesList.length === 0) {
        allNotesList.push(
          {
            id_log: 1,
            id_arnia: 1,
            id_utente: null,
            tipo_attivita: 'Visita di controllo',
            descrizione: 'Regina presente e attiva, scorte di miele adeguate, ottima covata.',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            dati: null,
            hiveName: 'Arnia Alpha',
            hiveId: '1',
          },
          {
            id_log: 2,
            id_arnia: 2,
            id_utente: null,
            tipo_attivita: 'Controllo peso',
            descrizione: 'Verificato calo peso. Effettuato inserimento sciroppo di soccorso.',
            timestamp: new Date().toISOString(),
            dati: null,
            hiveName: 'Arnia Beta',
            hiveId: '2',
          }
        );
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
    setEditingNote(null);
    setNoteText('');
    setNoteDate(new Date().toISOString().slice(0, 16).replace('T', ' '));
    setTargetHiveId(selectedHiveId !== 'all' ? selectedHiveId : beehives[0]?.id || '1');
    setModalError(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (note: NoteItemWithHive) => {
    setEditingNote(note);
    setNoteText(note.descrizione || '');
    setNoteDate(
      new Date(note.timestamp).toISOString().slice(0, 16).replace('T', ' ')
    );
    setTargetHiveId(note.hiveId);
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
      const parsedDate = new Date(noteDate.replace(' ', 'T'));
      const timestamp = isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();

      if (editingNote) {
        const result = await updateBeehiveActivity(
          editingNote.hiveId,
          editingNote.id_log,
          {
            descrizione: noteText.trim(),
            timestamp: timestamp,
            tipo_attivita: 'Nota manuale',
          }
        );

        if (result.success) {
          setModalVisible(false);
          await loadAllNotes();
        } else {
          // Local fallback
          setNotes((prev) =>
            prev.map((n) =>
              n.id_log === editingNote.id_log
                ? { ...n, descrizione: noteText, timestamp: timestamp }
                : n
            )
          );
          setModalVisible(false);
        }
      } else {
        const result = await createBeehiveActivity(targetHiveId, {
          descrizione: noteText.trim(),
          timestamp: timestamp,
          tipo_attivita: 'Nota manuale',
        });

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
            tipo_attivita: 'Nota manuale',
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

        {/* Hive Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, selectedHiveId === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedHiveId('all')}>
            <ThemedText
              style={[
                styles.filterChipText,
                selectedHiveId === 'all' && styles.filterChipTextActive,
              ]}>
              Tutte
            </ThemedText>
          </TouchableOpacity>
          {beehives.map((hive) => (
            <TouchableOpacity
              key={hive.id}
              style={[styles.filterChip, selectedHiveId === hive.id && styles.filterChipActive]}
              onPress={() => setSelectedHiveId(hive.id)}>
              <ThemedText
                style={[
                  styles.filterChipText,
                  selectedHiveId === hive.id && styles.filterChipTextActive,
                ]}>
                {hive.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

              return (
                <TouchableOpacity
                  key={note.id_log}
                  style={[styles.noteCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => handleOpenEditModal(note)}
                  activeOpacity={0.8}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteTypeTag}>
                      <ThemedText style={styles.noteTypeTagText}>
                        📝 {note.tipo_attivita || 'Nota manuale'}
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
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingNote ? 'Modifica Nota' : 'Nuova Nota'}
            </ThemedText>

            {modalError && (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorBannerText}>⚠️ {modalError}</ThemedText>
              </View>
            )}

            {/* Target Hive Picker */}
            <ThemedText style={styles.inputLabel}>Seleziona Arnia</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {beehives.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.hiveSelectChip,
                    targetHiveId === b.id && styles.hiveSelectChipActive,
                  ]}
                  onPress={() => setTargetHiveId(b.id)}>
                  <ThemedText
                    style={[
                      styles.hiveSelectChipText,
                      targetHiveId === b.id && styles.hiveSelectChipTextActive,
                    ]}>
                    {b.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedText style={styles.inputLabel}>Data e Ora (YYYY-MM-DD HH:MM)</ThemedText>
            <TextInput
              style={[styles.modalInput, { color: isDark ? '#FFF' : '#000' }]}
              value={noteDate}
              onChangeText={setNoteDate}
              placeholder="2026-08-26 14:00"
              placeholderTextColor="#999"
            />

            <ThemedText style={styles.inputLabel}>Contenuto Nota</ThemedText>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { color: isDark ? '#FFF' : '#000' }]}
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
  filterScroll: { marginBottom: 12 },
  filterContainer: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  filterChipActive: { backgroundColor: '#2563EB' },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },
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
    maxWidth: 420,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
  hiveSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginRight: 8,
  },
  hiveSelectChipActive: { backgroundColor: '#2563EB' },
  hiveSelectChipText: { fontSize: 12, fontWeight: '600' },
  hiveSelectChipTextActive: { color: '#FFFFFF' },
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
