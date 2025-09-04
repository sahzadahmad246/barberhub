"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmailVerificationBannerProps {
  email: string
  onDismiss?: () => void
}

export default function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const router = useRouter()

  const handleVerifyNow = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to verification page
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        console.error("Failed to send verification OTP:", data.message)
        // Still redirect to verification page so user can try again
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      }
    } catch (error) {
      console.error("Error sending verification OTP:", error)
      // Still redirect to verification page so user can try again
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Email Verification Required
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your email address <span className="font-medium">{email}</span> is not verified yet. 
                Please verify your email to access all features.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex space-x-3">
            <Button
              onClick={handleVerifyNow}
              disabled={isLoading}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </div>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Verify Now
                </>
              )}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-sm text-yellow-600 hover:text-yellow-800 underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
