"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { MapPin, Phone, Mail, Clock, Users, Calendar, TrendingUp, Check, Loader2, CreditCard, Pause, Play, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Salon {
  id: string
  name: string
  slug: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
    country: string
  }
  contact: {
    phone: string
    email: string
    whatsapp?: string
  }
  isVerified: boolean
  isActive: boolean
  stats: {
    totalCustomers: number
    totalBookings: number
    totalRevenue: number
    averageRating: number
    totalReviews: number
  }
}

interface Subscription {
  id: string
  plan: string
  status: string
  startDate: string
  endDate: string
  amount: number
  billingCycle: string
  isTrial: boolean
  razorpayOrderId?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelAtCycleEnd?: boolean
  benefitsEndDate?: string
  hasActiveBenefits?: boolean
}

function SalonDashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg) {
      setMessage(msg)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchSalonData = async () => {
      try {
        const [salonResponse, subscriptionResponse] = await Promise.all([
          fetch('/api/salon/dashboard'),
          fetch('/api/subscriptions/status')
        ])
        
        if (salonResponse.ok) {
          const salonData = await salonResponse.json()
          setSalon(salonData.data.salon)
        } else {
          // If no salon found, redirect to onboarding
          router.push('/salon/onboard')
          return
        }

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          if (subscriptionData.data.hasSubscription) {
            setSubscription(subscriptionData.data.subscription)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/salon/onboard')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchSalonData()
    }
  }, [session, router])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/subscriptions/manage')
      if (response.ok) {
        const data = await response.json()
        // Open Razorpay subscription management page
        window.open(data.data.shortUrl, '_blank')
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error getting billing management URL:', error)
      setMessage('Error accessing billing management')
    }
  }

  const handleViewInvoices = async () => {
    try {
      const response = await fetch('/api/subscriptions/invoices')
      if (response.ok) {
        const data = await response.json()
        // For now, just show the count. You can create a modal or new page to display invoices
        setMessage(`Found ${data.data.count} invoices. Check console for details.`)
        console.log('Invoices:', data.data.invoices)
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setMessage('Error fetching invoices')
    }
  }

  const handleSubscriptionAction = async (action: 'pause' | 'resume' | 'cancel') => {
    setIsManagingSubscription(true)
    try {
      const response = await fetch(`/api/subscriptions/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        // Refresh subscription data
        const subscriptionResponse = await fetch('/api/subscriptions/status')
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          if (subscriptionData.data.hasSubscription) {
            setSubscription(subscriptionData.data.subscription)
          }
        }
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error)
      setMessage(`Error ${action}ing subscription`)
    } finally {
      setIsManagingSubscription(false)
    }
  }


  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'paused': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isSubscriptionExpiringSoon = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  if (!session || !salon) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {salon.name}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{salon.address.city}, {salon.address.state}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  <span>{salon.contact.phone}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={salon.isVerified ? "default" : "destructive"}>
                {salon.isVerified ? 'Verified' : 'Pending Verification'}
              </Badge>
              <Badge variant={salon.isActive ? "default" : "destructive"}>
                {salon.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{message}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salon.stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                +0 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salon.stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                +0 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{salon.stats.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">
                +0% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salon.stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {salon.stats.totalReviews} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Management */}
        {subscription && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Management
                </CardTitle>
                <CardDescription>
                  Manage your subscription plan and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Current Plan</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSubscriptionStatusColor(subscription.status)}>
                        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {subscription.billingCycle}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
                    <Badge className={getSubscriptionStatusColor(subscription.status)}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {subscription.isTrial ? 'Trial Expires' : 'Next Billing'}
                    </h4>
                    <p className="text-gray-600">
                      {new Date(subscription.endDate).toLocaleDateString()}
                      {isSubscriptionExpiringSoon(subscription.endDate) && (
                        <AlertTriangle className="h-4 w-4 text-orange-500 inline ml-1" />
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Amount</h4>
                    <p className="text-gray-600">
                      {subscription.isTrial ? 'Free' : `₹${subscription.amount}/${subscription.billingCycle}`}
                    </p>
                  </div>
                </div>

                {/* Subscription Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* Billing Management Button */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleManageBilling}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                  
                  {/* View Invoices Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewInvoices}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  
                  {subscription.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubscriptionAction('pause')}
                        disabled={isManagingSubscription}
                      >
                        {isManagingSubscription ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Pause className="h-4 w-4 mr-2" />
                        )}
                        Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/subscription')}
                      >
                        Change Plan
                      </Button>
                    </>
                  )}
                  
                  {subscription.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubscriptionAction('resume')}
                      disabled={isManagingSubscription}
                    >
                      {isManagingSubscription ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Resume
                    </Button>
                  )}
                  
                  
                  {subscription.status !== 'cancelled' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleSubscriptionAction('cancel')}
                      disabled={isManagingSubscription}
                    >
                      {isManagingSubscription ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Cancelled Subscription Warning */}
                {subscription.status === 'cancelled' && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                      <p className="text-orange-700 text-sm">
                        Your subscription is cancelled but benefits continue until{' '}
                        {subscription.benefitsEndDate 
                          ? new Date(subscription.benefitsEndDate).toLocaleDateString()
                          : new Date(subscription.endDate).toLocaleDateString()
                        }. 
                        You can start a new subscription after this date.
                      </p>
                    </div>
                  </div>
                )}

                {/* Expiry Warning */}
                {subscription.status !== 'cancelled' && isSubscriptionExpiringSoon(subscription.endDate) && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                      <p className="text-orange-700 text-sm">
                        Your subscription expires on {new Date(subscription.endDate).toLocaleDateString()}. 
                        Consider renewing to avoid service interruption.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Salon Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Salon Information</CardTitle>
                <CardDescription>
                  Manage your salon details and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Address</h4>
                  <p className="text-gray-600">
                    {salon.address.street}<br />
                    {salon.address.city}, {salon.address.state} {salon.address.pincode}<br />
                    {salon.address.country}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600">{salon.contact.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600">{salon.contact.email}</span>
                    </div>
                    {salon.contact.whatsapp && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-600">WhatsApp: {salon.contact.whatsapp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline">
                    Edit Salon Details
                  </Button>
                  <Button variant="outline">
                    View Public Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Staff
                </Button>
                <Button className="w-full" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Bookings
                </Button>
                <Button className="w-full" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Manage Queue
                </Button>
                <Button className="w-full" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Salon created successfully</p>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Subscription activated</p>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalonDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SalonDashboardContent />
    </Suspense>
  )
}
