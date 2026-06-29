import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
// @ts-ignore
import { getListToolsQueryOptions } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  officialUrl?: string | null;
}

function ToolCard({ tool }: { tool: Tool }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/tool-detail/${tool.slug}` as any)}
      style={({ pressed }) => [
        styles.toolCard,
        {
          backgroundColor: pressed ? colors.secondary : colors.card,
          borderColor: pressed ? colors.primary : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.toolCardTop}>
        <Feather name="terminal" size={18} color={colors.mutedForeground} />
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.categoryText, { color: colors.mutedForeground }]}>
            {tool.category.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.toolName, { color: colors.foreground }]}>
        {tool.name}
      </Text>
      <Text
        style={[styles.toolDescription, { color: colors.mutedForeground }]}
        numberOfLines={2}
      >
        {tool.description}
      </Text>
      <View style={[styles.toolCardFooter, { borderTopColor: colors.border }]}>
        <Feather name="book-open" size={12} color={colors.primary} />
        <Text style={[styles.cheatsheetLabel, { color: colors.primary }]}>
          View Cheatsheet
        </Text>
      </View>
    </Pressable>
  );
}

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  const { data: tools = [], isLoading } = useQuery(getListToolsQueryOptions());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Feather name="tool" size={20} color={colors.primary} />
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            sys.tools
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Registry of verified pentesting tools.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Querying registry...
          </Text>
        </View>
      ) : (tools as Tool[]).length === 0 ? (
        <View style={styles.center}>
          <Feather name="tool" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No tools found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tools as Tool[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ToolCard tool={item} />}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: bottomPad,
          }}
          showsVerticalScrollIndicator={false}
          numColumns={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  toolCard: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  toolCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  toolName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  toolDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  toolCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
  },
  cheatsheetLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
