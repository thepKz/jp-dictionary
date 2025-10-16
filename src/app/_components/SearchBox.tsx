"use client";

import { useEffect, useState } from "react";
import { toRomaji } from "wanakana";

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
  
  // Check if it's a na-adjective (ends with 的, な, etc.)
  if (kanji.endsWith('的') || kanji.endsWith('な')) {
    // For na-adjectives, also include the base form without な
    const baseForm = kanji.replace(/な$/, '');
    if (baseForm !== kanji) {
      variations.push(baseForm);
    }
    variations.push(kanji.replace(/的$/, '的な'));
    variations.push(kanji.replace(/な$/, 'な'));
    variations.push(kanji.replace(/的$/, '的'));
  } else {
    // i-adjective variations
    variations.push(kanji + 'い');
    variations.push(kanji + 'く');
    variations.push(kanji + 'くて');
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

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const PRESETS = [
    { label: "経済的", value: "経済的" },
    { label: "金融的", value: "金融的" },
    { label: "商業的", value: "商業的" },
    { label: "国際的", value: "国際的" },
    { label: "消費的", value: "消費的" },
    { label: "効率的", value: "効率的" },
    { label: "合理的", value: "合理的" },
  ];

  // Load suggestions for dropdown
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await fetch(`/api/search?q=`);
        const json = await res.json();
        setSuggestions(json.data || []);
      } catch {
        setSuggestions([]);
      }
    }
    loadSuggestions();
  }, []);

  // Filter suggestions based on query
  const filteredSuggestions = suggestions.filter(item => {
    if (!query) return false;
    const queryLower = query.toLowerCase();
    const romajiQuery = toRomaji(query);
    return (
      item.kanji.toLowerCase().includes(queryLower) ||
      item.reading.toLowerCase().includes(queryLower) ||
      item.senses?.[0]?.defs?.[0]?.toLowerCase().includes(queryLower) ||
      toRomaji(item.reading).toLowerCase().includes(queryLower) ||
      toRomaji(item.reading).toLowerCase().includes(romajiQuery.toLowerCase())
    );
  }).slice(0, 8); // Limit to 8 suggestions

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    setShowSuggestions(false);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setQuery(suggestion.kanji);
    setShowSuggestions(false);
    setResults([suggestion]);
    setHasSearched(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="card p-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light mb-2">Tìm kiếm từ vựng</h2>
        <p className="text-muted-foreground">Nhập kanji, kana, romaji hoặc nghĩa tiếng Việt</p>
      </div>

      {/* Search Input with Dropdown */}
      <div className="relative mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              className="input pl-4 pr-4 py-3 sm:py-4 text-base sm:text-lg w-full"
              placeholder="Ví dụ: 経済的, keizaiteki, economic..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(query.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            
            {/* Dropdown Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredSuggestions.map((suggestion, idx) => (
                  <div
                    key={`${suggestion.kanji}-${idx}`}
                    className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{suggestion.kanji}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.reading} • {suggestion.senses?.[0]?.defs?.[0]}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(suggestion.reading);
                        }}
                        title="Phát âm"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Search Button */}
          <button
            type="button"
            className="btn-primary hover-lift px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-light flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <span className="hidden sm:inline">Tìm kiếm</span>
                <span className="sm:hidden">Tìm</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Buttons - Hidden */}
      {/* <div className="mb-6">
        <h3 className="text-sm font-light text-muted-foreground mb-3">Tìm nhanh:</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
              onClick={() => {
                setQuery(p.value);
                setShowSuggestions(false);
                // Don't auto-search, user must click search button
              }}
              aria-label={`Tìm nhanh: ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div> */}

      {/* Result count */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Kết quả:</span>
          <span className="badge badge-secondary">{results.length} từ</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, idx) => (
            <div key={`${r.kanji}-${idx}`} className="card p-4 sm:p-5 hover-lift animate-fadeIn gradient-border shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/80 flex flex-col">
              {/* Header */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-light">{r.kanji}</h3>
                  {r.reading && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    <div className="flex items-start gap-2">
                      <div 
                        className="italic mb-2 flex-1"
                        dangerouslySetInnerHTML={{ __html: highlightText(r.example, r.kanji) }}
                      />
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                        onClick={() => r.example && speakJapanese(r.example).catch(console.error)}
                        title="Phát âm ví dụ"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-300">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    </div>
                    {r.translation && (
                      <div className="text-xs text-blue-600 italic">
                        <div className="font-medium mb-1">Dịch:</div>
                        <div 
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    {r.linkJP && (
                      <div className="text-blue-600 text-xs">
                        🇯🇵 {r.linkJP.startsWith('http') ? (
                          <a 
                            href={r.linkJP} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline break-all"
                          >
                            Nguồn Nhật
                          </a>
                        ) : (
                          <span className="break-all">{r.linkJP}</span>
                        )}
                      </div>
                    )}
                    {r.linkVN && (
                      <div className="text-green-600 text-xs">
                        🇻🇳 {r.linkVN.startsWith('http') ? (
                          <a 
                            href={r.linkVN} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline break-all"
                          >
                            Nguồn Việt
                          </a>
                        ) : (
                          <span className="break-all">{r.linkVN}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results - Only show when user has searched */}
      {hasSearched && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-light mb-2">Không tìm thấy kết quả</h3>
          <p className="text-muted-foreground mb-4">
            Thử tìm kiếm với từ khóa khác hoặc sử dụng các preset bên trên
          </p>
          <div className="flex justify-center gap-2">
            {PRESETS.slice(0, 3).map((p) => (
              <button
                key={p.value}
                type="button"
                className="btn-secondary hover-lift px-3 py-1 text-sm font-light"
                onClick={() => {
                  setQuery(p.value);
                  setShowSuggestions(false);
                  // Don't auto-search, user must click search button
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}