'use client';

import { useState, useEffect, useRef, useId } from 'react';
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
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search materials, categories, locations...',
  initialValue = '',
  showSuggestions = true,
  className = '',
  'aria-label': ariaLabel = 'Search for materials and listings',
  'aria-describedby': ariaDescribedBy
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [announceText, setAnnounceText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique IDs for accessibility
  const searchId = useId();
  const suggestionsId = `${searchId}-suggestions`;
  const statusId = `${searchId}-status`;
  const clearButtonId = `${searchId}-clear`;

  // Fetch suggestions from API
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestionsList(false);
      setAnnounceText('');
      return;
    }

    try {
      setIsLoading(true);
      setAnnounceText('Loading search suggestions...');

      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&suggestions=true`);
      const data = await response.json();

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestionsList(true);
        const count = data.suggestions.length;
        setAnnounceText(`${count} suggestion${count !== 1 ? 's' : ''} available. Use arrow keys to navigate, Enter to select, Escape to close.`);
      } else {
        setSuggestions([]);
        setShowSuggestionsList(false);
        setAnnounceText('No suggestions found.');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestionsList(false);
      setAnnounceText('Error loading suggestions. Please try again.');
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
    if (!showSuggestionsList || suggestions.length === 0) {
      // Allow form submission when no suggestions are shown
      if (e.key === 'Enter') {
        return; // Let form handle submission
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedSuggestionIndex < suggestions.length - 1 ? selectedSuggestionIndex + 1 : 0;
        setSelectedSuggestionIndex(nextIndex);
        setAnnounceText(`${nextIndex + 1} of ${suggestions.length}: ${suggestions[nextIndex].suggestion}`);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedSuggestionIndex > 0 ? selectedSuggestionIndex - 1 : suggestions.length - 1;
        setSelectedSuggestionIndex(prevIndex);
        if (prevIndex === -1) {
          setAnnounceText('Back to search input');
        } else {
          setAnnounceText(`${prevIndex + 1} of ${suggestions.length}: ${suggestions[prevIndex].suggestion}`);
        }
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const selectedSuggestion = suggestions[selectedSuggestionIndex].suggestion;
          setAnnounceText(`Selected: ${selectedSuggestion}`);
          handleSuggestionClick(selectedSuggestion);
        }
        break;
      case 'Escape':
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
        setAnnounceText('Suggestions closed');
        inputRef.current?.blur();
        break;
      case 'Home':
        if (suggestions.length > 0) {
          e.preventDefault();
          setSelectedSuggestionIndex(0);
          setAnnounceText(`First suggestion: ${suggestions[0].suggestion}`);
        }
        break;
      case 'End':
        if (suggestions.length > 0) {
          e.preventDefault();
          const lastIndex = suggestions.length - 1;
          setSelectedSuggestionIndex(lastIndex);
          setAnnounceText(`Last suggestion: ${suggestions[lastIndex].suggestion}`);
        }
        break;
    }
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
    setAnnounceText('Search cleared');
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
    <div className={`relative ${className}`} role="search">
      {/* Screen reader announcements */}
      <div
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announceText}
      </div>

      <form onSubmit={handleSubmit} className="relative" role="search">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>

          <input
            ref={inputRef}
            id={searchId}
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
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            aria-label={ariaLabel}
            aria-describedby={`${statusId}${ariaDescribedBy ? ` ${ariaDescribedBy}` : ''}`}
            aria-expanded={showSuggestionsList}
            aria-haspopup="listbox"
            aria-owns={showSuggestionsList ? suggestionsId : undefined}
            aria-activedescendant={
              selectedSuggestionIndex >= 0
                ? `${suggestionsId}-option-${selectedSuggestionIndex}`
                : undefined
            }
            autoComplete="off"
            spellCheck="false"
          />

          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                id={clearButtonId}
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded p-1 transition-colors"
                aria-label={`Clear search query: ${query}`}
                title="Clear search"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && showSuggestionsList && (
        <div
          ref={suggestionsRef}
          id={suggestionsId}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Search suggestions"
        >
          {isLoading ? (
            <div
              className="px-4 py-3 text-sm text-gray-500 flex items-center"
              role="status"
              aria-live="polite"
            >
              <div
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"
                aria-hidden="true"
              ></div>
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1" role="none">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.suggestion}-${index}`} role="none">
                  <button
                    type="button"
                    id={`${suggestionsId}-option-${index}`}
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 flex items-center justify-between transition-colors ${
                      selectedSuggestionIndex === index ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    role="option"
                    aria-selected={selectedSuggestionIndex === index}
                    aria-describedby={`${suggestionsId}-option-${index}-details`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <MagnifyingGlassIcon
                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {highlightMatch(suggestion.suggestion, query)}
                      </span>
                    </div>
                    <div
                      id={`${suggestionsId}-option-${index}-details`}
                      className="flex items-center space-x-2 flex-shrink-0 ml-2"
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(suggestion.category)}`}
                        aria-label={`Category: ${suggestion.category}`}
                      >
                        {suggestion.category}
                      </span>
                      {suggestion.frequency > 1 && (
                        <span
                          className="text-xs text-gray-500"
                          aria-label={`Found ${suggestion.frequency} times`}
                        >
                          {suggestion.frequency}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div
              className="px-4 py-3 text-sm text-gray-500"
              role="status"
              aria-live="polite"
            >
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
