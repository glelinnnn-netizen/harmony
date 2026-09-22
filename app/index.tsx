// app/index.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

type Message = { role: 'user' | 'assistant'; content: string };

// 👇 Codespaces forwarded URL for port 8081 (must be PUBLIC in the PORTS tab)
const API_URL =
  'https://super-duper-space-halibut-jr7jqwq5676jcpjxq-8081.app.github.dev/api/chat';

const GREETING =
  "Hi, I'm Harmony 🌿 Your everyday health companion. Ask me anything about wellness, nutrition, or how you're feeling. I'm not a doctor — for medical concerns, please see a professional.";

// ---------- Typing indicator (three animated dots) ----------
function TypingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
      ))}
    </View>
  );
}

// ---------- Animated message bubble ----------
function MessageBubble({ item, isStreaming }: { item: Message; isStreaming: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = item.role === 'user';
  const showTyping = !isUser && isStreaming && !item.content;

  return (
    <Animated.View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      {isUser ? (
        <LinearGradient
          colors={['#3d8760', '#2f6f4f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{item.content}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.assistantBubble}>
          {showTyping ? <TypingDots /> : <Text style={styles.assistantText}>{item.content}</Text>}
        </View>
      )}
    </Animated.View>
  );
}

// ---------- Main screen ----------
export default function HarmonyScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToEnd = (animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    Keyboard.dismiss();

    const userMessage: Message = { role: 'user', content: text };
    const history = [...messages, userMessage];

    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: 'assistant',
                  content: assistantText,
                };
                return next;
              });
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }

      if (!assistantText) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: "I didn't get a response. Please try again.",
          };
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: "Sorry, I couldn't reach the server. Please try again.",
        };
        return next;
      });
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#4ea87a', '#2f6f4f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>H</Text>
          </LinearGradient>
          <View>
            <Text style={styles.title}>Harmony</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.subtitle}>Online · everyday health companion</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToEnd()}
          onLayout={() => scrollToEnd(false)}
          renderItem={({ item, index }) => (
            <MessageBubble
              item={item}
              isStreaming={loading && index === messages.length - 1}
            />
          )}
        />

        {/* Composer */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Harmony anything…"
              placeholderTextColor="#8a9a8a"
              style={styles.input}
              editable={!loading}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!canSend}
            activeOpacity={0.85}
            style={[styles.sendBtnWrap, !canSend && styles.sendBtnDisabled]}
          >
            <LinearGradient
              colors={canSend ? ['#4ea87a', '#2f6f4f'] : ['#c9d6c9', '#b8c6b8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const MAX_BUBBLE = Math.min(width * 0.82, 520);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8f5' },
  flex: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#dce6dc',
    backgroundColor: '#ffffff',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  title: { fontSize: 18, fontWeight: '700', color: '#1d3b1d', letterSpacing: 0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3d8760',
  },
  subtitle: { fontSize: 12, color: '#7a8a7a' },

  /* Messages */
  list: { padding: 16, paddingBottom: 24, gap: 10 },
  bubbleWrap: { maxWidth: MAX_BUBBLE },
  bubbleWrapUser: { alignSelf: 'flex-end' },
  bubbleWrapAssistant: { alignSelf: 'flex-start' },

  userBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: { color: '#ffffff', fontSize: 15, lineHeight: 21 },

  assistantBubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2ebe2',
    shadowColor: '#0a2a17',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  assistantText: { color: '#1d3b1d', fontSize: 15, lineHeight: 22 },

  /* Typing indicator */
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6b8f6b',
  },

  /* Composer */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#dce6dc',
    backgroundColor: '#ffffff',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#f1f5f1',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dce6dc',
    paddingHorizontal: 4,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: '#1d3b1d',
  },
  sendBtnWrap: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  sendText: { color: '#ffffff', fontWeight: '600', fontSize: 14, letterSpacing: 0.2 },
});