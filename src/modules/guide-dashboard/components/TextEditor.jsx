/**
 * TextEditor - Rich text editor with formatting options
 * Supports: bold, italic, links, font sizes (small, medium, large)
 */

import { useState, useRef, useEffect } from 'react';

export default function TextEditor({ value, onChange, placeholder = 'Enter text...' }) {
  const [isFormatted, setIsFormatted] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    // Check if value contains HTML tags
    if (value && typeof value === 'string') {
      const hasHtml = /<[^>]+>/.test(value);
      setIsFormatted(hasHtml);
    }
  }, [value]);

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      editorRef.current?.focus();
      updateContent();
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      setIsFormatted(true);
    }
  };

  const handleInput = () => {
    updateContent();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  };

  const setFontSize = (size) => {
    // Remove existing font-size styles
    document.execCommand('removeFormat', false);
    
    // Apply new font size
    const sizeMap = {
      small: '14px',
      medium: '16px',
      large: '20px'
    };
    
    document.execCommand('fontSize', false, '7'); // Use font tag for compatibility
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = sizeMap[size];
      try {
        range.surroundContents(span);
      } catch (e) {
        // If surroundContents fails, insert the span
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editorRef.current?.focus();
    updateContent();
  };

  return (
    <div style={{
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => handleFormat('italic')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontStyle: 'italic'
          }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={handleLink}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Insert Link"
        >
          🔗
        </button>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => setFontSize('small')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
          title="Small"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => setFontSize('medium')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Medium"
        >
          M
        </button>
        <button
          type="button"
          onClick={() => setFontSize('large')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          title="Large"
        >
          L
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        style={{
          minHeight: '150px',
          padding: '12px',
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#111827',
          outline: 'none'
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
        [contenteditable] strong {
          font-weight: bold;
        }
        [contenteditable] em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

