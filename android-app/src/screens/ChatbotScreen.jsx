import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';

// TODO: reemplazar con fetch real cuando el chatbot-microservice esté listo
// const sendMessage = async (message) => {
//   const token = await getToken();
//   const data = await bffPost('/api/chatbot/message', { message }, { token });
//   return data.reply;
// };

const INITIAL_MESSAGES = [
  {
    id: '0',
    role: 'bot',
    text: '¡Hola! Soy el asistente de la Biblioteca Ducky 🦆\n¿En qué puedo ayudarte hoy?',
    time: new Date(),
  },
];

function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }) {
  const isBot = msg.role === 'bot';
  return (
    <View style={[styles.bubbleWrap, isBot ? styles.bubbleWrapBot : styles.bubbleWrapUser]}>
      {isBot && (
        <View style={styles.botAvatar}>
          <Text style={{ fontSize: 14 }}>🦆</Text>
        </View>
      )}
      <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
        <Text style={[styles.bubbleText, isBot ? styles.bubbleTextBot : styles.bubbleTextUser]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, isBot ? { color: colors.gray400 } : { color: 'rgba(255,255,255,0.7)' }]}>
          {formatTime(msg.time)}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapBot]}>
      <View style={styles.botAvatar}>
        <Text style={{ fontSize: 14 }}>🦆</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: spacing.sm }]}>
        <ActivityIndicator size="small" color={colors.gray400} />
      </View>
    </View>
  );
}

export default function ChatbotScreen({ navigation }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // TODO: reemplazar este bloque con la llamada real al chatbot-microservice
    // Ejemplo:
    // try {
    //   const token = await getToken();
    //   const data = await bffPost('/api/chatbot/message', { message: text }, { token });
    //   const botMsg = { id: (Date.now()+1).toString(), role: 'bot', text: data.reply, time: new Date() };
    //   setMessages(prev => [...prev, botMsg]);
    // } catch {
    //   const errMsg = { id: (Date.now()+1).toString(), role: 'bot', text: 'Lo siento, hubo un error. Intenta de nuevo.', time: new Date() };
    //   setMessages(prev => [...prev, errMsg]);
    // } finally {
    //   setTyping(false);
    // }

    // Respuesta mock mientras el servicio no está listo
    setTimeout(() => {
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'El servicio de chatbot está siendo configurado. Pronto podrás hacer consultas sobre libros, préstamos y más. 📚',
        time: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 1000);
  };

  const QUICK_REPLIES = [
    '¿Cómo hago un préstamo?',
    '¿Dónde está el libro X?',
    '¿Cuánto dura un préstamo?',
    '¿Tengo multas?',
  ];

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Lista de mensajes */}
        <FlatList
          ref={listRef}
          data={typing ? [...messages, { id: 'typing', role: 'typing' }] : messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => {
            if (item.role === 'typing') return <TypingIndicator />;
            return <MessageBubble msg={item} />;
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Quick replies */}
        {messages.length <= 2 && (
          <View style={styles.quickReplies}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={QUICK_REPLIES}
              keyExtractor={i => i}
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => { setInput(item); }}
                >
                  <Text style={styles.quickBtnText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={colors.gray400}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || typing}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f4f8' },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bubbleWrapBot:  { justifyContent: 'flex-start' },
  bubbleWrapUser: { justifyContent: 'flex-end' },

  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  bubble: {
    maxWidth: '75%', borderRadius: radius.lg,
    padding: spacing.md, gap: 4,
  },
  bubbleBot: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.gray200,
  },
  bubbleUser: {
    backgroundColor: colors.black,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextBot:  { color: colors.black },
  bubbleTextUser: { color: colors.white },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },

  quickReplies: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray200, backgroundColor: colors.white },
  quickBtn: {
    borderWidth: 1, borderColor: colors.primary,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  quickBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderWidth: 1.5, borderColor: colors.gray200,
    borderRadius: radius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: 14, color: colors.black,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.gray200 },
  sendIcon: { fontSize: 16, color: colors.black },
});