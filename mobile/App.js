import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Voice from '@react-native-community/voice';

/**
 * Sunday Mac 47 — Mobile Assistant Overlay
 * This component is designed to be launched via the 'android.intent.action.ASSIST'
 */
const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Standby');

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = (e) => console.log('Speech Error:', e);
    
    // Auto-start listening if launched as Assistant
    startListening();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (e) => {
    setTranscript(e.value[0]);
    // Send to backend immediately after capture
    sendToBackend(e.value[0]);
  };

  const startListening = async () => {
    try {
      setStatus('Listening...');
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  };

  const sendToBackend = async (text) => {
    setStatus('Processing...');
    try {
      const response = await fetch('YOUR_RENDER_BACKEND_URL/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      setStatus('Sunday Mac 47: ' + data.reply);
    } catch (e) {
      setStatus('Offline or Error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Sunday Mac 47</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.transcript}>{transcript}</Text>
        
        <TouchableOpacity style={styles.micButton} onPress={startListening}>
          <Text style={{color: 'white'}}>Tap to Speak</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '80%', padding: 20, backgroundColor: '#1e293b', borderRadius: 20, alignItems: 'center' },
  title: { color: '#6366f1', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  status: { color: '#94a3b8', marginBottom: 20 },
  transcript: { color: 'white', fontStyle: 'italic', marginBottom: 30 },
  micButton: { padding: 15, backgroundColor: '#6366f1', borderRadius: 10 }
});

export default App;
