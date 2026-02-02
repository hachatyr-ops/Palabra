
import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { Language, Translations } from '../types';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  lang: Language;
  translations: Translations;
  size?: 'sm' | 'lg';
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, lang, translations, size = 'sm', className = '' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isPressedRef = useRef(false);

  const startRecording = async () => {
    isPressedRef.current = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check if user already released the button while we were getting stream
      if (!isPressedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Final track cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (chunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcript = await transcribeAudio(base64Audio, 'audio/webm', lang);
            if (transcript && transcript.length > 0) {
              onTranscript(transcript);
            }
            setIsTranscribing(false);
          };
        } catch (error) {
          console.error("Transcription error", error);
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Safety timeout
      setTimeout(() => {
        if (isPressedRef.current) {
          stopRecording();
        }
      }, 7000);

    } catch (err) {
      console.error("Could not start recording", err);
      isPressedRef.current = false;
      setIsRecording(false);
      alert(translations.voiceError);
    }
  };

  const stopRecording = () => {
    isPressedRef.current = false;
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (streamRef.current) {
      // If it never started recording but we have a stream, kill it
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={isRecording ? stopRecording : undefined}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={`
          ${isSm ? 'w-8 h-8' : 'w-16 h-16'} 
          rounded-full flex items-center justify-center transition-all duration-300 select-none
          ${isRecording ? 'bg-red-500 scale-110 shadow-lg shadow-red-200 animate-pulse text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-500'}
          ${isTranscribing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        title="Hold to speak"
      >
        {isTranscribing ? (
          <i className="fas fa-circle-notch animate-spin text-xs"></i>
        ) : (
          <i className={`fas fa-microphone ${isSm ? 'text-xs' : 'text-xl'}`}></i>
        )}
      </button>
      
      {(isRecording || isTranscribing) && !isSm && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 whitespace-nowrap bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 animate-in fade-in zoom-in duration-200">
          {isRecording ? translations.voiceListen : translations.voiceProcess}
        </div>
      )}
    </div>
  );
};
