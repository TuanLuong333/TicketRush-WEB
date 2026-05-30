import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent, ReactNode, TextareaHTMLAttributes } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from './ui/command';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';
import { cn } from './ui/utils';

export type AutocompleteSuggestion = string | number | null | undefined;

interface BaseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: AutocompleteSuggestion[];
  leadingIcon?: ReactNode;
  leadingIconClassName?: string;
  wrapperClassName?: string;
  emptyText?: string;
  maxSuggestions?: number;
}

type AutocompleteInputProps = BaseAutocompleteProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

type AutocompleteTextareaProps = BaseAutocompleteProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function uniqueAutocompleteSuggestions(values: AutocompleteSuggestion[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const label = String(value ?? '').trim();
    const key = normalizeSearch(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
}

function filterSuggestions(values: string[], query: string, limit: number): string[] {
  const normalizedQuery = normalizeSearch(query);
  const ranked = values
    .map((suggestion, index) => {
      const normalizedSuggestion = normalizeSearch(suggestion);
      const startsWith = normalizedQuery && normalizedSuggestion.startsWith(normalizedQuery);
      const includes = !normalizedQuery || normalizedSuggestion.includes(normalizedQuery);
      return {
        suggestion,
        index,
        score: startsWith ? 0 : includes ? 1 : 2,
        includes,
      };
    })
    .filter(item => item.includes)
    .sort((a, b) => a.score - b.score || a.index - b.index);

  return ranked.slice(0, limit).map(item => item.suggestion);
}

function useAutocomplete({
  value,
  onChange,
  suggestions,
  maxSuggestions = 8,
}: Pick<BaseAutocompleteProps, 'value' | 'onChange' | 'suggestions' | 'maxSuggestions'>) {
  const normalizedSuggestions = useMemo(
    () => uniqueAutocompleteSuggestions(suggestions),
    [suggestions],
  );
  const visibleSuggestions = useMemo(
    () => filterSuggestions(normalizedSuggestions, value, maxSuggestions),
    [maxSuggestions, normalizedSuggestions, value],
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const previousValueRef = useRef(value);
  const previousSuggestionsRef = useRef<string[]>([]);

  useEffect(() => {
    const valueChanged = previousValueRef.current !== value;
    const previousSuggestions = previousSuggestionsRef.current;

    setActiveIndex(current => {
      if (visibleSuggestions.length === 0) return -1;
      if (valueChanged) return 0;

      const activeSuggestion = current >= 0 ? previousSuggestions[current] : undefined;
      if (activeSuggestion) {
        const nextIndex = visibleSuggestions.indexOf(activeSuggestion);
        if (nextIndex >= 0) return nextIndex;
      }

      return Math.min(Math.max(current, 0), visibleSuggestions.length - 1);
    });

    previousValueRef.current = value;
    previousSuggestionsRef.current = visibleSuggestions;
  }, [value, visibleSuggestions]);

  const chooseSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (visibleSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(current => (current + 1) % visibleSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(current => (current <= 0 ? visibleSuggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0 && visibleSuggestions[activeIndex]) {
      event.preventDefault();
      chooseSuggestion(visibleSuggestions[activeIndex]);
    }
  };

  return {
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    visibleSuggestions,
    hasSuggestions: normalizedSuggestions.length > 0,
    chooseSuggestion,
    handleKeyDown,
  };
}

function SuggestionList({
  id,
  open,
  width,
  activeIndex,
  visibleSuggestions,
  emptyText,
  onHover,
  onChoose,
}: {
  id: string;
  open: boolean;
  width: number | null;
  activeIndex: number;
  visibleSuggestions: string[];
  emptyText: string;
  onHover: (index: number) => void;
  onChoose: (value: string) => void;
}) {
  if (!open) return null;

  return (
    <PopoverContent
      id={id}
      align="start"
      className="z-[80] max-h-72 overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      style={width ? { width } : undefined}
      onOpenAutoFocus={event => event.preventDefault()}
    >
      <Command shouldFilter={false} className="bg-transparent">
        <CommandList className="max-h-72" role="listbox">
          {visibleSuggestions.length === 0 ? (
            <CommandEmpty className="py-3 text-sm text-slate-500 dark:text-slate-400">
              {emptyText}
            </CommandEmpty>
          ) : (
            <CommandGroup className="p-1">
              {visibleSuggestions.map((suggestion, index) => {
                const active = activeIndex === index;
                return (
                  <button
                    key={suggestion}
                    id={`${id}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    tabIndex={-1}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => onHover(index)}
                    onClick={() => onChoose(suggestion)}
                    className={cn(
                      'flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm outline-none',
                      active
                        ? 'bg-orange-50 text-orange-700 dark:bg-slate-800 dark:text-orange-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70',
                    )}
                  >
                    <span className="truncate">{suggestion}</span>
                  </button>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </PopoverContent>
  );
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  leadingIcon,
  leadingIconClassName,
  wrapperClassName,
  emptyText = 'No suggestions',
  maxSuggestions = 8,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  disabled,
  readOnly,
  ...props
}: AutocompleteInputProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const {
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    visibleSuggestions,
    hasSuggestions,
    chooseSuggestion,
    handleKeyDown,
  } = useAutocomplete({ value, onChange, suggestions, maxSuggestions });
  const popoverOpen = open && hasSuggestions && !disabled && !readOnly;

  const refreshWidth = () => setWidth(wrapperRef.current?.offsetWidth ?? null);

  return (
    <Popover open={popoverOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={wrapperRef} className={cn('relative', wrapperClassName)}>
          {leadingIcon && (
            <span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400', leadingIconClassName)}>
              {leadingIcon}
            </span>
          )}
          <input
            ref={inputRef}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            aria-autocomplete="list"
            aria-controls={popoverOpen ? listId : undefined}
            aria-expanded={popoverOpen}
            aria-activedescendant={popoverOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            onChange={event => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={event => {
              refreshWidth();
              setOpen(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setOpen(false);
              onBlur?.(event);
            }}
            onKeyDown={event => {
              handleKeyDown(event);
              onKeyDown?.(event);
            }}
            className={className}
            {...props}
          />
        </div>
      </PopoverAnchor>
      <SuggestionList
        id={listId}
        open={popoverOpen}
        width={width}
        activeIndex={activeIndex}
        visibleSuggestions={visibleSuggestions}
        emptyText={emptyText}
        onHover={setActiveIndex}
        onChoose={value => {
          chooseSuggestion(value);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      />
    </Popover>
  );
}

export function AutocompleteTextarea({
  value,
  onChange,
  suggestions,
  leadingIcon,
  leadingIconClassName,
  wrapperClassName,
  emptyText = 'No suggestions',
  maxSuggestions = 8,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  disabled,
  readOnly,
  ...props
}: AutocompleteTextareaProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const {
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    visibleSuggestions,
    hasSuggestions,
    chooseSuggestion,
    handleKeyDown,
  } = useAutocomplete({ value, onChange, suggestions, maxSuggestions });
  const popoverOpen = open && hasSuggestions && !disabled && !readOnly;

  const refreshWidth = () => setWidth(wrapperRef.current?.offsetWidth ?? null);

  return (
    <Popover open={popoverOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={wrapperRef} className={cn('relative', wrapperClassName)}>
          {leadingIcon && (
            <span className={cn('pointer-events-none absolute left-3 top-3 text-slate-400', leadingIconClassName)}>
              {leadingIcon}
            </span>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            aria-autocomplete="list"
            aria-controls={popoverOpen ? listId : undefined}
            aria-expanded={popoverOpen}
            aria-activedescendant={popoverOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            onChange={event => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={event => {
              refreshWidth();
              setOpen(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setOpen(false);
              onBlur?.(event);
            }}
            onKeyDown={event => {
              handleKeyDown(event);
              onKeyDown?.(event);
            }}
            className={className}
            {...props}
          />
        </div>
      </PopoverAnchor>
      <SuggestionList
        id={listId}
        open={popoverOpen}
        width={width}
        activeIndex={activeIndex}
        visibleSuggestions={visibleSuggestions}
        emptyText={emptyText}
        onHover={setActiveIndex}
        onChoose={value => {
          chooseSuggestion(value);
          requestAnimationFrame(() => textareaRef.current?.focus());
        }}
      />
    </Popover>
  );
}
