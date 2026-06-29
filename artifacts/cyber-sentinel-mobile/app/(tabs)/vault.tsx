import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
// @ts-ignore
import {
  getListKnowledgeQueryOptions,
  getListKnowledgeQueryKey,
  useCreateKnowledge,
  useUpdateKnowledge,
  useDeleteKnowledge,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string | null;
}

interface FormData {
  title: string;
  content: string;
  tags: string;
  source: string;
}

function EntryCard({
  entry,
  onPress,
}: {
  entry: KnowledgeEntry;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.entryCard,
        {
          backgroundColor: pressed ? colors.secondary : colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Text style={[styles.entryTitle, { color: colors.foreground }]} numberOfLines={2}>
        {entry.title}
      </Text>
      {entry.tags.length > 0 && (
        <View style={styles.tagRow}>
          {entry.tags.slice(0, 4).map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Feather
        name="chevron-right"
        size={16}
        color={colors.mutedForeground}
        style={styles.cardArrow}
      />
    </Pressable>
  );
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [form, setForm] = useState<FormData>({ title: "", content: "", tags: "", source: "" });
  const [isSaving, setIsSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  const { data: entries = [], isLoading } = useQuery(
    getListKnowledgeQueryOptions(search.length > 2 ? { q: search } : undefined)
  );

  const createEntry = useCreateKnowledge({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKnowledgeQueryKey() });
        setShowForm(false);
      },
    },
  });

  const updateEntry = useUpdateKnowledge({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKnowledgeQueryKey() });
        setShowForm(false);
        setSelectedEntry(null);
      },
    },
  });

  const deleteEntry = useDeleteKnowledge({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKnowledgeQueryKey() });
        setSelectedEntry(null);
      },
    },
  });

  const openCreate = () => {
    setEditingEntry(null);
    setForm({ title: "", content: "", tags: "", source: "" });
    setShowForm(true);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      content: entry.content,
      tags: entry.tags.join(", "),
      source: entry.source ?? "",
    });
    setSelectedEntry(null);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      source: form.source.trim() || null,
    };
    setIsSaving(true);
    if (editingEntry) {
      updateEntry.mutate(
        { id: editingEntry.id, data: payload },
        { onSettled: () => setIsSaving(false) }
      );
    } else {
      createEntry.mutate(
        { data: payload },
        { onSettled: () => setIsSaving(false) }
      );
    }
  };

  const handleDelete = (entry: KnowledgeEntry) => {
    Alert.alert("Delete Entry", `Delete "${entry.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteEntry.mutate({ id: entry.id }),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Feather name="database" size={20} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Knowledge Vault
            </Text>
          </View>
          <Pressable
            onPress={openCreate}
            style={[styles.addBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Feather name="plus" size={18} color={colors.primary} />
          </Pressable>
        </View>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search database..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (entries as KnowledgeEntry[]).length === 0 ? (
        <View style={styles.center}>
          <Feather name="database" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No records found.
          </Text>
          <Pressable
            onPress={openCreate}
            style={[styles.emptyBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>
              Add first entry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={entries as KnowledgeEntry[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard entry={item} onPress={() => setSelectedEntry(item)} />
          )}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!selectedEntry}
        animationType="slide"
        onRequestClose={() => setSelectedEntry(null)}
      >
        {selectedEntry && (
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
              <Pressable onPress={() => setSelectedEntry(null)}>
                <Feather name="arrow-left" size={22} color={colors.primary} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>
                {selectedEntry.title}
              </Text>
              <View style={styles.modalActions}>
                <Pressable onPress={() => openEdit(selectedEntry)}>
                  <Feather name="edit-2" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => handleDelete(selectedEntry)}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 30 }}
            >
              {selectedEntry.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {selectedEntry.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
                    >
                      <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[styles.contentText, { color: colors.foreground }]}>
                {selectedEntry.content}
              </Text>
              {selectedEntry.source && (
                <Text style={[styles.sourceText, { color: colors.primary }]}>
                  Source: {selectedEntry.source}
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => setShowForm(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingEntry ? "Edit Entry" : "New Entry"}
            </Text>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !form.title.trim() || !form.content.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather
                  name="save"
                  size={20}
                  color={form.title.trim() && form.content.trim() ? colors.primary : colors.border}
                />
              )}
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 30 }}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
              placeholder="Title"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.formInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <TextInput
              value={form.tags}
              onChangeText={(t) => setForm({ ...form, tags: t })}
              placeholder="Tags (comma separated)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.formInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <TextInput
              value={form.source}
              onChangeText={(t) => setForm({ ...form, source: t })}
              placeholder="Source URL (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.formInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              autoCapitalize="none"
            />
            <TextInput
              value={form.content}
              onChangeText={(t) => setForm({ ...form, content: t })}
              placeholder="Content..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.formTextarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  addBtn: {
    padding: 8,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  entryCard: {
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  entryTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  cardArrow: {
    position: "absolute",
    right: 14,
    top: "50%",
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 14,
  },
  contentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  sourceText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  formInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  formTextarea: {
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 200,
    fontFamily: "Inter_400Regular",
  },
});
