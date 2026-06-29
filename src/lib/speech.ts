import { useState, useCallback, useEffect, useRef } from 'react';

// Define the interface for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  item(index: number): SpeechRecognitionResult;
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  item(index: number): SpeechRecognitionAlternative;
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export const useSpeechRecognition = (onTranscriptChange?: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<ISpeechRecognition | null>(null);

  const callbackRef = useRef(onTranscriptChange);
  useEffect(() => {
    callbackRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.lang = 'en-US';
      rec.interimResults = false;

      rec.onresult = (event) => {
        let newText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newText += event.results[i][0].transcript + ' ';
          }
        }
        const trimmed = newText.trim();
        if (trimmed) {
          setTranscript(prev => prev ? `${prev} ${trimmed}` : trimmed);
          if (callbackRef.current) {
            callbackRef.current(trimmed);
          }
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        // Request microphone permission explicitly via standard browser mediaDevices API
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream tracks immediately so we don't keep the mic indicator active
          stream.getTracks().forEach(track => track.stop());
        }
        
        recognition?.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Microphone permission or access error:', err);
        alert("Please enable microphone access in your browser settings to use voice typing.");
        setIsListening(false);
      }
    }
  }, [isListening, recognition]);

  return { isListening, transcript, toggleListening, setTranscript };
};
