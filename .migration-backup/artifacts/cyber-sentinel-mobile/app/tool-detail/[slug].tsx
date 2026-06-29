import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { useQuery } from "@tanstack/react-query";
// @ts-ignore
import { getGetToolQueryOptions } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

function renderCheatsheet(content: string, colors: ReturnType<typeof useColors>) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <View
          key={i}
          style={[
            styles.codeBlock,
            { backgroundColor: "#050706", borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.codeText, { color: colors.primary }]}>
            {code.trim()}
          </Text>
        </View>
      );
    }
    const sections = part.split(/(\*\*[\s\S]*?\*\*)/g);
    return (
      <Text key={i} style={[styles.descText, { color: colors.mutedForeground }]}>
        {sections.map((sub, j) => {
          if (sub.startsWith("**") && sub.endsWith("**")) {
            return (
              <Text key={j} style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                {sub.slice(2, -2)}
              </Text>
            );
          }
          return sub;
        })}
      </Text>
    );
  });
}

export default function ToolDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const { data: tool, isLoading } = useQuery(getGetToolQueryOptions(slug ?? ""));

  if (isLoading || !tool) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading module...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: bottomPad,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.toolHeader, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>
            Registry
          </Text>
        </Pressable>

        <View style={styles.toolTitleRow}>
          <Feather name="terminal" size={22} color={colors.primary} />
          <Text style={[styles.toolName, { color: colors.foreground }]}>
            {tool.name}
          </Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.accent, borderColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {tool.category.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.toolDescription, { color: colors.mutedForeground }]}>
          {tool.description}
        </Text>

        {tool.officialUrl && (
          <View style={styles.docsRow}>
            <Feather name="external-link" size={13} color={colors.primary} />
            <Text style={[styles.docsText, { color: colors.primary }]}>
              {tool.officialUrl}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cheatsheetContainer}>
        <View style={[styles.cheatsheetLabel, { borderBottomColor: colors.border }]}>
          <Feather name="book-open" size={15} color={colors.primary} />
          <Text style={[styles.cheatsheetTitle, { color: colors.foreground }]}>
            Cheatsheet / Syntax
          </Text>
        </View>
        <View style={styles.cheatsheetContent}>
          {renderCheatsheet(tool.cheatsheet, colors)}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  toolHeader: {
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  toolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  toolName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    flex: 1,
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
  toolDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  docsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docsText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  cheatsheetContainer: {
    padding: 20,
    gap: 16,
  },
  cheatsheetLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cheatsheetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  cheatsheetContent: {
    gap: 12,
  },
  codeBlock: {
    borderWidth: 1,
    padding: 14,
  },
  codeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  descText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
});
