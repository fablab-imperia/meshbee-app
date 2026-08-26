import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/AppHeader';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AlarmItem {
  id: string;
  arniaId: string;
  arniaName: string;
  nodeId: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
  resolved: boolean;
}

export default function AllarmiScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [refreshing, setRefreshing] = useState(false);

  const [alarms, setAlarms] = useState<AlarmItem[]>([
    {
      id: 'alm-1',
      arniaId: '2',
      arniaName: 'Arnia Beta',
      nodeId: 'NODE002',
      type: 'warning',
      title: 'Attenzione: Peso in calo',
      description: 'Rilevata riduzione di peso di 3.7 kg nelle ultime 24 ore.',
      recommendation: 'Verificare possibile sciamatura o necessità di nutrizione.',
      timestamp: 'Oggi, 13:55',
      resolved: false,
    },
    {
      id: 'alm-2',
      arniaId: '1',
      arniaName: 'Arnia Alpha',
      nodeId: 'NODE001',
      type: 'info',
      title: 'Parametri nella norma',
      description: 'Temperatura e umidità stabili (34.5°C, 65%).',
      recommendation: 'Nessun intervento richiesto.',
      timestamp: 'Oggi, 14:00',
      resolved: true,
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleToggleResolve = (id: string) => {
    setAlarms((prev) =>
      prev.map((alm) => (alm.id === id ? { ...alm, resolved: !alm.resolved } : alm))
    );
  };

  const filteredAlarms = alarms.filter((alm) => {
    if (filter === 'active') return !alm.resolved;
    if (filter === 'resolved') return alm.resolved;
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
        {/* Title */}
        <View style={styles.headerSection}>
          <ThemedText style={styles.title}>Allarmi & Avvisi</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Monitoraggio soglie e anomalie
          </ThemedText>
        </View>

        {/* Status Summary Banner */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#231D12' : '#FEF3C7', borderColor: isDark ? '#78350F' : '#FDE68A' }]}>
          <Ionicons name="warning-outline" size={24} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={[styles.summaryTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
              1 Attenzione Rilevata
            </ThemedText>
            <ThemedText style={[styles.summaryDesc, { color: isDark ? '#FDE68A' : '#B45309' }]}>
              Verifica i dati del sensore di peso su Arnia Beta.
            </ThemedText>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
            onPress={() => setFilter('active')}>
            <ThemedText
              style={[styles.filterChipText, filter === 'active' && styles.filterChipTextActive]}>
              Attivi ({alarms.filter((a) => !a.resolved).length})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}>
            <ThemedText
              style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              Tutti ({alarms.length})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'resolved' && styles.filterChipActive]}
            onPress={() => setFilter('resolved')}>
            <ThemedText
              style={[styles.filterChipText, filter === 'resolved' && styles.filterChipTextActive]}>
              Risolti ({alarms.filter((a) => a.resolved).length})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Alarms List */}
        <View style={styles.alarmsList}>
          {filteredAlarms.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#16A34A" />
              <ThemedText style={styles.emptyTitle}>Nessun allarme attivo</ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
                Tutti i parametri delle tue arnie rientrano nelle soglie di sicurezza.
              </ThemedText>
            </View>
          ) : (
            filteredAlarms.map((alm) => {
              const isWarning = alm.type === 'warning';
              const isCritical = alm.type === 'critical';
              const badgeBg = isCritical
                ? '#FEE2E2'
                : isWarning
                ? '#FEF3C7'
                : '#DCFCE7';
              const badgeText = isCritical
                ? '#DC2626'
                : isWarning
                ? '#D97706'
                : '#16A34A';

              return (
                <View
                  key={alm.id}
                  style={[styles.alarmCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.alarmHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                      <ThemedText style={[styles.typeBadgeText, { color: badgeText }]}>
                        {isCritical ? 'Critico' : isWarning ? 'Attenzione' : 'Info'}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.timestampText, { color: textSecondary }]}>
                      {alm.timestamp}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.alarmTitle}>{alm.title}</ThemedText>
                  <ThemedText style={[styles.alarmNodeText, { color: '#4F46E5' }]}>
                    {alm.arniaName} • {alm.nodeId}
                  </ThemedText>

                  <ThemedText style={styles.alarmDescription}>{alm.description}</ThemedText>

                  <View style={[styles.recommendationBox, { backgroundColor: isDark ? '#26262A' : '#F8FAFC' }]}>
                    <ThemedText style={styles.recTitle}>Consiglio:</ThemedText>
                    <ThemedText style={[styles.recText, { color: textSecondary }]}>
                      {alm.recommendation}
                    </ThemedText>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.resolveButton,
                        alm.resolved && styles.resolveButtonActive,
                      ]}
                      onPress={() => handleToggleResolve(alm.id)}>
                      <Ionicons
                        name={alm.resolved ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={alm.resolved ? '#16A34A' : '#6B7280'}
                      />
                      <ThemedText
                        style={[
                          styles.resolveText,
                          alm.resolved && { color: '#16A34A', fontWeight: '700' },
                        ]}>
                        {alm.resolved ? 'Segnato come risolto' : 'Segna come risolto'}
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewHiveButton}
                      onPress={() => router.push('/(tabs)/arnie' as any)}>
                      <ThemedText style={styles.viewHiveText}>Vedi arnia</ThemedText>
                      <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  headerSection: { paddingTop: 8, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700' },
  summaryDesc: { fontSize: 13, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  filterChipActive: { backgroundColor: '#2563EB' },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },
  alarmsList: { gap: 14 },
  alarmCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  timestampText: { fontSize: 12 },
  alarmTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  alarmNodeText: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  alarmDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  recommendationBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  recTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  recText: { fontSize: 13, lineHeight: 18 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
    paddingTop: 10,
  },
  resolveButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolveButtonActive: {},
  resolveText: { fontSize: 13, color: '#6B7280' },
  viewHiveButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewHiveText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});
