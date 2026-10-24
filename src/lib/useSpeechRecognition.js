import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechRecognition({ onFinal } = {}) {
  const [supported] = useState(
    () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!supported) return undefined;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError('');
      setListening(true);
    };
    recognition.onresult = (event) => {
      let text = '';
      let finalText = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        text += result[0].transcript;
        if (result.isFinal) finalText += result[0].transcript;
      }
      setTranscript(text.trim());
      if (finalText.trim()) onFinalRef.current?.(finalText.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech was detected. Try again or type the report.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access was blocked. Allow it in the browser or type the report.');
      } else {
        setError(`Voice capture stopped (${event.error}). You can type the report instead.`);
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [supported]);

  const start = useCallback(() => {
    if (!supported) {
      setError('Browser speech is not supported here. Use text or the ElevenLabs agent.');
      return;
    }
    setTranscript('');
    setError('');
    try {
      recognitionRef.current?.start();
    } catch {
      setError('Voice capture is already running.');
    }
  }, [supported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError('');
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
