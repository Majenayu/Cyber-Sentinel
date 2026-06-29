import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
  getListCommandsQueryOptions,
  getListCommandsQueryKey,
  useCreateCommand,
  useUpdateCommand,
  useDeleteCommand,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface Command {
  id: string;
  title: string;
  command: string;
  description?: string | null;
  category: string;
}

interface FormData {
  title: string;
  command: string;
  description: string;
  category: string;
}

function CommandCard({
  cmd,
  onEdit,
  onDelete,
}: {
  cmd: Command;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Share.share({ message: cmd.command });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={[
        styles.cmdCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.cmdCardHeader}>
        <View style={styles.cmdTitleRow}>
          <Feather name="terminal" size={13} color={colors.primary} />
          <Text style={[styles.cmdTitle, { color: colors.foreground }]}>{cmd.title}</Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.categoryText, { color: colors.mutedForeground }]}>
              {cmd.category.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cmdActions}>
          <Pressable onPress={handleCopy} hitSlop={8}>
            <Feather
              name={copied ? "check" : "copy"}
              size={15}
              color={copied ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Feather name="edit-2" size={15} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </Pressable>
        </View>
      </View>
      <View
        style={[
          styles.codeBlock,
          { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius },
        ]}
      >
        <Text style={[styles.codeText, { color: colors.primary }]}>{cmd.command}</Text>
      </View>
      {cmd.description && (
        <Text style={[styles.cmdDesc, { color: colors.mutedForeground }]}>{cmd.description}</Text>
      )}
    </View>
  );
}

export default function CommandsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCmd, setEditingCmd] = useState<Command | null>(null);
  const [form, setForm] = useState<FormData>({ title: "", command: "", description: "", category: "" });
  const [isSaving, setIsSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  const { data: commands = [], isLoading } = useQuery(getListCommandsQueryOptions());

  const createCommand = useCreateCommand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommandsQueryKey() });
        setShowForm(false);
      },
    },
  });

  const updateCommand = useUpdateCommand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommandsQueryKey() });
        setShowForm(false);
      },
    },
  });

  const deleteCommand = useDeleteCommand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommandsQueryKey() });
      },
    },
  });

  const categories = useMemo(
    () => Array.from(new Set((commands as Command[]).map((c) => c.category))).sort(),
    [commands]
  );

  const filtered = useMemo(() => {
    return (commands as Command[]).filter((c) => {
      const matchSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.command.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCategory = !activeCategory || c.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [commands, search, activeCategory]);

  const openCreate = () => {
    setEditingCmd(null);
    setForm({ title: "", command: "", description: "", category: "" });
    setShowForm(true);
  };

  const openEdit = (cmd: Command) => {
    setEditingCmd(cmd);
    setForm({
      title: cmd.title,
      command: cmd.command,
      description: cmd.description ?? "",
      category: cmd.category,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.command.trim()) return;
    const payload = {
      title: form.title.trim(),
      command: form.command.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || "uncategorized",
    };
    setIsSaving(true);
    if (editingCmd) {
      updateCommand.mutate(
        { id: editingCmd.id, data: payload },
        { onSettled: () => setIsSaving(false) }
      );
    } else {
      createCommand.mutate(
        { data: payload },
        { onSettled: () => setIsSaving(false) }
      );
    }
  };

  const handleDelete = (cmd: Command) => {
    Alert.alert("Delete Command", `Delete "${cmd.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteCommand.mutate({ id: cmd.id }),
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
            <Feather name="code" size={20} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Commands
            </Text>
            <Text style={[styles.countBadge, { color: colors.mutedForeground }]}>
              ({filtered.length})
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
            placeholder="Filter commands..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <Pressable
              onPress={() => setActiveCategory(null)}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: !activeCategory ? colors.primary : colors.muted,
                  borderColor: !activeCategory ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: !activeCategory ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat === activeCategory ? null : cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: cat === activeCategory ? colors.primary : colors.muted,
                    borderColor: cat === activeCategory ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: cat === activeCategory ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="code" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No commands found.
          </Text>
          <Pressable
            onPress={openCreate}
            style={[styles.emptyBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>
              Add command
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommandCard
              cmd={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border, paddingTop: insets.top + 12 },
            ]}
          >
            <Pressable onPress={() => setShowForm(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingCmd ? "Edit Command" : "New Command"}
            </Text>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !form.title.trim() || !form.command.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather
                  name="save"
                  size={20}
                  color={form.title.trim() && form.command.trim() ? colors.primary : colors.border}
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
              value={form.category}
              onChangeText={(t) => setForm({ ...form, category: t })}
              placeholder="Category"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.formInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <TextInput
              value={form.command}
              onChangeText={(t) => setForm({ ...form, command: t })}
              placeholder="Command"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.formTextarea,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary, borderRadius: colors.radius, fontFamily: "Inter_400Regular" },
              ]}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              placeholder="Description (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.formInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
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
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  countBadge: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
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
  categoriesScroll: {
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  categoryPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
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
  cmdCard: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cmdCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cmdTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  cmdTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  categoryBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  cmdActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  codeBlock: {
    borderWidth: 1,
    padding: 10,
  },
  codeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  cmdDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
    fontSize: 13,
    minHeight: 100,
  },
});
