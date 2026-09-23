import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Amministratore' | 'Operatore' | 'Visualizzatore';
  active: boolean;
  createdAt: string;
  lastAccess: string;
  initials: string;
}

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Active sub-modal view
  const [activeModal, setActiveModal] = useState<
    'users' | 'user_detail' | 'new_user' | 'system' | 'logs' | 'backup' | null
  >(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Amministratore' | 'Operatore' | 'Visualizzatore'>('Operatore');
  const [newUserActive, setNewUserActive] = useState(true);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    return (
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
    );
  });

  const handleCreateUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      if (Platform.OS === 'web') alert('Inserisci nome ed email');
      else Alert.alert('Errore', 'Inserisci nome ed email');
      return;
    }

    const parts = newUserName.trim().split(' ');
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : newUserName.slice(0, 2).toUpperCase();

    const created: User = {
      id: Date.now(),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      active: newUserActive,
      createdAt: new Date().toLocaleDateString('it-IT') + ' 10:00',
      lastAccess: 'Mai',
      initials,
    };

    setUsers((prev) => [created, ...prev]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Operatore');
    setNewUserActive(true);
    setActiveModal('users');
  };

  const handleToggleUserStatus = (userId: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser((prev) => (prev ? { ...prev, active: !prev.active } : null));
    }
  };

  const handleDeleteUser = (userId: number) => {
    const doDelete = () => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setActiveModal('users');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Sei sicuro di voler eliminare questo utente?')) {
        doDelete();
      }
    } else {
      Alert.alert('Elimina Utente', 'Sei sicuro di voler eliminare questo utente?', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#2C2C2E' : '#E5E7EB';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const dividerColor = isDark ? '#2C2C2E' : '#F1F5F9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header matching mockup */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="settings-sharp" size={24} color={isDark ? '#FFFFFF' : '#111827'} style={{ marginRight: 8 }} />
            <ThemedText style={styles.headerTitle}>Amministrazione</ThemedText>
          </View>
          <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
            Gestisci utenti, arnie e impostazioni
          </ThemedText>
        </View>

        {/* Admin Menu Card */}
        <View style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}>
          {/* 1. Utenti */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('users')}>
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people" size={22} color="#2563EB" />
            </View>
            <View style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemTitle}>Utenti</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary }]}>
                Gestisci utenti e permessi
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 2. Arnie */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/arnie' as any)}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="home" size={22} color="#EA580C" />
            </View>
            <View style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemTitle}>Arnie</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary }]}>
                Gestisci arnie e dispositivi
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 3. Impostazioni sistema */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('system')}>
            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="settings" size={22} color="#7C3AED" />
            </View>
            <View style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemTitle}>Impostazioni sistema</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary }]}>
                Configura parametri generali
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 4. Registro attività */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('logs')}>
            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="clipboard" size={22} color="#16A34A" />
            </View>
            <View style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemTitle}>Registro attività</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary }]}>
                Visualizza log e attività
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* 5. Backup e dati */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('backup')}>
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="cloud-download" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuItemContent}>
              <ThemedText style={styles.menuItemTitle}>Backup e dati</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary }]}>
                Gestisci backup e esportazioni
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: UTENTI LIST */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'users'}
        onRequestClose={() => setActiveModal(null)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Utenti</ThemedText>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => setActiveModal('new_user')}>
              <ThemedText style={styles.newButtonText}>+ Nuovo utente</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="Cerca utente..."
                placeholderTextColor="#9CA3AF"
                value={searchUserQuery}
                onChangeText={setSearchUserQuery}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}>
              {filteredUsers.map((u, index) => {
                const avatarBg =
                  u.role === 'Amministratore'
                    ? '#DBEAFE'
                    : u.active
                    ? '#DCFCE7'
                    : '#F3F4F6';
                const avatarColor =
                  u.role === 'Amministratore'
                    ? '#2563EB'
                    : u.active
                    ? '#16A34A'
                    : '#6B7280';

                return (
                  <React.Fragment key={u.id}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                    <TouchableOpacity
                      style={styles.userListItem}
                      onPress={() => {
                        setSelectedUser(u);
                        setActiveModal('user_detail');
                      }}>
                      <View style={[styles.userAvatar, { backgroundColor: avatarBg }]}>
                        <ThemedText style={[styles.userAvatarText, { color: avatarColor }]}>
                          {u.initials}
                        </ThemedText>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText style={styles.userName}>{u.name}</ThemedText>
                        <ThemedText style={[styles.userEmail, { color: textSecondary }]}>
                          {u.email}
                        </ThemedText>
                        <View style={styles.tagsRow}>
                          <View style={styles.roleTag}>
                            <ThemedText style={styles.roleTagText}>{u.role}</ThemedText>
                          </View>
                          <View
                            style={[
                              styles.statusTag,
                              { backgroundColor: u.active ? '#DCFCE7' : '#F3F4F6' },
                            ]}>
                            <ThemedText
                              style={[
                                styles.statusTagText,
                                { color: u.active ? '#16A34A' : '#6B7280' },
                              ]}>
                              {u.active ? 'Attivo' : 'Disattivo'}
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: DETTAGLI UTENTE */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'user_detail'}
        onRequestClose={() => setActiveModal('users')}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('users')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Dettagli utente</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          {selectedUser && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Profile Card */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.detailAvatarRow}>
                  <View style={[styles.largeUserAvatar, { backgroundColor: '#DBEAFE' }]}>
                    <ThemedText style={styles.largeUserAvatarText}>
                      {selectedUser.initials}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={styles.detailName}>{selectedUser.name}</ThemedText>
                    <ThemedText style={[styles.detailEmail, { color: textSecondary }]}>
                      {selectedUser.email}
                    </ThemedText>
                    <View style={styles.onlineDotRow}>
                      <View
                        style={[
                          styles.statusCircle,
                          { backgroundColor: selectedUser.active ? '#16A34A' : '#9CA3AF' },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.statusLabel,
                          { color: selectedUser.active ? '#16A34A' : '#6B7280' },
                        ]}>
                        {selectedUser.active ? 'Attivo' : 'Disattivo'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Attributes Card */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor, marginTop: 16 }]}>
                <ThemedText style={styles.sectionLabel}>Ruolo</ThemedText>
                <ThemedText style={styles.roleValueText}>{selectedUser.role}</ThemedText>

                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                <ThemedText style={styles.sectionLabel}>Data di creazione</ThemedText>
                <ThemedText style={styles.infoValueText}>{selectedUser.createdAt}</ThemedText>

                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                <ThemedText style={styles.sectionLabel}>Ultimo accesso</ThemedText>
                <ThemedText style={styles.infoValueText}>{selectedUser.lastAccess}</ThemedText>

                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                <View style={styles.switchRow}>
                  <ThemedText style={styles.sectionLabel}>Stato account</ThemedText>
                  <Switch
                    value={selectedUser.active}
                    onValueChange={() => handleToggleUserStatus(selectedUser.id)}
                    trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={{ marginTop: 24, gap: 12 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resetBtn]}
                  onPress={() => {
                    if (Platform.OS === 'web') alert('Email di reimpostazione password inviata!');
                    else Alert.alert('Successo', 'Email di reimpostazione password inviata!');
                  }}>
                  <Ionicons name="refresh-outline" size={18} color="#2563EB" />
                  <ThemedText style={styles.resetBtnText}>Reimposta password</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.disableBtn]}
                  onPress={() => handleToggleUserStatus(selectedUser.id)}>
                  <Ionicons name="warning-outline" size={18} color="#D97706" />
                  <ThemedText style={styles.disableBtnText}>
                    {selectedUser.active ? 'Disabilita utente' : 'Abilita utente'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => handleDeleteUser(selectedUser.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <ThemedText style={styles.deleteActionBtnText}>Elimina utente</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: NUOVO UTENTE */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'new_user'}
        onRequestClose={() => setActiveModal('users')}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('users')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Nuovo utente</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.formLabel}>Nome completo</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Inserisci nome completo"
                placeholderTextColor="#9CA3AF"
                value={newUserName}
                onChangeText={setNewUserName}
              />

              <ThemedText style={styles.formLabel}>Email</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="nome@azienda.it"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
              />

              <ThemedText style={styles.formLabel}>Ruolo</ThemedText>
              <View style={styles.rolePickerRow}>
                {(['Amministratore', 'Operatore', 'Visualizzatore'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      newUserRole === r && styles.roleChipActive,
                    ]}
                    onPress={() => setNewUserRole(r)}>
                    <ThemedText
                      style={[
                        styles.roleChipText,
                        newUserRole === r && styles.roleChipTextActive,
                      ]}>
                      {r}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <ThemedText style={styles.formLabel}>Utente attivo</ThemedText>
                <Switch
                  value={newUserActive}
                  onValueChange={setNewUserActive}
                  trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                />
              </View>
            </View>

            <View style={styles.modalFooterButtons}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelFooterBtn]}
                onPress={() => setActiveModal('users')}>
                <ThemedText style={styles.cancelFooterBtnText}>Annulla</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerBtn, styles.createFooterBtn]}
                onPress={handleCreateUser}>
                <ThemedText style={styles.createFooterBtnText}>Crea utente</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: IMPOSTAZIONI SISTEMA */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'system'}
        onRequestClose={() => setActiveModal(null)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Impostazioni sistema</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.settingTitle}>Soglie di Allarme</ThemedText>

              <ThemedText style={styles.formLabel}>Temperatura Minima (°C)</ThemedText>
              <TextInput style={[styles.formInput, { borderColor }]} defaultValue="20.0" keyboardType="numeric" />

              <ThemedText style={styles.formLabel}>Temperatura Massima (°C)</ThemedText>
              <TextInput style={[styles.formInput, { borderColor }]} defaultValue="38.0" keyboardType="numeric" />

              <ThemedText style={styles.formLabel}>Calo Peso Attenzione (kg/24h)</ThemedText>
              <TextInput style={[styles.formInput, { borderColor }]} defaultValue="2.5" keyboardType="numeric" />
            </View>

            <TouchableOpacity
              style={[styles.createFooterBtn, { marginTop: 16, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => {
                if (Platform.OS === 'web') alert('Impostazioni salvate con successo!');
                else Alert.alert('Successo', 'Impostazioni salvate con successo!');
                setActiveModal(null);
              }}>
              <ThemedText style={styles.createFooterBtnText}>Salva Impostazioni</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: REGISTRO ATTIVITÀ & LOGS */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'logs'}
        onRequestClose={() => setActiveModal(null)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Registro attività</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {[
              { time: 'Oggi, 14:10', event: 'Accesso utente Marco Rossi', tag: 'Auth' },
              { time: 'Oggi, 13:55', event: 'Allarme peso su Arnia Beta inviato via webhook', tag: 'Allarmi' },
              { time: 'Ieri, 18:20', event: 'Sincronizzazione dati nodi IoT completata', tag: 'Sync' },
              { time: 'Ieri, 11:45', event: 'Modifica configurazione da Admin', tag: 'Config' },
            ].map((log, i) => (
              <View key={i} style={[styles.detailCard, { backgroundColor: cardBg, borderColor, padding: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <ThemedText style={{ fontSize: 12, color: textSecondary }}>{log.time}</ThemedText>
                  <View style={styles.roleTag}>
                    <ThemedText style={styles.roleTagText}>{log.tag}</ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 14, fontWeight: '500' }}>{log.event}</ThemedText>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: BACKUP E DATI */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'backup'}
        onRequestClose={() => setActiveModal(null)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Backup e dati</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.settingTitle}>Esportazione Dati Telemetria</ThemedText>
              <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary, marginBottom: 16 }]}>
                Scarica i dati storici dei sensori in formato CSV o JSON.
              </ThemedText>

              <TouchableOpacity
                style={[styles.actionBtn, styles.resetBtn, { marginBottom: 10 }]}
                onPress={() => {
                  if (Platform.OS === 'web') alert('Download esportazione CSV avviato!');
                  else Alert.alert('Esportazione', 'File CSV generato con successo.');
                }}>
                <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                <ThemedText style={styles.resetBtnText}>Esporta Dati in CSV</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.resetBtn]}
                onPress={() => {
                  if (Platform.OS === 'web') alert('Backup JSON completato!');
                  else Alert.alert('Backup', 'Database esportato con successo.');
                }}>
                <Ionicons name="code-download-outline" size={18} color="#2563EB" />
                <ThemedText style={styles.resetBtnText}>Backup Completo JSON</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    paddingTop: 16,
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 74,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  modalNavTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  newButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  roleTag: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  detailAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeUserAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeUserAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  onlineDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  roleValueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoValueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  resetBtn: {
    borderColor: '#BFDBFE',
    backgroundColor: 'rgba(37,99,235,0.05)',
  },
  resetBtnText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  disableBtn: {
    borderColor: '#FDE68A',
    backgroundColor: 'rgba(245,158,11,0.05)',
  },
  disableBtnText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteActionBtn: {
    borderColor: '#FECACA',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  deleteActionBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(150,150,150,0.15)',
  },
  roleChipActive: {
    backgroundColor: '#2563EB',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#FFF',
  },
  modalFooterButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelFooterBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelFooterBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  createFooterBtn: {
    backgroundColor: '#2563EB',
  },
  createFooterBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
});
