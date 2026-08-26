import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AdminTabIcon,
  AllarmiTabIcon,
  ArnieTabIcon,
  DashboardTabIcon,
  NoteTabIcon,
} from '@/components/TabIcons';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Verifica se l'utente ha ruolo di amministratore
  const isAdmin = Boolean(
    user?.ruolo?.toLowerCase() === 'admin' ||
    user?.ruolo?.toLowerCase() === 'amministratore' ||
    user?.email?.toLowerCase().includes('admin')
  );

  // Reindirizza al login se non autenticato
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  // Mostra loading mentre verifica autenticazione
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Non renderizzare se non autenticato
  if (!user) {
    return null;
  }

  const tabActiveColor = '#2563EB'; // Vibrant primary blue matching mockup
  const tabInactiveColor = isDark ? '#9BA1A6' : '#8E8E93';
  const tabBgColor = isDark ? '#151718' : '#FFFFFF';
  const tabBorderColor = isDark ? '#2C2C2E' : '#E5E7EB';
  const bottomInset = insets?.bottom || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: tabActiveColor,
        tabBarInactiveTintColor: tabInactiveColor,
        tabBarStyle: {
          backgroundColor: tabBgColor,
          borderTopColor: tabBorderColor,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 56 + bottomInset : 64,
          paddingBottom: Platform.OS === 'ios' ? (bottomInset > 0 ? bottomInset : 8) : 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      {/* 1. Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <DashboardTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* 2. Arnie Tab */}
      <Tabs.Screen
        name="arnie"
        options={{
          title: 'Arnie',
          tabBarLabel: 'Arnie',
          tabBarIcon: ({ color, focused }) => (
            <ArnieTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* 3. Allarmi Tab */}
      <Tabs.Screen
        name="allarmi"
        options={{
          title: 'Allarmi',
          tabBarLabel: 'Allarmi',
          tabBarIcon: ({ color, focused }) => (
            <AllarmiTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* 4. Note Tab */}
      <Tabs.Screen
        name="note"
        options={{
          title: 'Note',
          tabBarLabel: 'Note',
          tabBarIcon: ({ color, focused }) => (
            <NoteTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* 5. Admin Tab (visibile solo agli admin) */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarLabel: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <AdminTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* Dettagli route */}
      <Tabs.Screen
        name="dettagli"
        options={{
          href: null,
          title: 'Dettagli',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
