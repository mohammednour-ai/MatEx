'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from './Icons';

interface SearchSuggestion {
  suggestion: string;
  category: string;
  frequency: number;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  showSuggestions?: boolean;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search materials, categories, locations...',
  initialValue = '',
  showSuggestions = true,
  className = ''
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions from API
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestionsList(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&suggestions=true`);
      const data = await response.json();
      
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestionsList(true);
      } else {
        setSuggestions([]);
        setShowSuggestionsList(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestionsList(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced suggestion fetching
  useEffect(() => {
    if (!showSuggestions) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, showSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestionIndex(-1);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestionsList(false);
      inputRef.current?.blur();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestionsList(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsList || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const selectedSuggestion = suggestions[selectedSuggestionIndex].suggestion;
          handleSuggestionClick(selectedSuggestion);
        }
        break;
      case 'Escape':
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text in suggestions
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'title':
        return 'bg-blue-100 text-blue-800';
      case 'material':
        return 'bg-green-100 text-green-800';
      case 'category':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestionsList(true);
              }
            }}
            placeholder={placeholder}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          
          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && showSuggestionsList && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.suggestion}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between ${
                      selectedSuggestionIndex === index ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {highlightMatch(suggestion.suggestion, query)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(suggestion.category)}`}>
                        {suggestion.category}
                      </span>
                      {suggestion.frequency > 1 && (
                        <span className="text-xs text-gray-500">
                          {suggestion.frequency}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No suggestions found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Search results highlighting component
interface SearchResultHighlightProps {
  text: string;
  query: string;
  className?: string;
}

export function SearchResultHighlight({ text, query, className = '' }: SearchResultHighlightProps) {
  if (!query.trim() || !text) return <span className={className}>{text}</span>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 font-medium rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
