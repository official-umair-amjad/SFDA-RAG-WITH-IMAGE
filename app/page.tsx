'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  imageUrl?: string
}

// Custom component to render formatted text
const FormattedText = ({ text }: { text: string }) => {
  const processText = (rawText: string) => {
    // Split by line breaks first
    const lines = rawText.split('\n')
    const elements: JSX.Element[] = []
    
    lines.forEach((line, lineIndex) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${lineIndex}`} />)
        return
      }
      
      // Process each line for inline formatting
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
      const lineElements: (string | JSX.Element)[] = []
      
      parts.forEach((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          lineElements.push(
            <strong key={`bold-${lineIndex}-${partIndex}`}>
              {part.slice(2, -2)}
            </strong>
          )
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          // Italic text
          lineElements.push(
            <em key={`italic-${lineIndex}-${partIndex}`}>
              {part.slice(1, -1)}
            </em>
          )
        } else if (part.startsWith('`') && part.endsWith('`')) {
          // Inline code
          lineElements.push(
            <code key={`code-${lineIndex}-${partIndex}`} className="bg-gray-300 px-1 py-0.5 rounded text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          )
        } else if (part.trim()) {
          // Regular text
          lineElements.push(part)
        }
      })
      
      if (lineElements.length > 0) {
        elements.push(
          <p key={`line-${lineIndex}`} className="mb-2 last:mb-0">
            {lineElements}
          </p>
        )
      }
    })
    
    return elements
  }
  
  return <div className="markdown-content">{processText(text)}</div>
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle hydration and generate sessionId on client side only
  useEffect(() => {
    setSessionId(uuidv4())
    setIsHydrated(true)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      alert('Please select only PNG, JPG, or JPEG images')
      return
    }
    
    // Validate file size (optional: limit to 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('Image size should be less than 5MB')
      return
    }
    
    setSelectedImage(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Trigger file input click
  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const sendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading || !sessionId) return
  
    const userMessage: Message = {
      id: uuidv4(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined
    }
  
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    const currentImage = selectedImage
    setInputValue('')
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsLoading(true)
  
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData()
      formData.append('chatInput', currentInput)
      formData.append('sessionId', sessionId)
      
      if (currentImage) {
        formData.append('upload_image', currentImage)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      })
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
  
      // Try to parse JSON, fallback to plain text
      const raw = await response.text()
      let processedText: string
  
      try {
        interface BotResponse {
          output: string
        }
        const data: BotResponse = JSON.parse(raw)
        processedText = data.output
          .replace(/\\n/g, '\n')
          .replace(/\*\*(.*?)\*\*/g, '**$1**')
          .replace(/\*(.*?)\*/g, '*$1*')
          .trim()
      } catch {
        // Not JSON → fallback to raw text
        processedText = raw.replace(/\\n/g, '\n').trim()
      }
  
      const botMessage: Message = {
        id: uuidv4(),
        text: processedText,
        isUser: false,
        timestamp: new Date()
      }
  
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: uuidv4(),
        text: 'Sorry, there was an error sending your message. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="bg-teal-600 text-white p-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold">SFDA QA Chatbot</h1>
            <p className="text-primary-100 text-sm">Always here to help</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg font-medium">Welcome to ChatBot!</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`message-bubble ${message.isUser ? 'user-message' : 'bot-message'}`}>
              {message.imageUrl && (
                <div className="message-image-container mb-2">
                  <img 
                    src={message.imageUrl} 
                    alt="Attached" 
                    className="message-image"
                  />
                </div>
              )}
              {message.isUser ? (
                message.text && <p className="text-sm">{message.text}</p>
              ) : (
                <FormattedText text={message.text} />
              )}
              <p className={`text-xs mt-1 ${message.isUser ? 'text-primary-100' : 'text-gray-500'}`}>
                {isHydrated ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="message-bubble bot-message">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Image Preview */}
          {imagePreview && (
            <div className="image-preview-container">
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="image-preview-remove"
                  aria-label="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
            />
            
            {/* Attachment Button */}
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={isLoading || !isHydrated || selectedImage !== null}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              aria-label="Attach image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isHydrated ? "Type your message..." : "Loading..."}
                className="w-full p-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                disabled={isLoading || !isHydrated}
              />
            </div>
            <button
              type="submit"
              disabled={(!inputValue.trim() && !selectedImage) || isLoading || !isHydrated || !sessionId}
              className="px-6 py-2 bg-teal-500 text-white rounded-2xl hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Session ID: {isHydrated && sessionId ? sessionId.slice(0, 8) + '...' : 'Loading...'}
        </p>
      </div>
    </div>
  )
}
