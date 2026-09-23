import React, { useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, TouchableWithoutFeedback, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SensorReading } from '@/types/sensors';
import { AttivitaResponse } from '@/types/api';

interface TimeSeriesChartProps {
  title: string;
  data: SensorReading[];
  unit: string;
  color?: string;
  activities?: AttivitaResponse[];
  onActivityPress?: (activity: AttivitaResponse) => void;
}

export function TimeSeriesChart({ 
  title, 
  data, 
  unit, 
  color = '#4A90E2',
  activities = [],
  onActivityPress
}: TimeSeriesChartProps) {
  const colorScheme = useColorScheme();
  const screenWidth = Dimensions.get('window').width;
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1C1C1E' : '#F2F2F7';
  
  // Chart dimensions
  const chartWidth = screenWidth - 64;
  const chartHeight = 220;
  const horizontalPadding = 45; // Based on react-native-chart-kit typical layout

  // Ordina i dati per timestamp
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [data]);

  const [pointsToShow, setPointsToShow] = useState(Math.min(10, sortedData.length || 10));

  // Effettivamente mostriamo gli ultimi 'pointsToShow' punti
  const displayData = useMemo(() => {
    return sortedData.slice(-pointsToShow);
  }, [sortedData, pointsToShow]);

  // Utility per il parsing sicuro delle date
  const parseDate = (dateStr: any) => {
    if (dateStr instanceof Date) return dateStr;
    if (!dateStr) return new Date();
    // Gestisce formati come "2024-05-06 14:30:00" trasformandoli in ISO standard
    const normalized = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Find activities that fall within the current display range
  const visibleActivities = useMemo(() => {
    if (displayData.length === 0) return [];
    
    // Se c'è un solo punto, mostriamo le attività di quel giorno
    if (displayData.length === 1) {
      const day = parseDate(displayData[0].timestamp).toDateString();
      return activities.filter(act => parseDate(act.timestamp).toDateString() === day);
    }

    const minTime = parseDate(displayData[0].timestamp).getTime();
    const maxTime = parseDate(displayData[displayData.length - 1].timestamp).getTime();
    
    // Aggiungiamo un piccolo margine (1 ora) per includere attività appena fuori dai punti
    const margin = 1000 * 60 * 60; 
    
    return activities.filter(act => {
      const actTime = parseDate(act.timestamp).getTime();
      return actTime >= (minTime - margin) && actTime <= (maxTime + margin);
    });
  }, [activities, displayData]);

  // Calculate X position for an activity
  const getActivityX = (timestamp: string) => {
    if (displayData.length === 0) return -100;
    
    const time = parseDate(timestamp).getTime();
    const minTime = parseDate(displayData[0].timestamp).getTime();
    
    if (displayData.length === 1) return horizontalPadding + (chartWidth - horizontalPadding) / 2;
    
    const maxTime = parseDate(displayData[displayData.length - 1].timestamp).getTime();
    const range = maxTime - minTime;
    
    if (range <= 0) return horizontalPadding;
    
    const progress = (time - minTime) / range;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    const effectiveWidth = chartWidth - horizontalPadding - 20;
    return horizontalPadding + (clampedProgress * effectiveWidth);
  };

  // State for selected data point tooltip
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    x: number;
    y: number;
    value: number;
    timestamp: Date;
  } | null>(null);

  // Refs / layout constants matching chart-kit's internal dot rendering (renderDots)
  const chartPressRef = useRef<any>(null);
  const CHART_PADDING_RIGHT = 64;  // chart-kit default style.paddingRight
  const CHART_PADDING_TOP = 16;    // chart-kit default style.paddingTop
  const CHART_LEFT_OFFSET = -16;   // styles.chart marginLeft
  const CHART_TOP_OFFSET = 8;      // styles.chart marginVertical (top)

  // Reproduce react-native-chart-kit's dot coordinates (renderDots) in SVG space
  const getDotCoords = (index: number) => {
    const values = displayData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const scaler = max - min || 1;
    const xMax = Math.max(displayData.length, 1);
    const cx = CHART_PADDING_RIGHT + (index * (chartWidth - CHART_PADDING_RIGHT)) / xMax;
    const calcHeight = chartHeight * ((displayData[index].value - min) / scaler);
    const cy = ((chartHeight - calcHeight) / 4) * 3 + CHART_PADDING_TOP;
    return { cx, cy };
  };

  // Convert dot coordinates to the tooltip container (View position:relative) space
  const dotToContainer = (index: number) => {
    const { cx, cy } = getDotCoords(index);
    return { x: cx + CHART_LEFT_OFFSET, y: cy + CHART_TOP_OFFSET };
  };

  // Handle chart tap to show data point tooltip (works on native + web)
  const handleChartPress = (event: any) => {
    if (displayData.length === 0) {
      setSelectedPoint(null);
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

    if (locX == null) return;

    const N = displayData.length;
    const stepX = N > 1 ? (chartWidth - CHART_PADDING_RIGHT) / N : chartWidth;
    const xTolerance = Math.max(30, stepX * 0.6);
    const yTolerance = 60;

    let closestIndex = -1;
    let closestDist = Infinity;

    for (let i = 0; i < N; i++) {
      const { cx, cy } = getDotCoords(i);
      const dx = Math.abs(locX - cx);
      if (dx > xTolerance) continue;
      const dy = Math.abs(locY - cy);
      if (dy > yTolerance) continue;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      const point = displayData[closestIndex];
      const { x, y } = dotToContainer(closestIndex);
      setSelectedPoint({
        index: closestIndex,
        x,
        y,
        value: point.value,
        timestamp: point.timestamp,
      });
    } else {
      setSelectedPoint(null);
    }
  };

  const values = displayData.map(d => d.value);
  const labels = displayData.map((d, i) => {
    // Mostra solo alcune label se ci sono troppi punti per non affollare l'asse X
    if (pointsToShow > 20 && i % Math.ceil(pointsToShow / 5) !== 0 && i !== displayData.length - 1) {
      return '';
    }
    return `${String(d.timestamp.getDate()).padStart(2, '0')}/${String(d.timestamp.getMonth() + 1).padStart(2, '0')} ${String(d.timestamp.getHours()).padStart(2, '0')}:${String(d.timestamp.getMinutes()).padStart(2, '0')}`;
  });

  const chartConfig = {
    backgroundColor: backgroundColor,
    backgroundGradientFrom: backgroundColor,
    backgroundGradientTo: backgroundColor,
    decimalPlaces: 1,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => isDark ? '#FFFFFF' : '#000000',
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: pointsToShow > 30 ? '0' : '3', // Nascondi i punti se sono troppi
      strokeWidth: '1',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: isDark ? '#333' : '#e3e3e3',
    }
  };

  const chartData = {
    labels: labels.length > 0 ? labels : [' '],
    datasets: [
      {
        data: values.length > 0 ? values : [0],
        color: (opacity = 1) => color,
        strokeWidth: 2,
      },
    ],
  };

  const handleRangeChange = (value: number) => {
    setPointsToShow(Math.round(value));
    setSelectedPoint(null);
  };

  const formatDateTime = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <TouchableWithoutFeedback onPress={() => setSelectedPoint(null)}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.currentRange}>
            {pointsToShow} {pointsToShow === 1 ? 'punto' : 'punti'}
          </ThemedText>
        </View>
      </TouchableWithoutFeedback>

        <View style={{ position: 'relative' }}>
          <Pressable ref={chartPressRef} onPress={handleChartPress}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={chartHeight}
              chartConfig={chartConfig}
              bezier={pointsToShow < 50}
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={false}
              yAxisSuffix={` ${unit}`}
              verticalLabelRotation={pointsToShow > 10 ? 35 : 0}
              xLabelsOffset={-10}
            />
          </Pressable>
          
          {/* Activity Icons Overlay */}
          {visibleActivities.map((activity) => {
            const xPos = getActivityX(activity.timestamp);
            if (xPos < 0) return null;
            
            return (
              <TouchableOpacity
                key={activity.id_log}
                style={[styles.activityIcon, { left: xPos - 12 }]}
                onPress={() => {
                  setSelectedPoint(null);
                  onActivityPress?.(activity);
                }}
              >
                <ThemedText style={{ fontSize: 16 }}>📝</ThemedText>
              </TouchableOpacity>
            );
          })}

          {/* Data Point Tooltip */}
          {selectedPoint && (
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.max(10, Math.min(selectedPoint.x - 60, chartWidth - 130)),
                  top: Math.max(5, selectedPoint.y - 60),
                  backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                  borderColor: color,
                },
              ]}
            >
              <ThemedText style={styles.tooltipValue}>
                {selectedPoint.value.toFixed(1)} {unit}
              </ThemedText>
              <ThemedText style={styles.tooltipTime}>
                {formatDateTime(selectedPoint.timestamp)}
              </ThemedText>
              <View style={[styles.tooltipArrow, { borderTopColor: isDark ? '#2C2C2E' : '#FFFFFF' }]} />
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <View style={styles.sliderRow}>
            <ThemedText style={styles.sliderLabel}>Zoom:</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={Math.max(sortedData.length, 10)}
              value={pointsToShow}
              onValueChange={handleRangeChange}
              minimumTrackTintColor={color}
              maximumTrackTintColor={isDark ? '#38383A' : '#E5E5EA'}
              thumbTintColor={color}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[
                styles.rangeButton, 
                { borderColor: color },
                pointsToShow === 10 && { backgroundColor: color }
              ]}
              onPress={() => {
                setPointsToShow(Math.min(10, sortedData.length));
                setSelectedPoint(null);
              }}>
              <ThemedText style={[styles.buttonText, pointsToShow === 10 && styles.activeButtonText]}>10 DP</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.rangeButton, 
                { borderColor: color },
                pointsToShow === 50 && { backgroundColor: color }
              ]}
              onPress={() => {
                setPointsToShow(Math.min(50, sortedData.length));
                setSelectedPoint(null);
              }}>
              <ThemedText style={[styles.buttonText, pointsToShow === 50 && styles.activeButtonText]}>50 DP</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.rangeButton, 
                { borderColor: color },
                pointsToShow === sortedData.length && { backgroundColor: color }
              ]}
              onPress={() => {
                setPointsToShow(sortedData.length);
                setSelectedPoint(null);
              }}>
              <ThemedText style={[styles.buttonText, pointsToShow === sortedData.length && styles.activeButtonText]}>Tutti</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentRange: {
    fontSize: 12,
    opacity: 0.6,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -16,
    paddingBottom: 20,
  },
  controls: {
    marginTop: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    marginRight: 12,
    minWidth: 50,
  },
  slider: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    opacity: 0.8,
  },
  activeButtonText: {
    color: '#FFFFFF',
    opacity: 1,
  },
  activityIcon: {
    position: 'absolute',
    top: 20,
    zIndex: 10,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
    alignItems: 'center',
    zIndex: 20,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipTime: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
