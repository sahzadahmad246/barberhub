"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BusinessHours {
  [key: string]: {
    open: string
    close: string
    isOpen: boolean
  }
}

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '18:00', isOpen: true },
  tuesday: { open: '09:00', close: '18:00', isOpen: true },
  wednesday: { open: '09:00', close: '18:00', isOpen: true },
  thursday: { open: '09:00', close: '18:00', isOpen: true },
  friday: { open: '09:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '18:00', isOpen: true },
  sunday: { open: '09:00', close: '18:00', isOpen: false }
}

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

function SalonOnboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [salonData, setSalonData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    contact: {
      phone: '',
      email: session?.user?.email || '',
      whatsapp: ''
    },
    businessHours: defaultBusinessHours,
    description: '',
    amenities: [] as string[]
  })

  const [message, setMessage] = useState('')

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

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setSalonData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as Record<string, unknown>),
          [child]: value
        }
      }))
    } else {
      setSalonData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleBusinessHoursChange = (day: string, field: string, value: string | boolean) => {
    setSalonData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }))
  }

  const handleAmenityToggle = (amenity: string) => {
    setSalonData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/salon/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salonData),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/salon/dashboard?message=Salon created successfully!')
      } else {
        alert(data.message || 'Failed to create salon')
      }
    } catch (error) {
      console.error('Error creating salon:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return salonData.name && salonData.address.street && salonData.address.city && salonData.address.state && salonData.address.pincode
      case 2:
        return salonData.contact.phone
      case 3:
        return true // Business hours are optional
      case 4:
        return true // Description and amenities are optional
      default:
        return false
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Your Salon
          </h1>
                      <p className="text-gray-600">
              Let&apos;s get your salon ready to manage customers and bookings
            </p>
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

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>Contact</span>
            <span>Hours</span>
            <span>Details</span>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Basic Information'}
              {currentStep === 2 && 'Contact Details'}
              {currentStep === 3 && 'Business Hours'}
              {currentStep === 4 && 'Additional Details'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Tell us about your salon'}
              {currentStep === 2 && 'How can customers reach you?'}
              {currentStep === 3 && 'When is your salon open?'}
              {currentStep === 4 && 'Add some finishing touches'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label htmlFor="name">Salon Name *</Label>
                  <Input
                    id="name"
                    value={salonData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your salon name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={salonData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    placeholder="Enter street address"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={salonData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={salonData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      placeholder="State"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={salonData.address.pincode}
                      onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                      placeholder="Pincode"
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={salonData.contact.phone}
                    onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={salonData.contact.email}
                    onChange={(e) => handleInputChange('contact.email', e.target.value)}
                    placeholder="Enter email address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number (Optional)</Label>
                  <Input
                    id="whatsapp"
                    value={salonData.contact.whatsapp}
                    onChange={(e) => handleInputChange('contact.whatsapp', e.target.value)}
                    placeholder="Enter WhatsApp number"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Step 3: Business Hours */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {days.map((day) => (
                  <div key={day.key} className="flex items-center space-x-4">
                    <div className="w-24">
                      <Label>{day.label}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={salonData.businessHours[day.key].isOpen}
                        onChange={(e) => handleBusinessHoursChange(day.key, 'isOpen', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Open</span>
                    </div>
                    {salonData.businessHours[day.key].isOpen && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={salonData.businessHours[day.key].open}
                          onChange={(e) => handleBusinessHoursChange(day.key, 'open', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-gray-600">to</span>
                        <Input
                          type="time"
                          value={salonData.businessHours[day.key].close}
                          onChange={(e) => handleBusinessHoursChange(day.key, 'close', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Additional Details */}
            {currentStep === 4 && (
              <>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    value={salonData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tell customers about your salon..."
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Amenities (Optional)</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['WiFi', 'Parking', 'AC', 'Music', 'Magazines', 'Coffee', 'Water', 'Charging Station'].map((amenity) => (
                      <button
                        key={amenity}
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`p-2 rounded-md border text-sm ${
                          salonData.amenities.includes(amenity)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={!isStepValid()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Salon
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SalonOnboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SalonOnboardContent />
    </Suspense>
  )
}
