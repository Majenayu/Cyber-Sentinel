import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// @ts-ignore
import { getGetStatsQueryOptions } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: FeatherIconName }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={22} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, error } = useQuery(getGetStatsQueryOptions());

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: bottomPad + 100,
        paddingHorizontal: 16,
      }}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.heading, { color: colors.primary }]}>
            {">"} CYBERSENTINEL
          </Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Security Operations Center
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings" as any)}
          style={({ pressed }) => [
            styles.gearBtn,
            { borderColor: pressed ? colors.primary : colors.border, borderRadius: colors.radius },
          ]}
        >
          <Feather name="settings" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={[styles.errorBox, { borderColor: colors.destructive }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            Failed to load stats
          </Text>
        </View>
      )}

      {stats && (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="Knowledge Entries" value={stats.totalKnowledgeEntries} icon="book" />
            <StatCard label="Chat Sessions" value={stats.totalChatSessions} icon="message-circle" />
            <StatCard label="Commands" value={stats.totalCommands} icon="terminal" />
            <StatCard label="Tools" value={stats.totalTools} icon="tool" />
          </View>

          {stats.recentTags.length > 0 && (
            <View style={[styles.tagsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recent Tags
              </Text>
              <View style={styles.tagsRow}>
                {stats.recentTags.map((tag: string) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <View style={[styles.statusBar, { borderColor: colors.border }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
          System operational — all services online
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  gearBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
  },
  centered: { flex: 1, alignItems: "center", paddingTop: 40 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  tagsSection: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
