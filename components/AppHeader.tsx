import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/FastAPIAuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AppHeader({ title = 'Monitoraggio Arnie' }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  // Compute user initials (default to "MR" if Mario Rossi or from email/name)
  const getInitials = () => {
    if (user?.nome && user?.cognome) {
      return `${user.nome[0]}${user.cognome[0]}`.toUpperCase();
    }
    if (user?.nome) {
      return user.nome.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      const parts = namePart.split('.');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return namePart.slice(0, 2).toUpperCase();
    }
    return 'MR';
  };

  const handleLogoutAction = async () => {
    setMenuVisible(false);
    try {
      await signOut();
    } finally {
      router.replace('/(auth)/login');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Sei sicuro di voler effettuare il logout?');
      if (confirmed) handleLogoutAction();
    } else {
      Alert.alert('Logout', 'Sei sicuro di voler uscire dall\'account?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogoutAction },
      ]);
    }
  };

  return (
    <>
      <ThemedView style={styles.headerContainer}>
        {/* Left: Hamburger menu */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMenuVisible(true)}
          accessibilityLabel="Menu">
          <Ionicons
            name="menu-outline"
            size={26}
            color={isDark ? '#FFFFFF' : '#1F2937'}
          />
        </TouchableOpacity>

        {/* Center: Bee Logo & Title */}
        <View style={styles.centerTitleContainer}>
          <ThemedText style={styles.beeEmoji}>🐝</ThemedText>
          <ThemedText style={styles.titleText}>{title}</ThemedText>
        </View>

        {/* Right: User Avatar initials badge */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setMenuVisible(true)}
          accessibilityLabel="Profilo utente">
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarText}>{getInitials()}</ThemedText>
          </View>
        </TouchableOpacity>
      </ThemedView>

      {/* Menu / Drawer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalOverlay}>
          {/* Backdrop clickable to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
            accessibilityLabel="Chiudi menu"
          />

          <SafeAreaView style={styles.menuContainer}>
            <ThemedView style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <View style={styles.userProfileSection}>
                  <View style={styles.largeAvatarCircle}>
                    <ThemedText style={styles.largeAvatarText}>
                      {getInitials()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText style={styles.userName}>
                      {user?.nome ? `${user.nome} ${user.cognome || ''}` : 'Utente BeeHive'}
                    </ThemedText>
                    <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>
                    {user?.ruolo && (
                      <ThemedText style={styles.userRole}>
                        Ruolo: {user.ruolo}
                      </ThemedText>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setMenuVisible(false)}
                  style={styles.closeButton}
                  accessibilityLabel="Chiudi">
                  <Ionicons
                    name="close"
                    size={22}
                    color={isDark ? '#FFF' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <ScrollView style={styles.menuScrollArea} showsVerticalScrollIndicator={false}>
                <View style={styles.menuItems}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push('/(tabs)/arnie' as any);
                    }}>
                    <Ionicons name="archive-outline" size={20} color="#2563EB" />
                    <ThemedText style={styles.menuItemText}>Arnie</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push('/(tabs)/allarmi' as any);
                    }}>
                    <Ionicons name="notifications-outline" size={20} color="#2563EB" />
                    <ThemedText style={styles.menuItemText}>Allarmi</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push('/(tabs)/note' as any);
                    }}>
                    <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                    <ThemedText style={styles.menuItemText}>Note & Attività</ThemedText>
                  </TouchableOpacity>

                  {(user?.ruolo?.toLowerCase() === 'admin' ||
                    user?.ruolo?.toLowerCase() === 'amministratore' ||
                    user?.email?.toLowerCase().includes('admin')) && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(false);
                        router.push('/(tabs)/admin' as any);
                      }}>
                      <Ionicons name="settings-outline" size={20} color="#2563EB" />
                      <ThemedText style={styles.menuItemText}>Amministrazione</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

              <View style={styles.divider} />

              {/* Pulsante Logout */}
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                  },
                ]}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Logout">
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                <ThemedText style={styles.logoutText}>Logout</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  centerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beeEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE', // Soft light blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB', // Blue matching screenshot
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '85%',
    maxWidth: 340,
    height: '100%',
  },
  menuContent: {
    flex: 1,
    padding: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  largeAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  largeAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  userRole: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginVertical: 16,
  },
  menuItems: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuScrollArea: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
});
