import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Get environment variables
    const apiUrl = process.env.CHAT_API_URL
    const authKey = process.env.CHAT_AUTH_KEY
    
    // Enhanced logging for debugging
    console.log('========== OUTGOING REQUEST ==========')
    console.log('API URL:', apiUrl ? 'Set' : 'NOT SET')
    console.log('API Key:', authKey ? 'Set' : 'NOT SET')
    console.log('FormData contents:')
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.type}, ${value.size} bytes)`)
      } else {
        console.log(`  ${key}:`, value)
      }
    })
    
    if (!apiUrl) {
      throw new Error('CHAT_API_URL is not configured')
    }
    
    // Ensure upload_image field is always present (even if empty)
    if (!formData.has('upload_image')) {
      formData.append('upload_image', '')
      console.log('No image uploaded - added empty upload_image field')
    }
    
    // Forward the request to n8n webhook
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        KEY: authKey || 'Thisisgujjar1.'
      },
      body: formData
    })

    console.log('========== INCOMING RESPONSE ==========')
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Get the response text
    const responseText = await response.text()
    console.log('Response body:', responseText)
    console.log('Response body length:', responseText.length, 'characters')
    console.log('======================================')
    
    // Return the response
    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error in chat API route:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


