import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'

export default function Combobox({ value, onChange, options = [], placeholder, className }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    return options.filter(o => o.toLowerCase().includes(q))
  }, [value, options])

  const computePosition = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownStyle({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  useEffect(() => {
    if (!open) return
    computePosition()
    window.addEventListener('scroll', computePosition, true)
    window.addEventListener('resize', computePosition)
    return () => {
      window.removeEventListener('scroll', computePosition, true)
      window.removeEventListener('resize', computePosition)
    }
  }, [open, computePosition])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e) => {
      if (!inputRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const select = (opt) => {
    onChange(opt)
    setOpen(false)
    setHighlighted(-1)
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    setHighlighted(-1)
    setOpen(true)
  }

  const handleFocus = () => {
    computePosition()
    setOpen(true)
  }

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault()
        setOpen(true)
        setHighlighted(0)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      select(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      setHighlighted(-1)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          style={{ position: 'fixed', zIndex: 9999, ...dropdownStyle }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 m-0 list-none"
        >
          {suggestions.map((opt, i) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => select(opt)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === highlighted
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
