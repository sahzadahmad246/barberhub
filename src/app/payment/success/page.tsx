"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Get subscription ID from URL params
        const subscriptionId = searchParams.get('subscription_id')
        
        if (subscriptionId) {
          // Verify subscription with our backend
          const response = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_subscription_id: subscriptionId
            }),
          })

          if (response.ok) {
            setMessage('Payment successful! Your subscription is now active.')
            // Check if user has a salon and redirect accordingly
            setTimeout(async () => {
              try {
                // Check if user has a salon
                const salonResponse = await fetch('/api/salon/dashboard')
                if (salonResponse.ok) {
                  // User has a salon, redirect to dashboard
                  router.push('/salon/dashboard?message=Subscription activated successfully!')
                } else {
                  // User doesn't have a salon, redirect to onboarding
                  router.push('/salon/onboard?message=Subscription activated successfully!')
                }
              } catch {
                // Default to onboarding if we can't check
                router.push('/salon/onboard?message=Subscription activated successfully!')
              }
            }, 3000)
          } else {
            const errorData = await response.json()
            setError(errorData.message || 'Payment verification failed')
          }
        } else {
          setError('No subscription ID found')
        }
      } catch (error) {
        console.error('Error handling payment success:', error)
        setError('An error occurred while processing your payment')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      handlePaymentSuccess()
    }
  }, [session, searchParams, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Verifying your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {error ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Payment Error</CardTitle>
              <CardDescription className="text-red-500">
                {error}
              </CardDescription>
            </>
          ) : (
            <>
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-green-600">Payment Successful!</CardTitle>
              <CardDescription className="text-green-500">
                {message}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {error ? (
            <div className="space-y-4">
              <Button 
                onClick={() => router.push('/subscription')}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Redirecting you to salon setup...
              </p>
              <Button 
                onClick={() => router.push('/salon/onboard?message=Subscription activated successfully!')}
                className="w-full"
              >
                Continue to Salon Setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
