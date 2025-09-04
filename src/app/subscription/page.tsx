"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Check, Crown, Star, Zap, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  popular?: boolean
  icon: React.ReactNode
  color: string
}

const plans: SubscriptionPlan[] = [
  {
    id: "trial",
    name: "Trial",
    description: "Perfect for getting started",
    price: { monthly: 0, yearly: 0 },
    features: [
      "1 Salon",
      "2 Staff Members",
      "Basic Queue Management",
      "Basic Booking System",
      "Email Support",
      "30 Days Free"
    ],
    icon: <Star className="h-6 w-6" />,
    color: "bg-blue-500"
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing salons",
    price: { monthly: 29, yearly: 290 },
    features: [
      "1 Salon",
      "5 Staff Members",
      "Advanced Queue Management",
      "Future Booking System",
      "Basic Analytics",
      "Priority Support",
      "WebSocket Notifications"
    ],
    popular: true,
    icon: <Crown className="h-6 w-6" />,
    color: "bg-purple-500"
  },
  {
    id: "pro_plus",
    name: "Pro Plus",
    description: "For professional salons",
    price: { monthly: 49, yearly: 490 },
    features: [
      "1 Salon",
      "Unlimited Staff",
      "Advanced Queue Management",
      "Future Booking System",
      "Advanced Analytics",
      "Review & Rating System",
      "WhatsApp & SMS Notifications",
      "Priority Support",
      "Custom Reports"
    ],
    icon: <Zap className="h-6 w-6" />,
    color: "bg-gradient-to-r from-yellow-400 to-orange-500"
  }
]

export default function SubscriptionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan: string
    status: string
    endDate: string
    isTrial: boolean
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionStatus()
    }
  }, [session])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscriptions/status')
      if (response.ok) {
        const data = await response.json()
        setCurrentSubscription(data.data)
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (planId === 'trial') {
      await handleTrialSubscription()
    } else {
      await handlePaidSubscription(planId)
    }
  }

  const handleTrialSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to salon onboarding
        router.push('/salon/onboard?message=Trial subscription activated!')
      } else {
        alert(data.message || 'Failed to activate trial subscription')
      }
    } catch (error) {
      console.error('Error creating trial subscription:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaidSubscription = async (planId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planId,
          billingCycle
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Payment data received:', data.data)
        // Load Razorpay checkout
        await loadRazorpayCheckout(data.data)
      } else {
        alert(data.message || 'Failed to create order')
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRazorpayCheckout = async (paymentData: {
    razorpayKeyId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    subscriptionId: string;
    customerName: string;
    customerEmail: string;
    customerContact: string;
  }) => {
    try {
      // Check if Razorpay is already loaded
      if ((window as unknown as { Razorpay: unknown }).Razorpay) {
        openRazorpayModal(paymentData)
        return
      }

      // Load Razorpay script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => {
        openRazorpayModal(paymentData)
      }
      script.onerror = () => {
        alert('Failed to load Razorpay. Please try again.')
      }
      document.body.appendChild(script)
    } catch (error) {
      console.error('Error loading Razorpay:', error)
      alert('Failed to load payment gateway. Please try again.')
    }
  }

  const openRazorpayModal = (paymentData: {
    razorpayKeyId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    subscriptionId: string;
    customerName: string;
    customerEmail: string;
    customerContact: string;
  }) => {
    console.log('Opening Razorpay modal with data:', paymentData)
    
    const options = {
      key: paymentData.razorpayKeyId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: paymentData.name,
      description: paymentData.description,
      subscription_id: paymentData.subscriptionId,
      prefill: {
        name: paymentData.customerName,
        email: paymentData.customerEmail,
        contact: paymentData.customerContact
      },
      theme: {
        color: '#2563eb'
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) {
        // Payment successful
        try {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
            }),
          })

          if (verifyResponse.ok) {
            alert('Payment successful! Subscription activated.')
            router.push('/salon/onboard?message=Subscription activated!')
          } else {
            const errorData = await verifyResponse.json()
            alert(`Payment verification failed: ${errorData.message}`)
          }
        } catch (error) {
          console.error('Error verifying payment:', error)
          alert('Payment verification failed. Please contact support.')
        }
      },
      modal: {
        ondismiss: function() {
          alert('Payment cancelled')
        }
      }
    }

    const rzp = new (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay(options)
    rzp.open()
  }


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start your salon management journey with the perfect plan
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Save 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Current Plan: {currentSubscription.plan ? currentSubscription.plan.charAt(0).toUpperCase() + currentSubscription.plan.slice(1) : 'Unknown'}
                </h3>
                <p className="text-blue-700">
                  Status: {currentSubscription.status || 'Unknown'} • 
                  {currentSubscription.isTrial ? ' Trial' : ' Paid'} • 
                  Expires: {currentSubscription.endDate ? new Date(currentSubscription.endDate).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <Button
                onClick={() => router.push('/salon/onboard')}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Manage Salon
              </Button>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                plan.popular ? 'ring-2 ring-purple-500 scale-105' : 'hover:scale-105'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${plan.color} text-white mb-4`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price[billingCycle])}
                  </span>
                  <span className="text-gray-600 ml-2">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>

                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : plan.id === 'trial'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {plan.id === 'trial' ? 'Start Free Trial' : 'Get Started'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            All plans include
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">Bank-grade security with 99.9% uptime guarantee</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy Setup</h3>
              <p className="text-gray-600">Get started in minutes with our intuitive setup</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock support for all your needs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
