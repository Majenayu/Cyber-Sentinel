import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// @ts-ignore
import {
  getListSessionsQueryKey,
  useDeduplicateEntries,
  useDeleteSession,
  useGetSystemStatus,
  useListSessions,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

function StatusRow({ label, value }: { label: string; value: string | undefined }) {
  const colors = useColors();
  const loading = value === undefined;
  const ok = value === "ONLINE" || value === "AES-256 ACTIVE";
  return (
    <View style={[styles.statusRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      ) : (
        <View style={styles.statusRight}>
          <Feather
            name={ok ? "check-circle" : "x-circle"}
            size={13}
            color={ok ? colors.primary : colors.destructive}
          />
          <Text style={[styles.statusValue, { color: ok ? colors.primary : colors.destructive }]}>
            {value}
          </Text>
        </View>
      )}
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof Feather>["name"]; title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
      <Feather name={icon} size={14} color={colors.primary} />
      <Text style={[styles.sectionHeaderText, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [dedupResult, setDedupResult] = useState<{ toolsRemoved: number; commandsRemoved: number } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const { data: systemStatus, isLoading: statusLoading } = useGetSystemStatus();

  const { data: sessions = [] } = useListSessions();

  const deleteSessionMutation = useDeleteSession();

  const deduplicateMutation = useDeduplicateEntries({
    mutation: {
      onSuccess: (data: { toolsRemoved: number; commandsRemoved: number }) => {
        setDedupResult(data);
        setTimeout(() => setDedupResult(null), 6000);
      },
      onError: () => {
        Alert.alert("Error", "Deduplication failed.");
      },
    },
  });

  const clearSessions = () => {
    if ((sessions as Array<{ id: string }>).length === 0) {
      Alert.alert("No Sessions", "There are no chat sessions to clear.");
      return;
    }
    Alert.alert(
      "Clear All Sessions",
      `Delete all ${(sessions as Array<{ id: string }>).length} chat sessions? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const sessionList = sessions as Array<{ id: string }>;
              await Promise.all(sessionList.map((s) => deleteSessionMutation.mutateAsync({ id: s.id })));
              queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
              Alert.alert("Done", "All chat sessions cleared.");
            } catch {
              Alert.alert("Error", "Failed to clear some sessions.");
            }
          },
        },
      ]
    );
  };

  const runDeduplicate = () => {
    deduplicateMutation.mutate();
  };

  const isClearing = deleteSessionMutation.isPending;
  const isDeduping = deduplicateMutation.isPending;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={colors.primary} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>sys.settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Configuration and diagnostics
          </Text>
        </View>
      </View>

      {/* System Status */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader icon="activity" title="SYSTEM STATUS" />
        {statusLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            <StatusRow label="Core Database (MongoDB)" value={systemStatus?.database} />
            <StatusRow label="AI Module (Groq)" value={systemStatus?.ai} />
            <StatusRow label="Encryption" value={systemStatus?.encryption} />
          </>
        )}
      </View>

      {/* Maintenance */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader icon="tool" title="MAINTENANCE" />

        <View style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>Clear Chat Sessions</Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
              {(sessions as Array<{ id: string }>).length} sessions stored
            </Text>
          </View>
          <Pressable
            onPress={clearSessions}
            disabled={isClearing}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: pressed ? colors.destructive + "30" : "transparent",
                borderColor: colors.destructive,
                borderRadius: colors.radius,
              },
            ]}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Feather name="trash-2" size={16} color={colors.destructive} />
            )}
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>Dedup Tools & Commands</Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
              Remove duplicate entries from registry
            </Text>
            {dedupResult && (
              <Text style={[styles.dedupResult, { color: colors.primary }]}>
                Removed {dedupResult.toolsRemoved} tools, {dedupResult.commandsRemoved} commands
              </Text>
            )}
          </View>
          <Pressable
            onPress={runDeduplicate}
            disabled={isDeduping}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: pressed ? colors.primary + "20" : "transparent",
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {isDeduping ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="layers" size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>
      </View>

      {/* App Info */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader icon="info" title="ABOUT" />
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Application</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>CyberSentinel</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>AI Provider</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>Groq</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: "transparent" }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Database</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>MongoDB</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  loadingRow: {
    padding: 20,
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  actionInfo: { flex: 1, gap: 3 },
  actionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  actionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  dedupResult: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
