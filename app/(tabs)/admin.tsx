import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  loadAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  resetAdminUserPassword,
  loadAdminArnie,
  createAdminArnia,
  deleteAdminArnia,
  loadAdminUserArnie,
  associateAdminUserArnia,
  removeAdminUserArnia,
} from '@/services/fastapi-admin-service';
import type { ArniaConStato, UserResponse, UtenteArniaResponse } from '@/types/api';

type UserRole = 'Amministratore' | 'Operatore';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastAccess: string;
  initials: string;
}

/** Il backend espone solo i ruoli `admin` e `user`. */
function roleFromApi(ruolo: string): UserRole {
  const normalized = (ruolo || '').toLowerCase();
  return normalized === 'admin' || normalized.includes('amministr')
    ? 'Amministratore'
    : 'Operatore';
}

function roleToApi(role: UserRole): 'admin' | 'user' {
  return role === 'Amministratore' ? 'admin' : 'user';
}

function formatDate(value: string | null): string {
  if (!value) return 'Mai';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function mapUser(data: UserResponse): User {
  const name = `${data.nome} ${data.cognome}`.trim();
  return {
    id: data.id_utente,
    name,
    email: data.email,
    role: roleFromApi(data.ruolo),
    active: data.attivo,
    createdAt: formatDate(data.data_creazione),
    lastAccess: formatDate(data.ultimo_accesso),
    initials: buildInitials(name),
  };
}

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Active sub-modal view
  const [activeModal, setActiveModal] = useState<
    | 'users'
    | 'user_detail'
    | 'new_user'
    | 'arnie'
    | 'arnia_detail'
    | 'new_arnia'
    | 'associate_user'
    | 'system'
    | 'logs'
    | null
  >(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Operatore');
  const [newUserActive, setNewUserActive] = useState(true);

  // Reset password state
  const [resetPassword, setResetPassword] = useState('');

  // Arnie state
  const [arnie, setArnie] = useState<ArniaConStato[]>([]);
  const [associations, setAssociations] = useState<UtenteArniaResponse[]>([]);
  const [arnieLoading, setArnieLoading] = useState(false);
  const [arnieRefreshing, setArnieRefreshing] = useState(false);
  const [arnieError, setArnieError] = useState<string | null>(null);
  const [searchArniaQuery, setSearchArniaQuery] = useState('');
  const [selectedArnia, setSelectedArnia] = useState<ArniaConStato | null>(null);
  const [associateSearch, setAssociateSearch] = useState('');

  // New arnia form state
  const [newArniaNome, setNewArniaNome] = useState('');
  const [newArniaNodo, setNewArniaNodo] = useState('');
  const [newArniaSensore, setNewArniaSensore] = useState('');
  const [newArniaPosizione, setNewArniaPosizione] = useState('');
  const [newArniaDescrizione, setNewArniaDescrizione] = useState('');

  const loadArnie = useCallback(async () => {
    setArnieLoading(true);
    setArnieError(null);
    const [arnieResult, assocResult] = await Promise.all([
      loadAdminArnie(),
      loadAdminUserArnie(),
    ]);

    if (arnieResult.success && arnieResult.data) {
      setArnie(arnieResult.data);
    } else {
      setArnie([]);
      setArnieError(arnieResult.error || 'Impossibile caricare le arnie');
    }

    if (assocResult.success && assocResult.data) {
      setAssociations(assocResult.data);
    } else {
      setAssociations([]);
    }

    setArnieLoading(false);
  }, []);

  useEffect(() => {
    if (activeModal === 'arnie') {
      loadArnie();
    }
  }, [activeModal, loadArnie]);

  const onRefreshArnie = useCallback(async () => {
    setArnieRefreshing(true);
    await loadArnie();
    setArnieRefreshing(false);
  }, [loadArnie]);

  const filteredArnie = arnie.filter((a) => {
    const query = searchArniaQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (a.nome_arnia ?? '').toLowerCase().includes(query) ||
      a.id_nodo.toLowerCase().includes(query) ||
      (a.posizione ?? '').toLowerCase().includes(query)
    );
  });

  const getUserById = useCallback(
    (id: number) => users.find((u) => u.id === id),
    [users]
  );

  const associatedUsers = selectedArnia
    ? associations
        .filter((a) => a.id_arnia === selectedArnia.id_arnia)
        .map((a) => ({ association: a, user: getUserById(a.id_utente) }))
    : [];

  const availableUsers = selectedArnia
    ? users.filter(
        (u) =>
          !associations.some(
            (a) => a.id_arnia === selectedArnia.id_arnia && a.id_utente === u.id
          )
      )
    : [];

  const filteredAvailableUsers = availableUsers.filter((u) => {
    const query = associateSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  const handleCreateArnia = async () => {
    const idNodo = newArniaNodo.trim();
    const idSensore = newArniaSensore.trim();

    if (!idNodo || !idSensore) {
      showAlert('Errore', 'Inserisci ID nodo e ID sensore');
      return;
    }

    const result = await createAdminArnia({
      id_nodo: idNodo,
      id_sensore_fisico: idSensore,
      nome_arnia: newArniaNome.trim() || null,
      descrizione: newArniaDescrizione.trim() || null,
      posizione: newArniaPosizione.trim() || null,
    });

    if (!result.success) {
      showAlert('Errore', result.error || "Errore nella creazione dell'arnia");
      return;
    }

    setNewArniaNome('');
    setNewArniaNodo('');
    setNewArniaSensore('');
    setNewArniaPosizione('');
    setNewArniaDescrizione('');
    await loadArnie();
    setActiveModal('arnie');
  };

  const handleDeleteArnia = (arnia: ArniaConStato) => {
    const doDelete = async () => {
      const result = await deleteAdminArnia(arnia.id_arnia);
      if (!result.success) {
        showAlert('Errore', result.error || "Errore nella disattivazione dell'arnia");
        return;
      }
      setSelectedArnia(null);
      await loadArnie();
      setActiveModal('arnie');
    };

    const message = `Vuoi disattivare l'arnia "${arnia.nome_arnia || arnia.id_nodo}"?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doDelete();
    } else {
      Alert.alert('Disattiva Arnia', message, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Disattiva', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleAssociateUser = async (userId: number) => {
    if (!selectedArnia) return;

    const result = await associateAdminUserArnia({
      id_utente: userId,
      id_arnia: selectedArnia.id_arnia,
    });

    if (!result.success) {
      showAlert('Errore', result.error || "Errore nell'associazione");
      return;
    }

    setAssociateSearch('');
    await loadArnie();
    setActiveModal('arnia_detail');
  };

  const handleRemoveAssociation = (userId: number) => {
    if (!selectedArnia) return;
    const arniaId = selectedArnia.id_arnia;

    const doRemove = async () => {
      const result = await removeAdminUserArnia(userId, arniaId);
      if (!result.success) {
        showAlert('Errore', result.error || "Errore nella rimozione dell'associazione");
        return;
      }
      await loadArnie();
    };

    const user = getUserById(userId);
    const message = `Rimuovere l'associazione con ${user?.name || `utente ${userId}`}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doRemove();
    } else {
      Alert.alert('Rimuovi associazione', message, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Rimuovi', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const result = await loadAdminUsers();
    if (result.success && result.data) {
      setUsers(result.data.map(mapUser));
    } else {
      setUsers([]);
      setUsersError(result.error || 'Impossibile caricare gli utenti');
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefreshUsers = useCallback(async () => {
    setUsersRefreshing(true);
    await loadUsers();
    setUsersRefreshing(false);
  }, [loadUsers]);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    return (
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
    );
  });

  const handleCreateUser = async () => {
    const name = newUserName.trim();
    const email = newUserEmail.trim();

    if (!name || !email) {
      showAlert('Errore', 'Inserisci nome ed email');
      return;
    }
    if (newUserPassword.length < 8) {
      showAlert('Errore', 'La password deve contenere almeno 8 caratteri');
      return;
    }

    const parts = name.split(/\s+/);
    const nome = parts[0];
    const cognome = parts.slice(1).join(' ');

    const result = await createAdminUser({
      email,
      nome,
      cognome,
      password: newUserPassword,
      ruolo: roleToApi(newUserRole),
    });

    if (!result.success) {
      showAlert('Errore', result.error || "Errore nella creazione dell'utente");
      return;
    }

    if (!newUserActive && result.data) {
      await updateAdminUser(result.data.id_utente, { attivo: false });
    }

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('Operatore');
    setNewUserActive(true);
    await loadUsers();
    setActiveModal('users');
  };

  const handleToggleUserStatus = async (userId: number) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const result = await updateAdminUser(userId, { attivo: !target.active });

    if (!result.success || !result.data) {
      showAlert('Errore', result.error || "Errore nell'aggiornamento dell'utente");
      return;
    }

    const updated = mapUser(result.data);
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    setSelectedUser((prev) => (prev && prev.id === userId ? updated : prev));
  };

  const handleDeleteUser = (userId: number) => {
    const doDelete = async () => {
      const result = await deleteAdminUser(userId);
      if (!result.success) {
        showAlert('Errore', result.error || "Errore nell'eliminazione dell'utente");
        return;
      }
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

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (resetPassword.length < 8) {
      showAlert('Errore', 'La password deve contenere almeno 8 caratteri');
      return;
    }

    const result = await resetAdminUserPassword(selectedUser.id, resetPassword);

    if (!result.success) {
      showAlert('Errore', result.error || 'Errore nella reimpostazione della password');
      return;
    }

    setResetPassword('');
    showAlert('Successo', 'Password reimpostata con successo');
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
            onPress={() => setActiveModal('arnie')}>
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

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={usersRefreshing}
                onRefresh={onRefreshUsers}
                tintColor="#2563EB"
              />
            }>
            {usersLoading && users.length === 0 ? (
              <ActivityIndicator style={{ marginTop: 32 }} color="#2563EB" />
            ) : usersError ? (
              <View
                style={[
                  styles.menuCard,
                  styles.emptyState,
                  { backgroundColor: cardBg, borderColor },
                ]}>
                <Ionicons name="cloud-offline-outline" size={28} color="#9CA3AF" />
                <ThemedText style={[styles.userEmail, { color: textSecondary, marginTop: 8, textAlign: 'center' }]}>
                  {usersError}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.newButton, { marginTop: 12 }]}
                  onPress={loadUsers}>
                  <ThemedText style={styles.newButtonText}>Riprova</ThemedText>
                </TouchableOpacity>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View
                style={[
                  styles.menuCard,
                  styles.emptyState,
                  { backgroundColor: cardBg, borderColor },
                ]}>
                <Ionicons name="people-outline" size={28} color="#9CA3AF" />
                <ThemedText style={[styles.userEmail, { color: textSecondary, marginTop: 8 }]}>
                  {searchUserQuery.trim() ? 'Nessun utente trovato' : 'Nessun utente disponibile'}
                </ThemedText>
              </View>
            ) : (
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
            )}
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

              {/* Reset password */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor, marginTop: 16 }]}>
                <ThemedText style={styles.sectionLabel}>Reimposta password</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor, marginTop: 8 }]}
                  placeholder="Nuova password (min. 8 caratteri)"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  value={resetPassword}
                  onChangeText={setResetPassword}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, styles.resetBtn, { marginTop: 4 }]}
                  onPress={handleResetPassword}>
                  <Ionicons name="key-outline" size={18} color="#2563EB" />
                  <ThemedText style={styles.resetBtnText}>Imposta nuova password</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={{ marginTop: 24, gap: 12 }}>
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

              <ThemedText style={styles.formLabel}>Password</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Minimo 8 caratteri"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                value={newUserPassword}
                onChangeText={setNewUserPassword}
              />

              <ThemedText style={styles.formLabel}>Ruolo</ThemedText>
              <View style={styles.rolePickerRow}>
                {(['Amministratore', 'Operatore'] as const).map((r) => (
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
      {/* MODAL 7: ARNIE LIST */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'arnie'}
        onRequestClose={() => setActiveModal(null)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Arnie</ThemedText>
            <TouchableOpacity style={styles.newButton} onPress={() => setActiveModal('new_arnia')}>
              <ThemedText style={styles.newButtonText}>+ Nuova arnia</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="Cerca arnia per nome, nodo o posizione..."
                placeholderTextColor="#9CA3AF"
                value={searchArniaQuery}
                onChangeText={setSearchArniaQuery}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={arnieRefreshing}
                onRefresh={onRefreshArnie}
                tintColor="#2563EB"
              />
            }>
            {arnieLoading && arnie.length === 0 ? (
              <ActivityIndicator style={{ marginTop: 32 }} color="#2563EB" />
            ) : arnieError ? (
              <View
                style={[
                  styles.menuCard,
                  styles.emptyState,
                  { backgroundColor: cardBg, borderColor },
                ]}>
                <Ionicons name="cloud-offline-outline" size={28} color="#9CA3AF" />
                <ThemedText style={[styles.userEmail, { color: textSecondary, marginTop: 8, textAlign: 'center' }]}>
                  {arnieError}
                </ThemedText>
                <TouchableOpacity style={[styles.newButton, { marginTop: 12 }]} onPress={loadArnie}>
                  <ThemedText style={styles.newButtonText}>Riprova</ThemedText>
                </TouchableOpacity>
              </View>
            ) : filteredArnie.length === 0 ? (
              <View
                style={[
                  styles.menuCard,
                  styles.emptyState,
                  { backgroundColor: cardBg, borderColor },
                ]}>
                <Ionicons name="home-outline" size={28} color="#9CA3AF" />
                <ThemedText style={[styles.userEmail, { color: textSecondary, marginTop: 8 }]}>
                  {searchArniaQuery.trim() ? 'Nessuna arnia trovata' : 'Nessuna arnia disponibile'}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}>
                {filteredArnie.map((a, index) => {
                  const count = associations.filter((x) => x.id_arnia === a.id_arnia).length;
                  return (
                    <React.Fragment key={a.id_arnia}>
                      {index > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                      <TouchableOpacity
                        style={styles.userListItem}
                        onPress={() => {
                          setSelectedArnia(a);
                          setActiveModal('arnia_detail');
                        }}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: a.attiva ? '#FFF7ED' : '#F3F4F6', marginRight: 12 },
                          ]}>
                          <Ionicons name="home" size={20} color={a.attiva ? '#EA580C' : '#9CA3AF'} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.userName}>
                            {a.nome_arnia || `Arnia ${a.id_arnia}`}
                          </ThemedText>
                          <ThemedText style={[styles.userEmail, { color: textSecondary }]}>
                            Nodo: {a.id_nodo}
                          </ThemedText>
                          {a.posizione ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Ionicons name="location-outline" size={12} color={textSecondary} />
                              <ThemedText style={[styles.userEmail, { color: textSecondary, marginLeft: 3 }]}>
                                {a.posizione}
                              </ThemedText>
                            </View>
                          ) : null}
                          <View style={styles.tagsRow}>
                            <View style={styles.roleTag}>
                              <ThemedText style={styles.roleTagText}>
                                {count} {count === 1 ? 'utente' : 'utenti'}
                              </ThemedText>
                            </View>
                            {!a.attiva && (
                              <View style={[styles.statusTag, { backgroundColor: '#F3F4F6' }]}>
                                <ThemedText style={[styles.statusTagText, { color: '#6B7280' }]}>
                                  Disattiva
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 8: DETTAGLI ARNIA */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'arnia_detail'}
        onRequestClose={() => setActiveModal('arnie')}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('arnie')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Dettagli arnia</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          {selectedArnia && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Profile Card */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.detailAvatarRow}>
                  <View style={[styles.largeUserAvatar, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="home" size={26} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={styles.detailName}>
                      {selectedArnia.nome_arnia || `Arnia ${selectedArnia.id_arnia}`}
                    </ThemedText>
                    <ThemedText style={[styles.detailEmail, { color: textSecondary }]}>
                      Nodo: {selectedArnia.id_nodo}
                    </ThemedText>
                    <View style={styles.onlineDotRow}>
                      <View
                        style={[
                          styles.statusCircle,
                          { backgroundColor: selectedArnia.attiva ? '#16A34A' : '#9CA3AF' },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.statusLabel,
                          { color: selectedArnia.attiva ? '#16A34A' : '#6B7280' },
                        ]}>
                        {selectedArnia.attiva ? 'Attiva' : 'Disattiva'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Attributes Card */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor, marginTop: 16 }]}>
                <ThemedText style={styles.sectionLabel}>Posizione</ThemedText>
                <ThemedText style={styles.infoValueText}>
                  {selectedArnia.posizione || 'Non specificata'}
                </ThemedText>

                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                <ThemedText style={styles.sectionLabel}>Sensore fisico</ThemedText>
                <ThemedText style={styles.infoValueText}>{selectedArnia.id_sensore_fisico}</ThemedText>

                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />

                <ThemedText style={styles.sectionLabel}>Descrizione</ThemedText>
                <ThemedText style={styles.infoValueText}>
                  {selectedArnia.descrizione || 'Nessuna descrizione'}
                </ThemedText>
              </View>

              {/* Associated users */}
              <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor, marginTop: 16 }]}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={styles.settingTitle}>Utenti associati</ThemedText>
                  <TouchableOpacity
                    style={styles.newButton}
                    onPress={() => setActiveModal('associate_user')}>
                    <ThemedText style={styles.newButtonText}>+ Associa</ThemedText>
                  </TouchableOpacity>
                </View>

                {associatedUsers.length === 0 ? (
                  <ThemedText style={[styles.menuItemSubtitle, { color: textSecondary, marginTop: 12 }]}>
                    Nessun utente associato
                  </ThemedText>
                ) : (
                  associatedUsers.map(({ association, user }) => (
                    <View
                      key={association.id}
                      style={[styles.associatedRow, { borderTopColor: dividerColor }]}>
                      <View style={[styles.userAvatar, styles.smallAvatar, { backgroundColor: '#DBEAFE' }]}>
                        <ThemedText style={[styles.userAvatarText, { color: '#2563EB', fontSize: 13 }]}>
                          {user ? user.initials : '?'}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <ThemedText style={styles.userName}>
                          {user ? user.name : `Utente ${association.id_utente}`}
                        </ThemedText>
                        <ThemedText style={[styles.userEmail, { color: textSecondary }]}>
                          {user ? user.email : 'Utente non disponibile'}
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAssociation(association.id_utente)}
                        style={styles.removeBtn}>
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteActionBtn, { marginTop: 24 }]}
                onPress={() => handleDeleteArnia(selectedArnia)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <ThemedText style={styles.deleteActionBtnText}>Disattiva arnia</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 9: NUOVA ARNIA */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'new_arnia'}
        onRequestClose={() => setActiveModal('arnie')}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('arnie')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Nuova arnia</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.formLabel}>Nome arnia</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Es. Arnia Nord"
                placeholderTextColor="#9CA3AF"
                value={newArniaNome}
                onChangeText={setNewArniaNome}
              />

              <ThemedText style={styles.formLabel}>ID nodo *</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Es. NODE-01"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={newArniaNodo}
                onChangeText={setNewArniaNodo}
              />

              <ThemedText style={styles.formLabel}>ID sensore fisico *</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Es. SENSOR-01"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={newArniaSensore}
                onChangeText={setNewArniaSensore}
              />

              <ThemedText style={styles.formLabel}>Posizione</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Es. Fila 2, apiario nord"
                placeholderTextColor="#9CA3AF"
                value={newArniaPosizione}
                onChangeText={setNewArniaPosizione}
              />

              <ThemedText style={styles.formLabel}>Descrizione</ThemedText>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFF' : '#000', borderColor }]}
                placeholder="Note opzionali"
                placeholderTextColor="#9CA3AF"
                value={newArniaDescrizione}
                onChangeText={setNewArniaDescrizione}
              />
            </View>

            <View style={styles.modalFooterButtons}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelFooterBtn]}
                onPress={() => setActiveModal('arnie')}>
                <ThemedText style={styles.cancelFooterBtnText}>Annulla</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerBtn, styles.createFooterBtn]}
                onPress={handleCreateArnia}>
                <ThemedText style={styles.createFooterBtnText}>Crea arnia</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 10: ASSOCIA UTENTE */}
      {/* ========================================================================= */}
      <Modal
        animationType="slide"
        visible={activeModal === 'associate_user'}
        onRequestClose={() => setActiveModal('arnia_detail')}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#111213' : '#F9FAFB' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal('arnia_detail')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#111827'} />
            </TouchableOpacity>
            <ThemedText style={styles.modalNavTitle}>Associa utente</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="Cerca utente..."
                placeholderTextColor="#9CA3AF"
                value={associateSearch}
                onChangeText={setAssociateSearch}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {filteredAvailableUsers.length === 0 ? (
              <View
                style={[
                  styles.menuCard,
                  styles.emptyState,
                  { backgroundColor: cardBg, borderColor },
                ]}>
                <Ionicons name="people-outline" size={28} color="#9CA3AF" />
                <ThemedText style={[styles.userEmail, { color: textSecondary, marginTop: 8 }]}>
                  {associateSearch.trim()
                    ? 'Nessun utente trovato'
                    : 'Tutti gli utenti sono già associati'}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}>
                {filteredAvailableUsers.map((u, index) => (
                  <React.Fragment key={u.id}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                    <TouchableOpacity
                      style={styles.userListItem}
                      onPress={() => handleAssociateUser(u.id)}>
                      <View style={[styles.userAvatar, { backgroundColor: '#DBEAFE' }]}>
                        <ThemedText style={[styles.userAvatarText, { color: '#2563EB' }]}>
                          {u.initials}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText style={styles.userName}>{u.name}</ThemedText>
                        <ThemedText style={[styles.userEmail, { color: textSecondary }]}>
                          {u.email}
                        </ThemedText>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color="#2563EB" />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
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
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  associatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 12,
  },
  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 8,
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
