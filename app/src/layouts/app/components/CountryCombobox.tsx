import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'

interface CountryResult {
  name: string
}

interface Props {
  value: string
  onChange: (country: string) => void
}

const CountryCombobox = ({ value, onChange }: Props) => {
  const [inputValue, setInputValue] = useState(value)
  const [results, setResults] = useState<CountryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Sync external value resets (e.g. form clear)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setResults([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    onChange('') // clear confirmed selection while typing

    if (val.trim().length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Cancel previous in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    setIsOpen(true)
    try {
      const res = await fetch(
        `https://api.restcountries.com/countries/v5?q=${encodeURIComponent(val.trim())}&limit=10`,
        {
          headers: {
            Authorization: 'Bearer rc_live_d559b6801a504a21805cd2ef7f6a2d54',
          },
          signal: abortRef.current.signal,
        },
      )

      // 404 = no country matched — treat as empty list, not an error
      if (res.status === 404) {
        setResults([])
      } else if (res.ok) {
        const data: Array<{ name: { common: string } }> = await res.json()
        const formatted: CountryResult[] = data
          .map((c) => ({ name: c.name.common }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setResults(formatted)
      } else {
        setResults([])
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setResults([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (name: string) => {
    setInputValue(name)
    onChange(name)
    setResults([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setResults([])
    }
  }

  return (
    <div className='relative' ref={containerRef}>
      <div className='relative'>
        <input
          autoComplete='off'
          className='w-full rounded-lg border border-gray-4 bg-surface px-3 py-2.5 pr-8 text-sm text-gray-13 transition-all outline-none placeholder:text-gray-8 hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
          id='country'
          name='country'
          placeholder='Search country...'
          type='text'
          value={inputValue}
          onChange={handleInput}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2'>
          {isLoading ? (
            <Icon
              className='size-3.5 animate-spin text-gray-9'
              name='lucide:loader-2'
            />
          ) : (
            <Icon className='size-3.5 text-gray-9' name='lucide:search' />
          )}
        </span>
      </div>

      {isOpen && results.length > 0 && (
        <ul className='animate-in fade-in slide-in-from-top-1 absolute top-[calc(100%+4px)] left-0 z-30 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-3 bg-surface shadow-lg duration-150'>
          {results.map((c) => (
            <li key={c.name}>
              <button
                className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-12 transition-colors hover:bg-primary-2 hover:text-primary-11 active:scale-[0.99]'
                type='button'
                onClick={() => handleSelect(c.name)}
              >
                <Icon
                  className='size-3.5 shrink-0 text-gray-9'
                  name='lucide:map-pin'
                />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen &&
        !isLoading &&
        inputValue.trim().length > 0 &&
        results.length === 0 && (
          <div className='animate-in fade-in absolute top-[calc(100%+4px)] left-0 z-30 w-full rounded-xl border border-gray-3 bg-surface px-3 py-3 shadow-lg duration-150'>
            <p className='text-center text-xs text-gray-9'>
              No countries found
            </p>
          </div>
        )}
    </div>
  )
}

CountryCombobox.displayName = 'CountryCombobox'
export default CountryCombobox
