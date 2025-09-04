"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { FormField, PasswordField } from "@/components/ui/form-field"
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton"
import { useAuth } from "@/lib/auth-client"
import { useFormValidation, validationRuleSets } from "@/lib/client-validation"
import { getErrorMessage, getErrorSuggestions } from "@/lib/error-messages"
import { Lock, AlertCircle, CheckCircle } from "lucide-react"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const { values, errors, warnings, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    email: string
    password: string
  }>(
    {
      email: "",
      password: "",
    },
    validationRuleSets.login as Record<"email" | "password", import("@/lib/client-validation").ValidationRule[]>,
  )

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  // Get messages from URL params
  const urlMessage = searchParams.get("message")
  const urlError = searchParams.get("error")

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const callbackUrl = searchParams.get("callbackUrl") || "/profile"
      router.push(callbackUrl)
    }
  }, [isAuthenticated, router, searchParams])

  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    setIsLoading(true)
    setApiError("")
    clearErrors()

    try {
      // Use NextAuth signIn with credentials provider
      const result = await signIn("credentials", {
        email: values.email.toLowerCase().trim(),
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        // Handle specific error cases with user-friendly messages
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setApiError("Please verify your email address to continue. Check your inbox for a verification link.")
        } else if (result.error === "INVALID_CREDENTIALS") {
          setApiError("Incorrect email or password. Please try again.")
        } else if (result.error === "USER_NOT_FOUND") {
          setApiError("No account found with this email address. Please check your email or create a new account.")
        } else {
          const errorMessage = getErrorMessage(result.error, "login")
          setApiError(errorMessage)
        }
      } else if (result?.ok) {
        // Successful login - redirect to profile or intended page
        const callbackUrl = searchParams.get("callbackUrl") || "/profile"
        router.push(callbackUrl)
      }
    } catch (error) {
      console.error("Login error:", error)
      setApiError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <Lock className="h-8 w-8 text-gray-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your Barber Hub account</p>
          </div>

          <div className="space-y-6">
          {/* URL Messages */}
          {urlMessage && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Success</p>
                  <p>{urlMessage}</p>
                </div>
              </div>
            </div>
          )}

          {urlError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Error</p>
                  <p>{urlError}</p>
                </div>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Error</p>
                  <p>{apiError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          <div>
            <GoogleOAuthButton
              text="Continue with Google"
              callbackUrl={searchParams.get("callbackUrl") || "/profile"}
              disabled={isLoading}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-400" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-black">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <FormField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                value={values.email}
                onChange={(value) => handleChange("email", value as string)}
                onBlur={() => handleBlur("email")}
                error={touched.email ? errors.email : undefined}
                warning={touched.email ? warnings.email : undefined}
                suggestions={touched.email && errors.email ? getErrorSuggestions("INVALID_EMAIL") : []}
                required
                disabled={isLoading}
                autoComplete="email"
              />

              {/* Password Field */}
              <PasswordField
                id="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={values.password}
                onChange={(value) => handleChange("password", value as string)}
                onBlur={() => handleBlur("password")}
                error={touched.password ? errors.password : undefined}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-black hover:text-gray-700 underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-medium text-black hover:text-gray-700 transition-colors">
                Sign up here
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
