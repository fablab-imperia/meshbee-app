import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BeehivesTable } from '@/components/charts/BeehivesTable';
import { ItemSelector } from '@/components/charts/ItemSelector';
import { SensorCard } from '@/components/charts/SensorCard';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export default function ArnieScreen() {
  const [beehives, setBeehives] = useState<BeehiveData[]>([]);
  const [activities, setActivities] = useState<Record<string, AttivitaResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBeehiveId, setSelectedBeehiveId] = useState<string | null>('all');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Activity Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AttivitaResponse | null>(null);
  const [activityText, setActivityText] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await loadBeehivesData();

      if (result.success && result.data && result.data.length > 0) {
        setBeehives(result.data);
        if (!selectedBeehiveId) {
          setSelectedBeehiveId('all');
        }
      } else {
        // Fallback default mock data
        setBeehives([
          {
            id: '1',
            deviceId: 'NODE001',
            name: 'Arnia Alpha',
            weight: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 43.1 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 42.8 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 42.6 },
              { timestamp: new Date(), value: 42.4 },
            ],
            temperature: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 33.8 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 34.1 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 34.4 },
              { timestamp: new Date(), value: 34.5 },
            ],
            humidity: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 68 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 66 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 65 },
              { timestamp: new Date(), value: 65 },
            ],
            currentTemperature: 34.5,
            currentWeight: 42.4,
            currentHumidity: 65,
            lastUpdate: new Date(),
          },
          {
            id: '2',
            deviceId: 'NODE002',
            name: 'Arnia Beta',
            weight: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 41.2 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 40.1 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 39.4 },
              { timestamp: new Date(), value: 38.7 },
            ],
            temperature: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 34.9 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 35.0 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 35.1 },
              { timestamp: new Date(), value: 35.2 },
            ],
            humidity: [
              { timestamp: new Date(Date.now() - 3600000 * 6), value: 63 },
              { timestamp: new Date(Date.now() - 3600000 * 4), value: 62 },
              { timestamp: new Date(Date.now() - 3600000 * 2), value: 61 },
              { timestamp: new Date(), value: 61 },
            ],
            currentTemperature: 35.2,
            currentWeight: 38.7,
            currentHumidity: 61,
            lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
          },
        ]);
      }
    } catch {
      // Fallback handles gracefully
    } finally {
      setLoading(false);
    }
  }, [selectedBeehiveId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadActivitiesForArnia = React.useCallback(async (id: string) => {
    const result = await loadBeehiveActivities(id);
    if (result.success && result.data) {
      setActivities((prev) => ({ ...prev, [id]: result.data! }));
    }
  }, []);

  useEffect(() => {
    if (selectedBeehiveId && selectedBeehiveId !== 'all') {
      loadActivitiesForArnia(selectedBeehiveId);
    } else if (selectedBeehiveId === 'all') {
      beehives.forEach((b) => loadActivitiesForArnia(b.id));
    }
  }, [selectedBeehiveId, beehives, loadActivitiesForArnia]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (selectedBeehiveId && selectedBeehiveId !== 'all') {
      await loadActivitiesForArnia(selectedBeehiveId);
    } else if (selectedBeehiveId === 'all') {
      await Promise.all(beehives.map((b) => loadActivitiesForArnia(b.id)));
    }
    setRefreshing(false);
  };

  const handleOpenAddActivity = () => {
    if (selectedBeehiveId === 'all') {
      Alert.alert('Nota', "Seleziona un'arnia specifica per aggiungere una nota.");
      return;
    }
    setEditingActivity(null);
    setActivityText('');
    setActivityDate(new Date().toISOString().slice(0, 16));
    setModalVisible(true);
  };

  const handleEditActivity = (activity: AttivitaResponse) => {
    setEditingActivity(activity);
    setActivityText(activity.descrizione || '');
    setActivityDate(new Date(activity.timestamp).toISOString().slice(0, 16));
    setModalVisible(true);
  };

  const handleSubmitActivity = async () => {
    setModalError(null);

    if (!activityText.trim()) {
      const msg = 'Inserisci il testo della nota.';
      setModalError(msg);
      if (Platform.OS === 'web') alert(msg);
      return;
    }

    if (!selectedBeehiveId || selectedBeehiveId === 'all') return;

    setIsSubmitting(true);
    try {
      const dateParsed = new Date(activityDate.replace(' ', 'T'));
      if (isNaN(dateParsed.getTime())) {
        throw new Error('Formato data non valido. Usa YYYY-MM-DD HH:MM');
      }

      const timestamp = dateParsed.toISOString();
      let result;

      if (editingActivity) {
        result = await updateBeehiveActivity(selectedBeehiveId, editingActivity.id_log, {
          descrizione: activityText,
          timestamp: timestamp,
          tipo_attivita: 'Nota manuale',
        });
      } else {
        result = await createBeehiveActivity(selectedBeehiveId, {
          descrizione: activityText,
          timestamp: timestamp,
          tipo_attivita: 'Nota manuale',
        });
      }

      if (result.success) {
        setModalVisible(false);
        setActivityText('');
        setEditingActivity(null);
        await loadActivitiesForArnia(selectedBeehiveId);
        if (Platform.OS === 'web') alert('Nota salvata!');
      } else {
        const errorMsg = result.error || 'Errore durante il salvataggio.';
        setModalError(errorMsg);
        if (Platform.OS === 'web') alert('Errore: ' + errorMsg);
        else Alert.alert('Errore', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Errore imprevisto.';
      setModalError(errorMsg);
      if (Platform.OS === 'web') alert('Errore: ' + errorMsg);
      else Alert.alert('Errore', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!editingActivity || !selectedBeehiveId || selectedBeehiveId === 'all') return;

    const deleteAction = async () => {
      setIsSubmitting(true);
      setModalError(null);
      const result = await deleteBeehiveActivity(selectedBeehiveId, editingActivity.id_log);
      if (result.success) {
        setModalVisible(false);
        loadActivitiesForArnia(selectedBeehiveId);
      } else {
        const errorMsg = result.error || "Errore durante l'eliminazione.";
        setModalError(errorMsg);
        if (Platform.OS === 'web') alert('Errore: ' + errorMsg);
        else Alert.alert('Errore', errorMsg);
      }
      setIsSubmitting(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler eliminare questa nota?')) {
        deleteAction();
      }
    } else {
      Alert.alert('Elimina Nota', 'Sei sicuro di voler eliminare questa nota?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: deleteAction },
      ]);
    }
  };

  const selectorItems = beehives.map((b) => ({ id: b.id, name: b.name }));
  const currentArniaId = selectedBeehiveId === 'all' ? null : selectedBeehiveId;
  const currentBeehive = beehives.find((b) => b.id === currentArniaId);
  const currentActivities = currentArniaId ? activities[currentArniaId] || [] : [];

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2563EB" />
        <ThemedText style={styles.loadingText}>Caricamento arnie...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]} edges={['top']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}>
        {/* Title */}
        <View style={styles.headerSection}>
          <ThemedText style={styles.title}>Dettaglio Arnie</ThemedText>
          <ThemedText style={styles.subtitle}>
            {beehives.length} {beehives.length === 1 ? 'arnia monitorata' : 'arnie monitorate'}
          </ThemedText>
        </View>

        {/* Item Selector */}
        <ItemSelector
          items={selectorItems}
          selectedId={selectedBeehiveId}
          onSelect={setSelectedBeehiveId}
          showAllOption={true}
          allLabel="Tutte"
        />

        {selectedBeehiveId === 'all' ? (
          <ThemedView style={styles.dataSection}>
            <BeehivesTable beehives={beehives} />
          </ThemedView>
        ) : currentBeehive ? (
          <ThemedView style={styles.dataSection}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle" style={styles.sectionName}>
                {currentBeehive.name}
              </ThemedText>
              {currentBeehive.lastUpdate && (
                <ThemedText style={styles.lastUpdateText}>
                  Ultimo dato:{' '}
                  {new Date(currentBeehive.lastUpdate).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  {new Date(currentBeehive.lastUpdate).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              )}
            </View>

            <TouchableOpacity style={styles.addNoteButton} onPress={handleOpenAddActivity}>
              <ThemedText style={styles.addNoteButtonText}>+ Aggiungi Nota Manuale</ThemedText>
            </TouchableOpacity>

            <View style={styles.cardRow}>
              <View style={styles.cardThird}>
                <SensorCard
                  title="Temperatura"
                  value={currentBeehive.currentTemperature}
                  unit="°C"
                  icon="🌡️"
                />
              </View>
              <View style={styles.cardThird}>
                <SensorCard
                  title="Peso"
                  value={currentBeehive.currentWeight}
                  unit="kg"
                  icon="⚖️"
                />
              </View>
              <View style={styles.cardThird}>
                <SensorCard
                  title="Umidità"
                  value={currentBeehive.currentHumidity}
                  unit="%"
                  icon="💧"
                />
              </View>
            </View>

            <TimeSeriesChart
              title="Andamento Temperatura"
              data={currentBeehive.temperature}
              unit="°C"
              color="#FF3B30"
              activities={currentActivities}
              onActivityPress={handleEditActivity}
            />
            <TimeSeriesChart
              title="Andamento Peso"
              data={currentBeehive.weight}
              unit="kg"
              color="#FF9500"
              activities={currentActivities}
              onActivityPress={handleEditActivity}
            />
            <TimeSeriesChart
              title="Andamento Umidità"
              data={currentBeehive.humidity}
              unit="%"
              color="#007AFF"
              activities={currentActivities}
              onActivityPress={handleEditActivity}
            />
          </ThemedView>
        ) : null}
      </ScrollView>

      {/* Note Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingActivity ? 'Modifica Nota' : 'Nuova Nota'}
            </ThemedText>

            {modalError && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.modalErrorText}>⚠️ {modalError}</ThemedText>
              </View>
            )}

            <ThemedText style={styles.inputLabel}>Data e Ora (YYYY-MM-DD HH:MM)</ThemedText>
            <TextInput
              style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
              value={activityDate}
              onChangeText={setActivityDate}
              placeholder="2024-05-06 14:30"
              placeholderTextColor="#999"
            />

            <ThemedText style={styles.inputLabel}>Nota / Attività</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { color: isDark ? '#FFF' : '#000' }]}
              value={activityText}
              onChangeText={setActivityText}
              placeholder="Esempio: Aggiunto melario"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}>
                <ThemedText style={styles.modalButtonText}>Annulla</ThemedText>
              </TouchableOpacity>

              {editingActivity && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteActivity}
                  disabled={isSubmitting}>
                  <ThemedText style={styles.modalButtonText}>Elimina</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitActivity}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={styles.modalButtonText}>Salva</ThemedText>
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    opacity: 0.7,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  dataSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionName: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  lastUpdateText: {
    fontSize: 12,
    opacity: 0.5,
  },
  addNoteButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cardThird: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  modalErrorText: {
    color: '#FF3B30',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});
