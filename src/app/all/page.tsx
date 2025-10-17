"use client";

import { useEffect, useState } from "react";
import { toRomaji } from "wanakana";
import Link from "next/link";

type SearchResult = {
  kanji: string;
  reading: string;
  isCommon: boolean;
  senses: Array<{ pos: string[]; defs: string[]; tags: string[] }>;
  audio?: string[];
  example?: string;
  translation?: string;
  linkJP?: string;
  linkVN?: string;
};

export default function AllWords() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=`);
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    
    // Load voices when component mounts
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      };
      
      // Load voices immediately and when they change
      loadVoices();
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const speakJapanese = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      
      // Try multiple Japanese voices in order of preference
      const voices = speechSynthesis.getVoices();
      const japaneseVoices = voices.filter(voice => 
        voice.lang.startsWith('ja') || 
        voice.name.toLowerCase().includes('japanese') ||
        voice.name.toLowerCase().includes('japan')
      );
      
      // Sort by preference: prefer native Japanese voices
      japaneseVoices.sort((a, b) => {
        const aScore = a.name.toLowerCase().includes('japanese') ? 2 : 
                      a.name.toLowerCase().includes('japan') ? 1 : 0;
        const bScore = b.name.toLowerCase().includes('japanese') ? 2 : 
                      b.name.toLowerCase().includes('japan') ? 1 : 0;
        return bScore - aScore;
      });
      
      if (japaneseVoices.length > 0) {
        utterance.voice = japaneseVoices[0];
        console.log('Using voice:', japaneseVoices[0].name);
      } else {
        console.log('No Japanese voice found, using default');
      }
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        speechSynthesis.cancel();
        reject(new Error('Speech synthesis timeout'));
      }, 10000); // 10 second timeout
      
      // Handle speech events
      utterance.onend = () => {
        clearTimeout(timeout);
        console.log('Speech synthesis completed');
        resolve();
      };
      
      utterance.onerror = (error) => {
        clearTimeout(timeout);
        console.error('Speech synthesis error:', error);
        
        // Handle specific error types
        if (error.error === 'interrupted') {
          console.log('Speech was interrupted, this is normal');
          resolve(); // Don't reject for interruption
        } else if (error.error === 'not-allowed') {
          console.log('Speech not allowed, user may have denied permission');
          reject(new Error('Speech synthesis not allowed'));
        } else if (error.error === 'audio-busy') {
          console.log('Audio busy, retrying...');
          setTimeout(() => {
            speechSynthesis.speak(utterance);
          }, 100);
        } else {
          reject(error);
        }
      };
      
      utterance.onstart = () => {
        console.log('Speech synthesis started');
      };
      
      utterance.onpause = () => {
        console.log('Speech synthesis paused');
      };
      
      utterance.onresume = () => {
        console.log('Speech synthesis resumed');
      };
      
      speechSynthesis.speak(utterance);
    });
  };

  // Detect adjective type and create variations for highlighting
  const getAdjectiveVariations = (kanji: string) => {
    const variations = [kanji];
    // Xác định kết thúc bằng "い" (i-adj) hoặc "な" (na-adj) trong tính từ tiếng Nhật
    if (kanji.endsWith('い')) {
      // i-adjective: thêm các dạng phổ biến
      variations.push(kanji.replace(/い$/, 'く'));      // dạng く
      variations.push(kanji.replace(/い$/, 'くて'));    // dạng くて
      variations.push(kanji.replace(/い$/, 'さ'));      // dạng danh từ hóa
    } else if (kanji.endsWith('な')) {
      // na-adjective: dạng với/không "な"
      const baseForm = kanji.replace(/な$/, '');
      if (baseForm !== kanji) {
        variations.push(baseForm);
      }
      variations.push(kanji);                            // giữ nguyên dạng な
      variations.push(baseForm + 'に');                   // trạng từ hóa
      // Thường nếu kết thúc bằng 的 thì cũng là na-adj, nhưng lặp lại cho rõ nghĩa
      if (baseForm.endsWith('的')) {
        variations.push(baseForm + '的な');
        variations.push(baseForm + '的に');
      }
    } else if (kanji.endsWith('的')) {
      // "的" hay gặp trong kinh tế, là na-adjective gốc
      variations.push(kanji + 'な');
      variations.push(kanji + 'に');
    }
    return variations;
  };

  // Highlight text with variations
  const highlightText = (text: string, kanji: string) => {
    const variations = getAdjectiveVariations(kanji);
    let highlightedText = text;
    
    variations.forEach(variation => {
      const regex = new RegExp(`(${variation})`, 'g');
      highlightedText = highlightedText.replace(regex, '<span class="text-red-500 font-bold">$1</span>');
    });
    
    return highlightedText;
  };

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-light tracking-tight">
              Tất cả từ vựng
            </h1>
            <Link 
              href="/"
              className="btn-secondary hover-lift px-4 py-2 text-sm font-light"
            >
              ← Quay lại tìm kiếm
            </Link>
          </div>
          <p className="text-muted-foreground text-lg font-light">
            {loading ? "Đang tải..." : `${results.length} từ vựng từ list1 + list2`}
          </p>
        </header>

        {/* Results Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((r, idx) => (
              <div key={`${r.kanji}-${idx}`} className="card p-5 hover-lift animate-fadeIn gradient-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 flex flex-col">
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-light">{r.kanji}</h3>
                    {r.reading && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => speakJapanese(r.reading).catch(console.error)}
                        title="Phát âm tiếng Nhật"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {r.reading && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground font-light">{r.reading}</span>
                      <span className="text-xs text-muted-foreground">{toRomaji(r.reading)}</span>
                    </div>
                  )}
                </div>

                {/* Meaning - Larger text */}
                {r.senses?.[0]?.defs?.length && (
                  <div className="text-base font-medium mb-3 text-foreground">{r.senses[0].defs[0]}</div>
                )}

                {/* Content area */}
                <div className="flex-1">
                  {/* Example if available */}
                  {r.example && (
                    <div className="text-xs text-muted-foreground mb-3">
                      <div className="font-medium mb-1">Ví dụ:</div>
                      <div 
                        className="italic mb-2"
                        dangerouslySetInnerHTML={{ __html: highlightText(r.example, r.kanji) }}
                      />
                      {r.translation && (
                        <div className="mt-2 p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 shadow-sm animate-pop">
                          <div className="font-medium mb-1">Dịch:</div>
                          <div 
                            className="leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: highlightText(r.translation, r.kanji) }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Source links - Always at bottom */}
                {(r.linkJP || r.linkVN) && (
                  <div className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                    <div className="font-medium mb-1">Nguồn:</div>
                    <div className="flex gap-2">
                      {r.linkJP && (
                        <a 
                          href={r.linkJP} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          🇯🇵 Nguồn Nhật
                        </a>
                      )}
                      {r.linkVN && (
                        <a 
                          href={r.linkVN} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline text-xs"
                        >
                          🇻🇳 Nguồn Việt
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
