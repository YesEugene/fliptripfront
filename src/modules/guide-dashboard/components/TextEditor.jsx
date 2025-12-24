/**
 * TextEditor - Rich text editor with formatting options
 * Supports: bold, italic, links, font sizes (small, medium, large)
 */

import { useState, useRef, useEffect } from 'react';

export default function TextEditor({ value, onChange, placeholder = 'Enter text...' }) {
  const [isFormatted, setIsFormatted] = useState(false);
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    // Check if value contains HTML tags
    if (value && typeof value === 'string') {
      const hasHtml = /<[^>]+>/.test(value);
      setIsFormatted(hasHtml);
    }
  }, [value]);

  // Initialize and sync value prop with editor content
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      const newValue = value || '';
      
      // Only update if content is different to avoid infinite loops
      if (currentContent !== newValue && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        // Save cursor position if possible
        const selection = window.getSelection();
        let cursorPosition = null;
        if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          cursorPosition = range.startOffset;
        }
        
        editorRef.current.innerHTML = newValue;
        
        // Restore cursor position if possible
        if (cursorPosition !== null && editorRef.current.firstChild) {
          try {
            const newRange = document.createRange();
            const textNode = editorRef.current.firstChild.nodeType === Node.TEXT_NODE 
              ? editorRef.current.firstChild 
              : editorRef.current.firstChild.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              const offset = Math.min(cursorPosition, textNode.textContent.length);
              newRange.setStart(textNode, offset);
              newRange.setEnd(textNode, offset);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } catch (e) {
            // Ignore cursor restoration errors
          }
        }
        
        isUpdatingRef.current = false;
      }
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
    if (editorRef.current && !isUpdatingRef.current) {
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
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      // If no selection, select all text
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        // If collapsed, select the word at cursor
        range.expand('word');
      }
      
      // Remove existing font-size styles from selection
      const selectedText = range.extractContents();
      
      // Apply new font size
      const sizeMap = {
        small: '14px',
        medium: '16px',
        large: '20px'
      };
      
      const span = document.createElement('span');
      span.style.fontSize = sizeMap[size];
      span.style.lineHeight = '1.6'; // Keep consistent line height
      span.appendChild(selectedText);
      
      try {
        range.insertNode(span);
      } catch (e) {
        // If insert fails, try alternative method
        range.deleteContents();
        range.insertNode(span);
      }
      
      // Move cursor to end of inserted span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.setEndAfter(span);
      selection.addRange(newRange);
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
        suppressContentEditableWarning
        style={{
          minHeight: '150px',
          padding: '12px',
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#111827',
          outline: 'none',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'embed'
        }}
        dir="ltr"
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
        [contenteditable] {
          direction: ltr !important;
          text-align: left !important;
        }
        [contenteditable] span[style*="font-size"] {
          line-height: 1.6 !important;
        }
      `}</style>
    </div>
  );
}

