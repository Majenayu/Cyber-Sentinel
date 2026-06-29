import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
// @ts-ignore — workspace package types not resolved in mobile tsconfig
import {
  getListSessionsQueryOptions,
  getListSessionsQueryKey,
  getListMessagesQueryOptions,
  getListMessagesQueryKey,
  useCreateSession,
  useDeleteSession,
  customFetch,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface Session {
  id: string;
  title: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
}

function SessionPill({
  session,
  isActive,
  onPress,
  onDelete,
}: {
  session: Session;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sessionPill,
        {
          backgroundColor: isActive ? colors.secondary : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather name="terminal" size={12} color={isActive ? colors.primary : colors.mutedForeground} />
      <Text
        style={[
          styles.sessionPillText,
          { color: isActive ? colors.primary : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {session.title}
      </Text>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Feather name="x" size={12} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const colors = useColors();
  const isUser = message.role === "user";
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      <View
        style={[
          styles.msgAvatar,
          {
            backgroundColor: isUser ? colors.secondary : colors.card,
            borderColor: isUser ? colors.border : colors.primary,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Feather
          name={isUser ? "user" : "cpu"}
          size={14}
          color={colors.primary}
        />
      </View>
      <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAI]}>
        <View
          style={[
            styles.msgContent,
            {
              backgroundColor: isUser ? colors.secondary : colors.muted,
              borderColor: isUser ? colors.border : colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.msgText, { color: colors.foreground }]}>
            {message.content}
          </Text>
        </View>
        <Text style={[styles.msgRole, { color: colors.mutedForeground }]}>
          {isUser ? "Operator" : "Sentinel"}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery(getListSessionsQueryOptions());

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    ...getListMessagesQueryOptions(currentSessionId ?? ""),
    enabled: !!currentSessionId,
  });

  const createSession = useCreateSession({
    mutation: {
      onSuccess: (newSession: Session) => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setCurrentSessionId(newSession.id);
      },
    },
  });

  const deleteSession = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        const remaining = (sessions as Session[]).filter(
          (s: Session) => s.id !== currentSessionId
        );
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
      },
    },
  });

  const handleCreateSession = () => {
    const count = (sessions as Session[]).length + 1;
    createSession.mutate({ data: { title: `Session ${count}` } });
  };

  const handleDeleteSession = (id: string) => {
    Alert.alert("Delete Session", "Delete this chat session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteSession.mutate({ id }),
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId || isSending) return;
    const content = input.trim();
    setInput("");
    const abort = new AbortController();
    abortRef.current = abort;
    setIsSending(true);
    try {
      await customFetch(`/api/chat/sessions/${currentSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abort.signal,
      });
      queryClient.invalidateQueries({
        queryKey: getListMessagesQueryKey(currentSessionId),
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        Alert.alert("Error", err.message ?? "Failed to send message.");
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const currentSession = (sessions as Session[]).find(
    (s: Session) => s.id === currentSessionId
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View style={styles.topBarRow}>
          <View style={styles.topBarLeft}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
              AI_OPS_TERMINAL
            </Text>
          </View>
          <Pressable
            onPress={handleCreateSession}
            style={[styles.newBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Feather name="plus" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {sessionsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
        ) : (sessions as Session[]).length === 0 ? (
          <Pressable onPress={handleCreateSession} style={styles.emptySessionBtn}>
            <Text style={[styles.emptySessionText, { color: colors.mutedForeground }]}>
              Tap + to start a new session
            </Text>
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sessionsScroll}
          >
            {(sessions as Session[]).map((s: Session) => (
              <SessionPill
                key={s.id}
                session={s}
                isActive={s.id === currentSessionId}
                onPress={() => setCurrentSessionId(s.id)}
                onDelete={() => handleDeleteSession(s.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={[...(messages as Message[])].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: bottomPad + 20 },
        ]}
        inverted
        ListEmptyComponent={
          !msgsLoading ? (
            <View style={styles.emptyChat}>
              <Feather name="cpu" size={40} color={colors.primary} />
              <Text style={[styles.emptyChatTitle, { color: colors.primary }]}>
                CYBER_SENTINEL_V2.0
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
                {currentSessionId
                  ? "Awaiting directives."
                  : "Create a session to begin."}
              </Text>
            </View>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )
        }
      />

      {isSending && (
        <View style={[styles.typingRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.typingDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.typingDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.typingDot, { backgroundColor: colors.primary }]} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder={
              currentSessionId
                ? "Enter directive..."
                : "Initialize session first..."
            }
            placeholderTextColor={colors.mutedForeground}
            editable={!!currentSessionId && !isSending}
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
                fontFamily: "Inter_400Regular",
              },
            ]}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          {isSending ? (
            <Pressable
              onPress={handleStop}
              style={[
                styles.sendBtn,
                { backgroundColor: "#cc2200", borderRadius: colors.radius },
              ]}
            >
              <Feather name="square" size={14} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || !currentSessionId}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !input.trim() || !currentSessionId
                      ? colors.secondary
                      : colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="send" size={16} color={colors.primaryForeground} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topBarTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  newBtn: {
    padding: 6,
    borderWidth: 1,
  },
  sessionsScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  sessionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    maxWidth: 150,
  },
  sessionPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },
  emptySessionBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  emptySessionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  messagesList: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  msgRowUser: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  msgBubble: {
    flex: 1,
    gap: 4,
  },
  msgBubbleUser: {
    alignItems: "flex-end",
  },
  msgBubbleAI: {
    alignItems: "flex-start",
  },
  msgContent: {
    borderWidth: 1,
    padding: 12,
    maxWidth: "100%",
  },
  msgText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  msgRole: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
  },
  emptyChat: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 60,
    transform: [{ scaleY: -1 }],
  },
  emptyChatTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  emptyChatSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  typingRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
