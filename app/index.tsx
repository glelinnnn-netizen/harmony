// app/index.tsx
import { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = { role: 'user' | 'assistant'; content: string };

// 👇 Codespaces forwarded URL for port 8081 (must be PUBLIC in the PORTS tab)
const API_URL =
  'https://super-duper-space-halibut-jr7jqwq5676jcpjxq-8081.app.github.dev/api/chat';

const GREETING =
  "Hi, I'm Harmony 🌿 Your everyday health companion. Ask me anything about wellness, nutrition, or how you're feeling. I'm not a doctor — for medical concerns, please see a professional.";

export default function HarmonyScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const history = [...messages, userMessage];

    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Harmony</Text>
        <Text style={styles.subtitle}>Your everyday health companion</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={
                item.role === 'user' ? styles.userText : styles.assistantText
              }
            >
              {item.content || (loading ? '…' : '')}
            </Text>
          </View>
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Harmony anything…"
            placeholderTextColor="#8a9a8a"
            style={styles.input}
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, loading && { opacity: 0.5 }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7faf7' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2ebe2',
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1d3b1d' },
  subtitle: { fontSize: 13, color: '#6b7d6b', marginTop: 2 },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2f6f4f' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#e8f0e8' },
  userText: { color: '#ffffff', fontSize: 15, lineHeight: 21 },
  assistantText: { color: '#1d3b1d', fontSize: 15, lineHeight: 21 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#e2ebe2',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f2f6f2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: '#1d3b1d',
  },
  sendBtn: {
    backgroundColor: '#2f6f4f',
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendText: { color: '#ffffff', fontWeight: '600' },
});