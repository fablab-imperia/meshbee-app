import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
  focused?: boolean;
}

/**
 * Dashboard Tab Icon (House / Home)
 */
export function DashboardTabIcon({ color = '#2563EB', size = 24, focused }: IconProps) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
}

/**
 * Arnie Tab Icon (Beehive / Cube)
 */
export function ArnieTabIcon({ color = '#8E8E93', size = 24, focused }: IconProps) {
  return <MaterialCommunityIcons name={focused ? 'archive' : 'archive-outline'} size={size} color={color} />;
}

/**
 * Allarmi Tab Icon (Bell)
 */
export function AllarmiTabIcon({ color = '#8E8E93', size = 24, focused }: IconProps) {
  return <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />;
}

/**
 * Note Tab Icon (Document / Notes)
 */
export function NoteTabIcon({ color = '#8E8E93', size = 24, focused }: IconProps) {
  return <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />;
}

/**
 * Admin Tab Icon (Gear / Settings)
 */
export function AdminTabIcon({ color = '#8E8E93', size = 24, focused }: IconProps) {
  return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
}

/**
 * Thermometer Icon (Sensor Card)
 */
export function ThermometerSensorIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 14.76V5C14 3.9 13.1 3 12 3C10.9 3 10 3.9 10 5V14.76C8.79 15.68 8 17.15 8 18.8C8 21.12 9.88 23 12.2 23C14.52 23 16.4 21.12 16.4 18.8C16.4 17.15 15.21 15.68 14 14.76Z"
        stroke="#0284C7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="18.8" r="2" fill="#0284C7" />
      <Line x1="12" y1="11" x2="12" y2="17" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Weight / Scale Icon (Sensor Card)
 */
export function WeightSensorIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4C10.9 4 10 4.9 10 6H14C14 4.9 13.1 4 12 4Z"
        stroke="#0D9488"
        strokeWidth="1.8"
      />
      <Path
        d="M6 7H18L20 20H4L6 7Z"
        stroke="#0D9488"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3" stroke="#0D9488" strokeWidth="1.5" />
      <Line x1="12" y1="13" x2="13.5" y2="11.5" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Droplet / Humidity Icon (Sensor Card)
 */
export function DropletSensorIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.69L6.5 12.35C5.55 14.02 5.55 16.08 6.5 17.75C7.45 19.42 9.24 20.45 11.16 20.45H12.84C14.76 20.45 16.55 19.42 17.5 17.75C18.45 16.08 18.45 14.02 17.5 12.35L12 2.69Z"
        fill="#38BDF8"
        fillOpacity="0.2"
        stroke="#0284C7"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Node / IoT Device Badge Icon
 */
export function NodeBadgeIcon({ size = 15, color = '#3B82F6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="3" fill={color} />
      <Line x1="12" y1="1" x2="12" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="1" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
