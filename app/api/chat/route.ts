import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Get environment variables
    const apiUrl = process.env.CHAT_API_URL
    const authKey = process.env.CHAT_AUTH_KEY
    
    // Log for debugging (remove in production)
    console.log('API URL:', apiUrl ? 'Set' : 'NOT SET')
    console.log('API Key:', authKey ? 'Set' : 'NOT SET')
    console.log('FormData keys:', Array.from(formData.keys()))
    
    if (!apiUrl) {
      throw new Error('CHAT_API_URL is not configured')
    }
    
    // Forward the request to n8n webhook
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        KEY: authKey || 'Thisisgujjar1.'
      },
      body: formData
    })

    console.log('n8n Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('n8n Error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Get the response text
    const responseText = await response.text()
    console.log('n8n Response:', responseText.substring(0, 200))
    
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


