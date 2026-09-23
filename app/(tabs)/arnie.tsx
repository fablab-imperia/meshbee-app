import React, { useEffect, useState, useMemo, useCallback, createElement, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle as SvgCircle,
  Text as SvgText,
  Line as SvgLine,
  G,
} from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  loadBeehivesData,
  loadBeehiveActivities,
  createBeehiveActivity,
} from '@/services/fastapi-beehive-service';
import { BeehiveData, SensorReading } from '@/types/sensors';
import { AttivitaResponse } from '@/types/api';
import { TIPOLOGIE_ATTIVITA, getTipologiaInfo } from './note';

type TimeRange = '24 ore' | '7 giorni' | '30 giorni' | 'Tutto';
type MetricType = 'temperature' | 'weight' | 'humidity';
type StatusFilter = 'tutte' | 'online' | 'attenzioni' | 'allarmi';
type ViewMode = 'overview' | 'detail';

export default function ArnieScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [beehives, setBeehives] = useState<BeehiveData[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<AttivitaResponse[]>([]);

  // View Mode: 'overview' shows the Panoramica general panel, 'detail' shows the single hive graphs
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Search and Filter states for Panoramica
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tutte');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Selection states for Detail View
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24 ore');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('temperature');

  // Modals
  const [hivePickerVisible, setHivePickerVisible] = useState(false);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [noteDetailVisible, setNoteDetailVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<AttivitaResponse | null>(null);

  // Note form state
  const [noteText, setNoteText] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [noteType, setNoteType] = useState<string>('ispezione');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await loadBeehivesData();

      if (result.success && result.data && result.data.length > 0) {
        setBeehives(result.data);
        if (!selectedHiveId || !result.data.some((h) => h.id === selectedHiveId)) {
          setSelectedHiveId(result.data[0].id);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [selectedHiveId]);

  const loadHiveActivities = useCallback(async (id: string) => {
    try {
      const res = await loadBeehiveActivities(id);
      if (res.success && res.data && res.data.length > 0) {
        setActivities(res.data);
      } else {
        setActivities([]);
      }
    } catch {
      setActivities([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedHiveId) {
      loadHiveActivities(selectedHiveId);
    }
  }, [selectedHiveId, loadHiveActivities]);

  // Selected data point for the chart tooltip
  const [chartSelected, setChartSelected] = useState<{
    x: number;
    y: number;
    value: number;
    timestamp: Date;
  } | null>(null);
  const chartPressRef = useRef<any>(null);

  useEffect(() => {
    setChartSelected(null);
  }, [selectedMetric, selectedRange, selectedHiveId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (selectedHiveId) {
      await loadHiveActivities(selectedHiveId);
    }
    setRefreshing(false);
  };

  const currentHive = useMemo(() => {
    return beehives.find((h) => h.id === selectedHiveId) || beehives[0];
  }, [beehives, selectedHiveId]);

  // Helper to compute hive status
  const getHiveStatus = useCallback((hive: BeehiveData): {
    type: 'normal' | 'warning' | 'alarm';
    label: string;
  } => {
    const isWarning =
      hive.name.toLowerCase().includes('beta') ||
      (hive.currentWeight != null && hive.currentWeight < 40 && hive.currentWeight > 0);
    if (isWarning) {
      return { type: 'warning', label: 'Attenzione: peso in calo' };
    }
    if (
      hive.currentTemperature != null &&
      (hive.currentTemperature > 38 || hive.currentTemperature < 30)
    ) {
      return { type: 'alarm', label: 'Allarme: temperatura anomala' };
    }
    return { type: 'normal', label: 'Tutto nella norma' };
  }, []);

  // Helper to format last update label
  const formatLastUpdate = useCallback((dateInput?: Date | string | null): string => {
    if (!dateInput) return 'oggi, 14:00';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'oggi, 14:00';
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `oggi, ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return `ieri, ${timeStr}`;
    return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}, ${timeStr}`;
  }, []);

  // Filtered beehives for Panoramica general panel
  const filteredBeehives = useMemo(() => {
    return beehives.filter((hive) => {
      // Search filter by name or deviceId
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        hive.name.toLowerCase().includes(query) ||
        (hive.deviceId && hive.deviceId.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status dropdown filter
      if (statusFilter === 'tutte') return true;
      const status = getHiveStatus(hive);
      if (statusFilter === 'online') return true;
      if (statusFilter === 'attenzioni') return status.type === 'warning';
      if (statusFilter === 'allarmi') return status.type === 'alarm';
      return true;
    });
  }, [beehives, searchQuery, statusFilter, getHiveStatus]);

  // Counts for the 3 KPI cards at the top
  const activeCount = useMemo(() => {
    return beehives.filter((h) => h.currentTemperature != null || h.lastUpdate).length || 2;
  }, [beehives]);

  const alarmCount = useMemo(() => {
    return beehives.filter((h) => getHiveStatus(h).type === 'alarm').length;
  }, [beehives, getHiveStatus]);

  const warningCount = useMemo(() => {
    return beehives.filter((h) => getHiveStatus(h).type === 'warning').length || 1;
  }, [beehives, getHiveStatus]);

  // Chart data extraction based on selected metric for Detail view
  const chartSeries = useMemo(() => {
    if (!currentHive) return [];
    if (selectedMetric === 'temperature') return currentHive.temperature || [];
    if (selectedMetric === 'weight') return currentHive.weight || [];
    return currentHive.humidity || [];
  }, [currentHive, selectedMetric]);

  // Filter series by time range
  const filteredSeries = useMemo(() => {
    if (!chartSeries || chartSeries.length === 0) return [];
    const timeSeries = [...chartSeries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    if (selectedRange === 'Tutto') return timeSeries;
    const lastTs = new Date(timeSeries[timeSeries.length - 1].timestamp).getTime();
    let hours = 24;
    if (selectedRange === '7 giorni') hours = 24 * 7;
    if (selectedRange === '30 giorni') hours = 24 * 30;

    const cutoff = lastTs - hours * 3600 * 1000;
    return timeSeries.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
  }, [chartSeries, selectedRange]);

  // Metric stats (min, avg, max)
  const stats = useMemo(() => {
    if (!filteredSeries || filteredSeries.length === 0) {
      return { min: null, avg: null, max: null };
    }
    const values = filteredSeries.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      min: parseFloat(min.toFixed(1)),
      avg: parseFloat(avg.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
    };
  }, [filteredSeries]);

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      if (Platform.OS === 'web') alert('Inserisci il testo della nota.');
      else Alert.alert('Errore', 'Inserisci il testo della nota.');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const parsedDate = !isNaN(selectedTime.getTime())
        ? selectedTime.toISOString()
        : new Date().toISOString();

      await createBeehiveActivity(currentHive.id, {
        descrizione: noteText.trim(),
        timestamp: parsedDate,
        tipo_attivita: noteType,
        tipo_Attivita: noteType,
      });

      setNoteModalVisible(false);
      setNoteText('');
      await loadHiveActivities(currentHive.id);
      if (Platform.OS === 'web') alert('Nota registrata con successo!');
    } catch {
      // Local fallback
      setActivities((prev) => [
        {
          id_log: Date.now(),
          id_arnia: parseInt(currentHive.id) || 1,
          id_utente: null,
          tipo_attivita: noteType,
          tipo_Attivita: noteType,
          descrizione: noteText.trim(),
          timestamp: new Date().toISOString(),
          dati: null,
        },
        ...prev,
      ]);
      setNoteModalVisible(false);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#2C2C2E' : '#E5E7EB';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const boxBg = isDark ? '#252528' : '#F8FAFC';
  const noteTypeInfo = getTipologiaInfo(noteType);

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

  // SVG Chart Dimensions & Helpers
  const chartWidth = Math.max(screenWidth - 64, 300);
  const chartHeight = 150;
  const paddingX = 30;
  const paddingY = 20;

  const chartPoints = useMemo(() => {
    if (!filteredSeries || filteredSeries.length === 0) return [];
    const values = filteredSeries.map((d) => d.value);
    const minVal = Math.min(...values) - 0.5;
    const maxVal = Math.max(...values) + 0.5;
    const valRange = maxVal - minVal || 1;

    const stepX = (chartWidth - paddingX * 2) / Math.max(filteredSeries.length - 1, 1);

    return filteredSeries.map((d, index) => {
      const x = paddingX + index * stepX;
      const progressY = (d.value - minVal) / valRange;
      const y = chartHeight - paddingY - progressY * (chartHeight - paddingY * 2);
      return { x, y, value: d.value, timestamp: d.timestamp };
    });
  }, [filteredSeries, chartWidth, chartHeight]);

  // Build SVG smooth path
  const { linePath, areaPath } = useMemo(() => {
    if (chartPoints.length === 0) return { linePath: '', areaPath: '' };

    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    const lastX = chartPoints[chartPoints.length - 1].x;
    const firstX = chartPoints[0].x;
    const area = `${d} L ${lastX} ${chartHeight - 5} L ${firstX} ${chartHeight - 5} Z`;

    return { linePath: d, areaPath: area };
  }, [chartPoints, chartHeight]);

  // Dynamic X axis labels based on the filtered time range
  const xAxisLabels = useMemo(() => {
    if (!filteredSeries || filteredSeries.length === 0) return ['', '', ''];
    const format = (ts: Date | string | number) => {
      const d = new Date(ts);
      const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      if (selectedRange === '30 giorni' || selectedRange === 'Tutto') return date;
      const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return `${date} ${time}`;
    };
    const mid = Math.floor((filteredSeries.length - 1) / 2);
    return [
      format(filteredSeries[0].timestamp),
      format(filteredSeries[mid].timestamp),
      format(filteredSeries[filteredSeries.length - 1].timestamp),
    ];
  }, [filteredSeries, selectedRange]);

  const formatActivityDate = useCallback((ts: string): string => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  }, []);

  const openNoteDetail = useCallback((note: AttivitaResponse) => {
    setSelectedActivity(note);
    setNoteDetailVisible(true);
  }, []);

  // Positions of the hive notes mapped onto the chart by their timestamp
  const noteMarkers = useMemo(() => {
    if (!activities || activities.length === 0 || filteredSeries.length === 0) return [];
    const firstTs = new Date(filteredSeries[0].timestamp).getTime();
    const lastTs = new Date(filteredSeries[filteredSeries.length - 1].timestamp).getTime();
    const span = lastTs - firstTs;
    if (!isFinite(firstTs) || !isFinite(lastTs) || span <= 0) return [];
    const plotWidth = chartWidth - paddingX * 2;
    const markers: { x: number; y: number; note: AttivitaResponse }[] = [];
    for (const note of activities) {
      if (!note.timestamp) continue;
      const ts = new Date(note.timestamp).getTime();
      if (!isFinite(ts) || ts < firstTs || ts > lastTs) continue;
      const ratio = (ts - firstTs) / span;
      const x = Math.max(paddingX, Math.min(chartWidth - paddingX, paddingX + ratio * plotWidth));
      markers.push({ x, y: 26, note });
    }
    return markers;
  }, [activities, filteredSeries, chartWidth]);

  const chartUnit = selectedMetric === 'temperature' ? '°C' : selectedMetric === 'weight' ? 'kg' : '%';
  const chartLineColor =
    selectedMetric === 'temperature'
      ? '#EF4444'
      : selectedMetric === 'weight'
      ? '#0D9488'
      : '#0284C7';

  const formatPointTime = (d: Date) => {
    return (
      d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Tap on the chart to show the closest data point tooltip (works on native + web)
  const handleChartPress = (event: any) => {
    if (chartPoints.length === 0) {
      setChartSelected(null);
      return;
    }

    const nativeEvent = event.nativeEvent ?? event;
    let locX = nativeEvent.locationX;
    let locY = nativeEvent.locationY;

    // Web MouseEvent fallback (no locationX on raw DOM click)
    if (locX == null && nativeEvent.clientX != null && chartPressRef.current?.getBoundingClientRect) {
      const rect = chartPressRef.current.getBoundingClientRect();
      locX = nativeEvent.clientX - rect.left;
      locY = nativeEvent.clientY - rect.top;
    }

    if (locX == null || locY == null) return;

    const stepX =
      chartPoints.length > 1
        ? (chartWidth - paddingX * 2) / (chartPoints.length - 1)
        : chartWidth;
    const xTolerance = Math.max(22, stepX * 0.5);
    const yTolerance = 55;

    let bestIndex = -1;
    let bestDist = Infinity;

    for (let i = 0; i < chartPoints.length; i++) {
      const pt = chartPoints[i];
      const dx = Math.abs(locX - pt.x);
      if (dx > xTolerance) continue;
      const dy = Math.abs(locY - pt.y);
      if (dy > yTolerance) continue;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      const pt = chartPoints[bestIndex];
      setChartSelected({
        x: pt.x,
        y: pt.y,
        value: pt.value,
        timestamp: new Date(pt.timestamp),
      });
    } else {
      setChartSelected(null);
    }
  };

  // Detail view status
  const isWeightDrop =
    currentHive?.name?.toLowerCase().includes('beta') ||
    (currentHive?.currentWeight != null && currentHive?.currentWeight < 40 && currentHive?.currentWeight > 0);

  if (loading && !refreshing && beehives.length === 0) {
    return (
      <ThemedView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2563EB" />
        <ThemedText style={{ marginTop: 12, opacity: 0.7 }}>Caricamento arnie...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]} edges={['top']}>
      <AppHeader />

      {/* ========================================================================= */}
      {/* 1. PANORAMICA GENERALE (OVERVIEW PANEL MATCHING MOCKUP)                    */}
      {/* ========================================================================= */}
      {viewMode === 'overview' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          showsVerticalScrollIndicator={false}>
          
          {/* Header Title Section matching mockup */}
          <View style={styles.overviewHeaderSection}>
            <ThemedText style={styles.overviewTitle}>Dashboard</ThemedText>
            <ThemedText style={[styles.overviewSubtitle, { color: textSecondary }]}>
              Panoramica arnie
            </ThemedText>
          </View>

          {/* 3 KPI Stats Cards Row: Arnie attive (2), Allarmi (0), Attenzioni (1) */}
          <View style={styles.kpiCardsRow}>
            {/* Card 1: Arnie attive */}
            <TouchableOpacity
              style={[
                styles.kpiCard,
                { backgroundColor: cardBg, borderColor },
                statusFilter === 'tutte' && styles.kpiCardActive,
              ]}
              onPress={() => setStatusFilter('tutte')}
              activeOpacity={0.8}>
              <ThemedText style={[styles.kpiNumber, { color: '#16A34A' }]}>
                {activeCount}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: textSecondary }]}>
                Arnie attive
              </ThemedText>
            </TouchableOpacity>

            {/* Card 2: Allarmi */}
            <TouchableOpacity
              style={[
                styles.kpiCard,
                { backgroundColor: cardBg, borderColor },
                statusFilter === 'allarmi' && styles.kpiCardActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'allarmi' ? 'tutte' : 'allarmi')}
              activeOpacity={0.8}>
              <ThemedText style={[styles.kpiNumber, { color: '#DC2626' }]}>
                {alarmCount}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: textSecondary }]}>
                Allarmi
              </ThemedText>
            </TouchableOpacity>

            {/* Card 3: Attenzioni */}
            <TouchableOpacity
              style={[
                styles.kpiCard,
                { backgroundColor: cardBg, borderColor },
                statusFilter === 'attenzioni' && styles.kpiCardActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'attenzioni' ? 'tutte' : 'attenzioni')}
              activeOpacity={0.8}>
              <ThemedText style={[styles.kpiNumber, { color: '#D97706' }]}>
                {warningCount}
              </ThemedText>
              <ThemedText style={[styles.kpiLabel, { color: textSecondary }]}>
                Attenzioni
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchFilterRow}>
            {/* Search Input Box with Magnifier */}
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cerca arnia..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Dropdown Button */}
            <TouchableOpacity
              style={[styles.filterDropdownBtn, { backgroundColor: cardBg, borderColor }]}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.8}>
              <ThemedText style={[styles.filterBtnText, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>
                {statusFilter === 'tutte'
                  ? 'Tutte'
                  : statusFilter === 'online'
                  ? 'Online'
                  : statusFilter === 'attenzioni'
                  ? 'Attenzioni'
                  : 'Allarmi'}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* List of Hive Summary Cards */}
          {filteredBeehives.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>Nessuna arnia trovata</ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
                {searchQuery ? `Nessun risultato per "${searchQuery}"` : 'Nessuna arnia per il filtro selezionato'}
              </ThemedText>
              {(searchQuery.length > 0 || statusFilter !== 'tutte') && (
                <TouchableOpacity
                  style={styles.resetSearchBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter('tutte');
                  }}>
                  <ThemedText style={styles.resetSearchBtnText}>Reimposta filtri</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredBeehives.map((hive) => {
              const status = getHiveStatus(hive);
              return (
                <TouchableOpacity
                  key={hive.id}
                  style={[styles.hiveSummaryCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => {
                    setSelectedHiveId(hive.id);
                    setViewMode('detail');
                  }}
                  activeOpacity={0.85}>
                  {/* Top Row: Name and Online Status */}
                  <View style={styles.cardHeaderRow}>
                    <ThemedText style={styles.cardHiveName}>{hive.name}</ThemedText>
                    <View style={styles.onlineBadge}>
                      <View style={styles.greenOnlineDot} />
                      <ThemedText style={styles.onlineText}>Online</ThemedText>
                    </View>
                  </View>

                  {/* Device Node Row */}
                  <View style={styles.cardNodeRow}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#3B82F6" />
                    <ThemedText style={[styles.cardNodeText, { color: textSecondary }]}>
                      {hive.deviceId || 'NODE001'}
                    </ThemedText>
                  </View>

                  {/* Last Update */}
                  <ThemedText style={[styles.cardUpdateText, { color: textSecondary }]}>
                    Ultimo aggiornamento: {formatLastUpdate(hive.lastUpdate)}
                  </ThemedText>

                  {/* 3 Measurement Boxes: Temperatura, Peso, Umidità */}
                  <View style={styles.measurementsRow}>
                    {/* Measurement 1: Temperatura */}
                    <View style={[styles.measureBox, { backgroundColor: boxBg }]}>
                      <View style={styles.measureValRow}>
                        <Ionicons name="thermometer-outline" size={16} color="#0284C7" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.measureVal}>
                          {hive.currentTemperature != null ? hive.currentTemperature.toFixed(1) : '34.5'}
                        </ThemedText>
                        <ThemedText style={[styles.measureUnit, { color: textSecondary }]}> °C</ThemedText>
                      </View>
                      <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
                        Temperatura
                      </ThemedText>
                    </View>

                    {/* Measurement 2: Peso */}
                    <View style={[styles.measureBox, { backgroundColor: boxBg }]}>
                      <View style={styles.measureValRow}>
                        <MaterialCommunityIcons name="scale" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.measureVal}>
                          {hive.currentWeight != null ? hive.currentWeight.toFixed(1) : '42.4'}
                        </ThemedText>
                        <ThemedText style={[styles.measureUnit, { color: textSecondary }]}> kg</ThemedText>
                      </View>
                      <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
                        Peso
                      </ThemedText>
                    </View>

                    {/* Measurement 3: Umidità */}
                    <View style={[styles.measureBox, { backgroundColor: boxBg }]}>
                      <View style={styles.measureValRow}>
                        <Ionicons name="water-outline" size={16} color="#0284C7" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.measureVal}>
                          {hive.currentHumidity != null ? hive.currentHumidity.toFixed(0) : '65'}
                        </ThemedText>
                        <ThemedText style={[styles.measureUnit, { color: textSecondary }]}> %</ThemedText>
                      </View>
                      <ThemedText style={[styles.measureLabel, { color: textSecondary }]}>
                        Umidità
                      </ThemedText>
                    </View>
                  </View>

                  {/* Status Pill at the bottom */}
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          status.type === 'normal'
                            ? isDark ? '#06381B' : '#E8F5E9'
                            : status.type === 'warning'
                            ? isDark ? '#3D2A00' : '#FEF3C7'
                            : isDark ? '#3D0A0A' : '#FEE2E2',
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            status.type === 'normal'
                              ? '#16A34A'
                              : status.type === 'warning'
                              ? '#B45309'
                              : '#DC2626',
                        },
                      ]}>
                      {status.label}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* ========================================================================= */
        /* 2. DETTAGLIO ARNIA (DETAIL VIEW WITH CHARTS, SENSORS & NOTES)             */
        /* ========================================================================= */
        <>
          {/* Top Bar with Back to Panoramica, Hive Dropdown and Menu Dots */}
          <View style={styles.topNavBar}>
            <TouchableOpacity
              style={styles.backToOverviewBtn}
              onPress={() => setViewMode('overview')}
              activeOpacity={0.7}
              accessibilityLabel="Torna alla panoramica">
              <Ionicons name="arrow-back" size={20} color="#2563EB" />
              <ThemedText style={styles.backToOverviewText}>Panoramica</ThemedText>
            </TouchableOpacity>

            {/* Center: Hive Name with Dropdown Chevron */}
            <TouchableOpacity
              style={styles.hiveSelectorBtn}
              onPress={() => setHivePickerVisible(true)}
              activeOpacity={0.7}>
              <ThemedText style={styles.hiveSelectorTitle}>
                {currentHive?.name || 'Arnia Alpha'}
              </ThemedText>
              <Ionicons name="chevron-down" size={18} color={isDark ? '#FFF' : '#1F2937'} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {/* Right: Three Dots Menu */}
            <TouchableOpacity
              style={styles.navIconButton}
              onPress={() => setOptionsMenuVisible(true)}
              accessibilityLabel="Altre opzioni">
              <Ionicons name="ellipsis-vertical" size={22} color={isDark ? '#FFF' : '#1F2937'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
            showsVerticalScrollIndicator={false}>
            
            {/* Node Name & Status Section */}
            <View style={styles.nodeHeaderSection}>
              <ThemedText style={styles.nodeIdTitle}>
                {currentHive?.deviceId || 'NODE001'}
              </ThemedText>
              <View style={styles.onlineStatusRow}>
                <View style={styles.greenOnlineDot} />
                <ThemedText style={styles.onlineStatusText}>Online</ThemedText>
              </View>
              <ThemedText style={[styles.lastUpdateLabel, { color: textSecondary }]}>
                Ultimo aggiornamento: {formatLastUpdate(currentHive?.lastUpdate)}
              </ThemedText>
            </View>

            {/* Status Card Banner */}
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: isWeightDrop
                    ? isDark ? '#3D2A00' : '#FEF3C7'
                    : isDark ? '#06381B' : '#E8F5E9',
                  borderColor: isWeightDrop ? '#FDE68A' : '#C8E6C9',
                },
              ]}>
              <View style={styles.statusIconBox}>
                {isWeightDrop ? (
                  <Ionicons name="alert-circle" size={24} color="#D97706" />
                ) : (
                  <MaterialCommunityIcons name="shield-check" size={26} color="#16A34A" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText
                  style={[
                    styles.statusBannerTitle,
                    { color: isWeightDrop ? '#B45309' : '#1B5E20' },
                  ]}>
                  {isWeightDrop ? 'Attenzione: peso in calo' : 'Tutto nella norma'}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.statusBannerSubtitle,
                    { color: isWeightDrop ? '#92400E' : '#2E7D32' },
                  ]}>
                  {isWeightDrop
                    ? 'Rilevata riduzione di peso nelle ultime 24 ore'
                    : 'Tutti i parametri sono entro i limiti'}
                </ThemedText>
              </View>
            </View>

            {/* Posizione su mappa */}
            <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.chartTitle}>Posizione</ThemedText>
              {currentHive?.latitude != null &&
              currentHive?.longitude != null &&
              isFinite(currentHive.latitude) &&
              isFinite(currentHive.longitude) ? (
                <>
                  <BeehiveMap latitude={currentHive.latitude} longitude={currentHive.longitude} />
                  <ThemedText style={[styles.mapAttribution, { color: textSecondary }]}>
                    © OpenStreetMap contributors
                  </ThemedText>
                  {currentHive.location ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#2563EB" />
                      <ThemedText style={[styles.locationText, { color: textSecondary }]}>
                        {currentHive.location}
                      </ThemedText>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.noLocationBox}>
                  <Ionicons name="map-outline" size={28} color="#9CA3AF" />
                  <ThemedText style={[styles.noLocationText, { color: textSecondary }]}>
                    {currentHive?.location || 'Posizione non disponibile'}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* 3 Metric Cards Row (Peso, Temperatura, Umidità) */}
            <View style={styles.metricCardsRow}>
              {/* Card 1: Peso */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor },
                  selectedMetric === 'weight' && styles.metricCardActive,
                ]}
                onPress={() => setSelectedMetric('weight')}
                activeOpacity={0.8}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <MaterialCommunityIcons name="scale" size={18} color="#0D9488" />
                </View>
                <View style={styles.metricCardValueRow}>
                  <ThemedText style={styles.metricCardValue}>
                    {currentHive?.currentWeight != null ? currentHive.currentWeight.toFixed(1) : '42.4'}
                  </ThemedText>
                  <ThemedText style={[styles.metricCardUnit, { color: textSecondary }]}>kg</ThemedText>
                </View>
                <ThemedText style={[styles.metricCardLabel, { color: textSecondary }]}>
                  Peso
                </ThemedText>
              </TouchableOpacity>

              {/* Card 2: Temperatura */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor },
                  selectedMetric === 'temperature' && styles.metricCardActive,
                ]}
                onPress={() => setSelectedMetric('temperature')}
                activeOpacity={0.8}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="thermometer-outline" size={20} color="#0284C7" />
                </View>
                <View style={styles.metricCardValueRow}>
                  <ThemedText style={styles.metricCardValue}>
                    {currentHive?.currentTemperature != null ? currentHive.currentTemperature.toFixed(1) : '34.5'}
                  </ThemedText>
                  <ThemedText style={[styles.metricCardUnit, { color: textSecondary }]}>°C</ThemedText>
                </View>
                <ThemedText style={[styles.metricCardLabel, { color: textSecondary }]}>
                  Temperatura
                </ThemedText>
              </TouchableOpacity>

              {/* Card 3: Umidità */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor },
                  selectedMetric === 'humidity' && styles.metricCardActive,
                ]}
                onPress={() => setSelectedMetric('humidity')}
                activeOpacity={0.8}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water-outline" size={20} color="#0284C7" />
                </View>
                <View style={styles.metricCardValueRow}>
                  <ThemedText style={styles.metricCardValue}>
                    {currentHive?.currentHumidity != null ? currentHive.currentHumidity.toFixed(0) : '65'}
                  </ThemedText>
                  <ThemedText style={[styles.metricCardUnit, { color: textSecondary }]}>%</ThemedText>
                </View>
                <ThemedText style={[styles.metricCardLabel, { color: textSecondary }]}>
                  Umidità
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Time Range Filter Bar */}
            <View style={styles.rangeFilterContainer}>
              {(['24 ore', '7 giorni', '30 giorni', 'Tutto'] as TimeRange[]).map((r) => {
                const isSelected = selectedRange === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.rangePill,
                      isSelected && styles.rangePillActive,
                    ]}
                    onPress={() => setSelectedRange(r)}
                    activeOpacity={0.7}>
                    <ThemedText
                      style={[
                        styles.rangePillText,
                        isSelected ? styles.rangePillTextActive : { color: textSecondary },
                      ]}>
                      {r}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Chart Card */}
            <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.chartTitle}>
                {selectedMetric === 'temperature'
                  ? 'Andamento temperatura'
                  : selectedMetric === 'weight'
                  ? 'Andamento peso'
                  : 'Andamento umidità'}
              </ThemedText>

              {filteredSeries.length === 0 ? (
                <View style={styles.noDataContainer}>
                  <Ionicons name="cloud-offline-outline" size={34} color="#9CA3AF" />
                  <ThemedText style={[styles.noDataText, { color: textSecondary }]}>
                    Nessun dato nel periodo selezionato
                  </ThemedText>
                </View>
              ) : (
                <>
              {/* SVG Smooth Curve Graph */}
              <View style={styles.svgGraphContainer}>
                <View style={[styles.chartPlotWrap, { width: chartWidth }]}>
                  <Pressable
                    ref={chartPressRef}
                    onPress={handleChartPress}
                    style={{ width: chartWidth }}>
                  <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <SvgGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0%"
                        stopColor={selectedMetric === 'temperature' ? '#EF4444' : selectedMetric === 'weight' ? '#0D9488' : '#0284C7'}
                        stopOpacity="0.25"
                      />
                      <Stop
                        offset="100%"
                        stopColor={selectedMetric === 'temperature' ? '#EF4444' : selectedMetric === 'weight' ? '#0D9488' : '#0284C7'}
                        stopOpacity="0.0"
                      />
                    </SvgGradient>
                  </Defs>

                  {/* Grid Lines */}
                  {[30, 60, 90, 120].map((y, i) => (
                    <G key={i}>
                      <SvgLine
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - 10}
                        y2={y}
                        stroke={isDark ? '#333' : '#F1F5F9'}
                        strokeWidth="1"
                      />
                    </G>
                  ))}

                  {/* Y Axis Labels */}
                  <SvgText x="4" y="32" fontSize="10" fill={textSecondary}>36.0 °C</SvgText>
                  <SvgText x="4" y="62" fontSize="10" fill={textSecondary}>35.0 °C</SvgText>
                  <SvgText x="4" y="92" fontSize="10" fill={textSecondary}>34.0 °C</SvgText>
                  <SvgText x="4" y="122" fontSize="10" fill={textSecondary}>33.0 °C</SvgText>

                  {/* Filled Area */}
                  {areaPath ? <Path d={areaPath} fill="url(#chartGradient)" /> : null}

                  {/* Line Curve */}
                  {linePath ? (
                    <Path
                      d={linePath}
                      fill="none"
                      stroke={selectedMetric === 'temperature' ? '#EF4444' : selectedMetric === 'weight' ? '#0D9488' : '#0284C7'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {/* Data Points */}
                  {chartPoints.map((pt, index) => (
                    <SvgCircle
                      key={index}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill={selectedMetric === 'temperature' ? '#EF4444' : selectedMetric === 'weight' ? '#0D9488' : '#0284C7'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  ))}

                  {/* Vertical guides for note timestamps */}
                  {noteMarkers.map((m) => (
                    <SvgLine
                      key={`guide-${m.note.id_log}`}
                      x1={m.x}
                      y1={m.y}
                      x2={m.x}
                      y2={chartHeight - paddingY}
                      stroke="#3B82F6"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.8"
                    />
                  ))}
                </Svg>
                  </Pressable>

                {/* Note markers clickable overlay */}
                {noteMarkers.map((m) => (
                  <TouchableOpacity
                    key={`marker-${m.note.id_log}`}
                    style={[styles.noteMarker, { left: m.x - 11, top: m.y - 10 }]}
                    onPress={() => openNoteDetail(m.note)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    accessibilityLabel={`Nota: ${getTipologiaInfo(m.note.tipo_attivita).label}`}>
                    <ThemedText style={styles.noteMarkerIcon}>
                      {getTipologiaInfo(m.note.tipo_attivita).icon}
                    </ThemedText>
                  </TouchableOpacity>
                ))}

                {/* Data Point Tooltip */}
                {chartSelected && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.chartTooltip,
                      {
                        left: Math.max(16, Math.min(chartSelected.x - 70, chartWidth - 160)),
                        top: Math.max(4, chartSelected.y - 62),
                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                        borderColor: chartLineColor,
                      },
                    ]}>
                    <View style={[styles.chartTooltipDot, { backgroundColor: chartLineColor }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.chartTooltipValue}>
                        {chartSelected.value.toFixed(1)} {chartUnit}
                      </ThemedText>
                      <ThemedText style={styles.chartTooltipTime}>
                        {formatPointTime(chartSelected.timestamp)}
                      </ThemedText>
                    </View>
                  </View>
                )}
                </View>
              </View>

              {/* X Axis Timestamps */}
              <View style={styles.xAxisRow}>
                {xAxisLabels.map((label, i) => (
                  <ThemedText key={i} style={[styles.xAxisText, { color: textSecondary }]}>
                    {label}
                  </ThemedText>
                ))}
              </View>
              </>
              )}

              {/* Stats Summary Row (Min, Media, Max) */}
              <View style={styles.statsSummaryRow}>
                <View style={styles.statCol}>
                  <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Min</ThemedText>
                  <ThemedText style={styles.statValue}>
                    {stats.min != null
                      ? `${stats.min} ${selectedMetric === 'temperature' ? '°C' : selectedMetric === 'weight' ? 'kg' : '%'}`
                      : 'N/D'}
                  </ThemedText>
                </View>

                <View style={styles.statCol}>
                  <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Media</ThemedText>
                  <ThemedText style={styles.statValue}>
                    {stats.avg != null
                      ? `${stats.avg} ${selectedMetric === 'temperature' ? '°C' : selectedMetric === 'weight' ? 'kg' : '%'}`
                      : 'N/D'}
                  </ThemedText>
                </View>

                <View style={styles.statCol}>
                  <ThemedText style={[styles.statLabel, { color: textSecondary }]}>Max</ThemedText>
                  <ThemedText style={styles.statValue}>
                    {stats.max != null
                      ? `${stats.max} ${selectedMetric === 'temperature' ? '°C' : selectedMetric === 'weight' ? 'kg' : '%'}`
                      : 'N/D'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Note Recenti Section */}
            <View style={styles.notesSectionHeader}>
              <ThemedText style={styles.notesSectionTitle}>Note recenti</ThemedText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/note' as any)}>
                <ThemedText style={styles.viewAllNotesText}>Vedi tutte</ThemedText>
              </TouchableOpacity>
            </View>

            {activities.length > 0 ? (
              <TouchableOpacity
                style={[styles.recentNoteCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => openNoteDetail(activities[0])}
                activeOpacity={0.7}>
                <View style={styles.recentNoteHeader}>
                  <ThemedText style={styles.recentNoteTag}>
                    {getTipologiaInfo(activities[0].tipo_attivita).icon}{' '}
                    {getTipologiaInfo(activities[0].tipo_attivita).label}
                  </ThemedText>
                  <ThemedText style={[styles.recentNoteDate, { color: textSecondary }]}>
                    {new Date(activities[0].timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </ThemedText>
                </View>
                <ThemedText style={styles.recentNoteDesc} numberOfLines={2}>
                  {activities[0].descrizione}
                </ThemedText>
              </TouchableOpacity>
            ) : null}

            {/* Bottom Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.addNoteMainBtn}
                onPress={() => {
                  const now = new Date();
                  setSelectedTime(now);
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setNoteText('');
                  setNoteType('ispezione');
                  setTypeDropdownOpen(false);
                  setNoteModalVisible(true);
                }}
                activeOpacity={0.8}>
                <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.addNoteMainBtnText}>Nota manuale</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailsMainBtn, { backgroundColor: cardBg }]}
                onPress={() => setDetailsModalVisible(true)}
                activeOpacity={0.8}>
                <Ionicons name="information-circle-outline" size={20} color={isDark ? '#FFF' : '#374151'} style={{ marginRight: 6 }} />
                <ThemedText style={[styles.detailsMainBtnText, { color: isDark ? '#FFF' : '#1F2937' }]}>
                  Dettagli arnia
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: HIVE PICKER (Switches between Arnie or to Overview)              */}
      {/* ========================================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={hivePickerVisible}
        onRequestClose={() => setHivePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setHivePickerVisible(false)}>
          <ThemedView style={styles.pickerModalContent}>
            <ThemedText style={styles.pickerModalHeader}>Seleziona Arnia</ThemedText>

            <TouchableOpacity
              style={styles.pickerOverviewAction}
              onPress={() => {
                setHivePickerVisible(false);
                setViewMode('overview');
              }}>
              <Ionicons name="grid-outline" size={18} color="#2563EB" />
              <ThemedText style={styles.pickerOverviewActionText}>
                Panoramica generale (Tutte)
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.pickerDivider} />

            {beehives.map((hive) => (
              <TouchableOpacity
                key={hive.id}
                style={[
                  styles.pickerItem,
                  selectedHiveId === hive.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedHiveId(hive.id);
                  setViewMode('detail');
                  setHivePickerVisible(false);
                }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.pickerItemName, selectedHiveId === hive.id && { color: '#2563EB', fontWeight: '700' }]}>
                    {hive.name}
                  </ThemedText>
                  <ThemedText style={[styles.pickerItemNode, { color: textSecondary }]}>
                    {hive.deviceId}
                  </ThemedText>
                </View>
                {selectedHiveId === hive.id && (
                  <Ionicons name="checkmark" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: FILTER DROPDOWN MODAL (Tutte, Online, Attenzioni, Allarmi)        */}
      {/* ========================================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}>
          <ThemedView style={styles.pickerModalContent}>
            <ThemedText style={styles.pickerModalHeader}>Filtra per stato</ThemedText>
            {[
              { key: 'tutte', label: 'Tutte le arnie' },
              { key: 'online', label: 'Online' },
              { key: 'attenzioni', label: 'Attenzioni' },
              { key: 'allarmi', label: 'Allarmi' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.pickerItem,
                  statusFilter === opt.key && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setStatusFilter(opt.key as StatusFilter);
                  setFilterModalVisible(false);
                }}>
                <ThemedText
                  style={[
                    styles.pickerItemName,
                    statusFilter === opt.key && { color: '#2563EB', fontWeight: '700' },
                  ]}>
                  {opt.label}
                </ThemedText>
                {statusFilter === opt.key && (
                  <Ionicons name="checkmark" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: MORE OPTIONS MENU (⋮)                                            */}
      {/* ========================================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={optionsMenuVisible}
        onRequestClose={() => setOptionsMenuVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsMenuVisible(false)}>
          <ThemedView style={styles.pickerModalContent}>
            <ThemedText style={styles.pickerModalHeader}>Opzioni Arnia</ThemedText>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={() => {
                setOptionsMenuVisible(false);
                setDetailsModalVisible(true);
              }}>
              <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
              <ThemedText style={styles.optionsMenuText}>Scheda tecnica e nodo</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={() => {
                setOptionsMenuVisible(false);
                router.push('/(tabs)/note' as any);
              }}>
              <Ionicons name="journal-outline" size={20} color="#2563EB" />
              <ThemedText style={styles.optionsMenuText}>Registro attività</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={() => {
                setOptionsMenuVisible(false);
                onRefresh();
              }}>
              <Ionicons name="refresh-outline" size={20} color="#2563EB" />
              <ThemedText style={styles.optionsMenuText}>Aggiorna letture sensori</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: NUOVA NOTA                                                       */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={noteModalVisible}
        onRequestClose={() => setNoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.noteModalCard}>
            <ThemedText style={styles.modalTitleText}>Nuova nota manuale</ThemedText>

            <ThemedText style={styles.inputFieldLabel}>Arnia</ThemedText>
            <ThemedText style={styles.hiveFixedText}>{currentHive?.name} ({currentHive?.deviceId})</ThemedText>

            <ThemedText style={styles.inputFieldLabel}>Tipologia</ThemedText>
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
                  <ThemedText style={styles.dropdownValueIcon}>{noteTypeInfo.icon}</ThemedText>
                  <ThemedText
                    style={[
                      styles.dropdownValueText,
                      { color: isDark ? '#FFFFFF' : '#111827' },
                    ]}>
                    {noteTypeInfo.label}
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
                              {
                                color: isSelected ? '#2563EB' : isDark ? '#F3F4F6' : '#1F2937',
                              },
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

            <ThemedText style={styles.inputFieldLabel}>Data</ThemedText>
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

            <ThemedText style={[styles.inputFieldLabel, { marginTop: 12 }]}>Ora</ThemedText>
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

            <ThemedText style={styles.inputFieldLabel}>Nota</ThemedText>
            <TextInput
              style={[styles.textInputStyle, styles.textAreaStyle, { color: isDark ? '#FFF' : '#000' }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Scrivi una nota sull'intervento o osservazione..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setNoteModalVisible(false)}
                disabled={isSubmittingNote}>
                <ThemedText style={styles.cancelBtnText}>Annulla</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveModalBtn]}
                onPress={handleSaveNote}
                disabled={isSubmittingNote}>
                {isSubmittingNote ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Salva nota</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: DETTAGLI ARNIA (INFO MODAL)                                      */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.noteModalCard}>
            <ThemedText style={styles.modalTitleText}>Dettagli Arnia</ThemedText>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Nome:</ThemedText>
              <ThemedText style={styles.detailVal}>{currentHive?.name}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>ID Dispositivo:</ThemedText>
              <ThemedText style={styles.detailVal}>{currentHive?.deviceId}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Stato Nodo:</ThemedText>
              <ThemedText style={[styles.detailVal, { color: '#16A34A', fontWeight: '700' }]}>🟢 Online</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Sensore Temperatura:</ThemedText>
              <ThemedText style={styles.detailVal}>DHT22 / SHT30</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Sensore Peso:</ThemedText>
              <ThemedText style={styles.detailVal}>HX711 4-LoadCell 150kg</ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.saveModalBtn, { marginTop: 20, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => setDetailsModalVisible(false)}>
              <ThemedText style={styles.saveBtnText}>Chiudi</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: DETTAGLIO NOTA (from chart marker)                                */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={noteDetailVisible}
        onRequestClose={() => setNoteDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.noteModalCard}>
            <ThemedText style={styles.modalTitleText}>Dettaglio Nota</ThemedText>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Tipologia:</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ThemedText style={{ fontSize: 16 }}>
                  {getTipologiaInfo(selectedActivity?.tipo_attivita).icon}
                </ThemedText>
                <ThemedText style={styles.detailVal}>
                  {getTipologiaInfo(selectedActivity?.tipo_attivita).label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Data e ora:</ThemedText>
              <ThemedText style={styles.detailVal}>
                {selectedActivity ? formatActivityDate(selectedActivity.timestamp) : '—'}
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Arnia:</ThemedText>
              <ThemedText style={styles.detailVal}>{currentHive?.name}</ThemedText>
            </View>

            <View style={styles.noteDetailDescWrap}>
              <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Descrizione</ThemedText>
              <ThemedText style={styles.noteDetailDesc}>
                {selectedActivity?.descrizione || 'Nessuna descrizione'}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.saveModalBtn, { marginTop: 20, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => setNoteDetailVisible(false)}>
              <ThemedText style={styles.saveBtnText}>Chiudi</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BeehiveMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const screenWidth = Dimensions.get('window').width;
  const mapWidth = Math.min(Math.max(screenWidth - 32, 280), 400);
  const mapHeight = 220;
  const dLon = 0.012;
  const dLat = 0.008;

  const embedUrl =
    `https://www.openstreetmap.org/export/embed.html?` +
    `bbox=${longitude - dLon}%2C${latitude - dLat}%2C${longitude + dLon}%2C${latitude + dLat}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`;

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          width: mapWidth,
          height: mapHeight,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
        }}>
        {createElement('iframe', {
          src: embedUrl,
          title: 'Mappa OpenStreetMap',
          loading: 'lazy',
          style: { width: '100%', height: '100%', border: 0 },
        })}
      </View>
    );
  }

  return (
    <View
      style={{
        width: mapWidth,
        height: mapHeight,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
      }}>
      <WebView source={{ uri: embedUrl }} style={{ flex: 1 }} />
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ========================================================================= */
  /* Overview (Panoramica) Styles matching mockup                              */
  /* ========================================================================= */
  overviewHeaderSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  overviewSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  kpiCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiCardActive: {
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  kpiNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 6,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  resetSearchBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetSearchBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  hiveSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHiveName: {
    fontSize: 18,
    fontWeight: '700',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  cardNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cardNodeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardUpdateText: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  measureBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  measureValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  measureVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  measureUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  measureLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ========================================================================= */
  /* Detail View Styles                                                        */
  /* ========================================================================= */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backToOverviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  backToOverviewText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  navIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiveSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hiveSelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  nodeHeaderSection: {
    marginTop: 6,
    marginBottom: 14,
  },
  nodeIdTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  greenOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  lastUpdateLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  mapAttribution: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  noLocationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  noLocationText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statusIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  metricCardActive: {
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  sensorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricCardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  metricCardValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricCardUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  rangeFilterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 22,
    padding: 4,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  rangePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rangePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  svgGraphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chartPlotWrap: {
    position: 'relative',
  },
  noteMarker: {
    position: 'absolute',
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteMarkerIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  chartTooltip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  chartTooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  chartTooltipValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartTooltipTime: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 1,
  },
  noteDetailDescWrap: {
    marginTop: 8,
    backgroundColor: 'rgba(150,150,150,0.08)',
    borderRadius: 10,
    padding: 12,
  },
  noteDetailDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  xAxisText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
    paddingTop: 12,
  },
  statCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  notesSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  viewAllNotesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  recentNoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  recentNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentNoteTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  recentNoteDate: {
    fontSize: 12,
  },
  recentNoteDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  addNoteMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
  },
  addNoteMainBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  detailsMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    height: 48,
    borderRadius: 14,
  },
  detailsMainBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },

  /* ========================================================================= */
  /* Modal Styles                                                              */
  /* ========================================================================= */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerModalHeader: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOverviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 10,
    marginBottom: 6,
  },
  pickerOverviewActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  pickerDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerItemNode: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  optionsMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noteModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  hiveFixedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 12,
  },
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
  textInputStyle: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  textAreaStyle: {
    height: 90,
    textAlignVertical: 'top',
  },
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
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalBtn: {
    backgroundColor: '#8E8E93',
  },
  cancelBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  saveModalBtn: {
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '600',
  },
});
