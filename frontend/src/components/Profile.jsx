import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux'
import { addUser } from '../utils/userSlice'
import { BASE_URL } from '../utils/constants'
import { useTheme } from '../utils/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'

// Using backend proxy to avoid CORS issues

const Profile = () => {
  const user = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    photourl: '',
    about: '',
    gender: '',
    age: '',
    skills: [],
    college: '',
    course: '',
    branch: '',
    city: '',
    state: '',
    interestedToConnectWith: ''
  })
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  
  // College autocomplete states
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('')
  const [collegeSuggestions, setCollegeSuggestions] = useState([])
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false)
  const [collegeSearchLoading, setCollegeSearchLoading] = useState(false)
  const collegeInputRef = useRef(null)
  const collegeDropdownRef = useRef(null)
  
  const { isDark, bg, text, border, card, button } = useTheme()

  useEffect(() => {
    if (user) {
      setFormData({
        photourl: user.photourl || '',
        about: user.about || '',
        gender: user.gender || '',
        age: user.age || '',
        skills: user.skills || [],
        college: user.college || '',
        course: user.course || '',
        branch: user.branch || '',
        city: user.city || '',
        state: user.state || '',
        interestedToConnectWith: user.interestedToConnectWith || ''
      })
      setCollegeSearchQuery(user.college || '')
      setPhotoPreview(user.photourl || null)
      setProfileCompletion(user.profileCompletion || 0)
      setIsProfileComplete(user.isProfileComplete || false)
    }
  }, [user])

  // Fetch profile completion status
  useEffect(() => {
    const fetchCompletion = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/profile/completion`, {
          withCredentials: true
        })
        setProfileCompletion(res.data.profileCompletion || 0)
        setIsProfileComplete(res.data.isProfileComplete || false)
      } catch (err) {
        console.error('Error fetching profile completion:', err)
      }
    }
    if (user) {
      fetchCompletion()
    }
  }, [user])

  // Handle click outside to close college dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        collegeDropdownRef.current &&
        !collegeDropdownRef.current.contains(event.target) &&
        collegeInputRef.current &&
        !collegeInputRef.current.contains(event.target)
      ) {
        setShowCollegeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Debounced college search
  useEffect(() => {
    if (!collegeSearchQuery || collegeSearchQuery.length < 2) {
      setCollegeSuggestions([])
      setShowCollegeDropdown(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchColleges(collegeSearchQuery)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [collegeSearchQuery])

  const searchColleges = async (keyword) => {
    if (!keyword || keyword.length < 2) {
      setCollegeSuggestions([])
      return
    }

    setCollegeSearchLoading(true)
    try {
      const response = await axios.post(
        `${BASE_URL}/colleges/search`,
        { keyword: keyword },
        { withCredentials: true }
      )

      if (response.data?.data && Array.isArray(response.data.data)) {
        setCollegeSuggestions(response.data.data)
        setShowCollegeDropdown(response.data.data.length > 0)
      } else {
        setCollegeSuggestions([])
        setShowCollegeDropdown(false)
      }
    } catch (error) {
      console.error('Error searching colleges:', error)
      setCollegeSuggestions([])
      setShowCollegeDropdown(false)
    } finally {
      setCollegeSearchLoading(false)
    }
  }

  const handleCollegeSelect = (college) => {
    setFormData(prev => ({
      ...prev,
      college: college.name
    }))
    setCollegeSearchQuery(college.name)
    setShowCollegeDropdown(false)
    setCollegeSuggestions([])
  }

  const handleCollegeInputChange = (e) => {
    const value = e.target.value
    setCollegeSearchQuery(value)
    setFormData(prev => ({
      ...prev,
      college: value
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle age input to ensure it's stored correctly
  const handleAgeChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      age: value === '' ? '' : value
    }))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && formData.skills.length < 10) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setPhotoFile(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // Convert canvas to data URL with compression
          try {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
            resolve(compressedDataUrl)
          } catch (error) {
            // Fallback to original if compression fails
            console.error('Compression error:', error)
            resolve(e.target.result)
          }
        }
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let photourl = formData.photourl

      // If a new photo file was selected, compress and convert to data URL
      if (photoFile) {
        try {
          photourl = await compressImage(photoFile)
        } catch (compressionError) {
          console.error('Image compression error:', compressionError)
          // Fallback to original file if compression fails
          const reader = new FileReader()
          photourl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(photoFile)
          })
        }
      }

      // Prepare data - convert age to number if it exists
      const submitData = {
        ...formData,
        photourl: photourl,
        age: formData.age ? Number(formData.age) : formData.age
      }

      const res = await axios.patch(
        BASE_URL + "/profile/edit",
        submitData,
        { withCredentials: true }
      )
      
      dispatch(addUser(res.data.user))
      
      // Update completion status
      if (res.data.user.profileCompletion !== undefined) {
        setProfileCompletion(res.data.user.profileCompletion)
        setIsProfileComplete(res.data.user.isProfileComplete)
      }
      
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setPhotoFile(null) // Clear the file after successful upload
      
      // If profile is now complete, refresh user data
      if (res.data.user.isProfileComplete && !isProfileComplete) {
        setTimeout(() => {
          window.location.reload() // Refresh to update user state
        }, 1500)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className={`mt-4 ${text.secondary}`}>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg.primary} py-6 sm:py-8 px-4 transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h1>
        </div>

        <div className={`${card.bg} rounded-3xl ${card.shadow} overflow-hidden`}>
          {/* Profile Header with Image */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
              <div className="relative">
                    <img
                      src={getImageUrl(user.photourl)}
                      alt={user.firstName}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200'
                      }}
                    />
                {isEditing && (
                  <div className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-full p-2 cursor-pointer hover:bg-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-8">
            {/* Name and Basic Info */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold ${text.primary} mb-2`}>
                {user.firstName} {user.lastName}
              </h2>
              <p className={`${text.secondary} text-sm sm:text-base break-all`}>{user.emailId}</p>
            </div>

            {/* Profile Completion Banner */}
            {!isProfileComplete && (
              <div className={`mb-6 p-4 ${isDark ? 'bg-yellow-500/10 border-yellow-500' : 'bg-yellow-50 border-yellow-400'} border-l-4 rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
                    Complete Your Profile for Better Recommendations
                  </h3>
                  <span className={`text-2xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {profileCompletion}%
                  </span>
                </div>
                <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'} mb-3`}>
                  Complete 100% of your profile to access all features like Feed, Requests, and Connections.
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div 
                    className={`h-2.5 rounded-full ${profileCompletion === 100 ? 'bg-green-500' : 'bg-yellow-500'} transition-all duration-300`}
                    style={{ width: `${profileCompletion}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Required:</strong> College, Course, Branch, Skills, Age, Gender
                  {' • '}
                  <strong>Optional:</strong> About, Photo, City, State
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className={`mb-4 p-3 ${isDark ? 'bg-red-500/10' : 'bg-red-100'} border-l-4 border-red-500 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg`}>
                {error}
              </div>
            )}
            {success && (
              <div className={`mb-4 p-3 ${isDark ? 'bg-green-500/10' : 'bg-green-100'} border-l-4 border-green-500 ${isDark ? 'text-green-400' : 'text-green-700'} rounded-lg`}>
                {success}
              </div>
            )}

            {!isEditing ? (
              /* View Mode */
              <div className="space-y-6">
                {/* About */}
                <div>
                  <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>About</h3>
                  <p className={`${text.secondary} ${bg.tertiary} p-4 rounded-xl`}>
                    {user.about || 'No bio yet. Add one to tell others about yourself!'}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.age && (
                    <div>
                      <h3 className={`text-sm font-semibold ${text.muted} mb-1`}>Age</h3>
                      <p className={text.primary}>{user.age} years</p>
                    </div>
                  )}
                  {user.gender && (
                    <div>
                      <h3 className={`text-sm font-semibold ${text.muted} mb-1`}>Gender</h3>
                      <p className={`${text.primary} capitalize`}>{user.gender}</p>
                    </div>
                  )}
                  {user.interestedToConnectWith && (
                    <div>
                      <h3 className={`text-sm font-semibold ${text.muted} mb-1`}>Interested to Connect With</h3>
                      <p className={`${text.primary} capitalize`}>
                        {user.interestedToConnectWith === 'both' ? 'Both (Male & Female)' : user.interestedToConnectWith}
                      </p>
                    </div>
                  )}
                </div>

                {/* Education Details */}
                {(user.college || user.course || user.branch) && (
                  <div>
                    <h3 className={`text-lg font-semibold ${text.primary} mb-3`}>Education</h3>
                    <div className={`${bg.tertiary} p-4 rounded-xl space-y-2`}>
                      {user.college && (
                        <div>
                          <span className={`text-sm font-semibold ${text.muted}`}>College: </span>
                          <span className={text.primary}>{user.college}</span>
                        </div>
                      )}
                      {user.course && (
                        <div>
                          <span className={`text-sm font-semibold ${text.muted}`}>Course: </span>
                          <span className={text.primary}>{user.course}</span>
                        </div>
                      )}
                      {user.branch && (
                        <div>
                          <span className={`text-sm font-semibold ${text.muted}`}>Branch: </span>
                          <span className={text.primary}>{user.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <h3 className={`text-lg font-semibold ${text.primary} mb-3`}>Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className={`px-4 py-2 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'} rounded-full text-sm font-medium`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className={`w-full ${button.primary} py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              /* Edit Mode */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Upload */}
                <div>
                  <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                    Profile Photo
                  </label>
                  
                  {/* Photo Preview */}
                  <div className="mb-4 flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={photoPreview || getImageUrl(user.photourl)}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-pink-500/30"
                      />
                      {photoFile && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="photo-upload"
                        className={`inline-block px-4 py-2 ${button.primary} rounded-lg cursor-pointer text-sm font-medium transition-all hover:shadow-lg`}
                      >
                        📷 Choose Photo
                      </label>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      {photoFile && (
                        <p className={`text-xs ${text.muted} mt-2`}>
                          Selected: {photoFile.name}
                        </p>
                      )}
                      <p className={`text-xs ${text.muted} mt-1`}>
                        Supported: JPG, PNG, GIF (Max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* About */}
                <div>
                  <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                    About
                  </label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleInputChange}
                    placeholder="Tell others about yourself..."
                    rows="4"
                    className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none resize-none placeholder-gray-400`}
                  />
                </div>

                {/* Age and Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleAgeChange}
                      placeholder="25"
                      min="0"
                      max="120"
                      className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none`}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                </div>

                {/* Interested to Connect With */}
                <div>
                  <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                    Interested to Connect With <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <select
                    name="interestedToConnectWith"
                    value={formData.interestedToConnectWith}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none`}
                  >
                    <option value="">Select Option (Optional)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="both">Both (Male & Female)</option>
                  </select>
                  <p className={`text-xs ${text.muted} mt-1`}>
                    Select who you're interested in connecting with for collaboration or coding
                  </p>
                </div>

                {/* Education Details */}
                <div>
                  <h3 className={`text-lg font-semibold ${text.primary} mb-4`}>Education</h3>
                  <div className="space-y-4">
                    {/* College */}
                    <div className="relative">
                      <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                        College Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={collegeInputRef}
                          type="text"
                          name="college"
                          value={collegeSearchQuery}
                          onChange={handleCollegeInputChange}
                          onFocus={() => {
                            if (collegeSuggestions.length > 0) {
                              setShowCollegeDropdown(true)
                            }
                          }}
                          placeholder="Search for your college..."
                          maxLength="100"
                          className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                        />
                        {collegeSearchLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-pink-500"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* College Suggestions Dropdown */}
                      {showCollegeDropdown && collegeSuggestions.length > 0 && (
                        <div
                          ref={collegeDropdownRef}
                          className={`absolute z-50 w-full mt-2 ${bg.input} ${border.secondary} border-2 rounded-xl shadow-2xl max-h-64 overflow-y-auto`}
                        >
                          {collegeSuggestions.map((college, idx) => (
                            <div
                              key={college.id || idx}
                              onClick={() => handleCollegeSelect(college)}
                              className={`px-4 py-3 cursor-pointer hover:${isDark ? 'bg-pink-500/20' : 'bg-pink-50'} transition-colors border-b ${border.secondary} last:border-b-0`}
                            >
                              <div className={`font-semibold ${text.primary} text-sm`}>
                                {college.name}
                              </div>
                              <div className={`text-xs ${text.muted} mt-1`}>
                                {college.state && `${college.state}`}
                                {college.district && ` • ${college.district}`}
                                {college.type && ` • ${college.type}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Course and Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                          Course <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="course"
                          value={formData.course}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none`}
                        >
                          <option value="">Select Course</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="B.E">B.E</option>
                          <option value="M.E">M.E</option>
                          <option value="Diploma">Diploma</option>
                          <option value="B.Sc">B.Sc</option>
                          <option value="M.Sc">M.Sc</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                          <option value="BBA">BBA</option>
                          <option value="MBA">MBA</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                          Branch/Specialization <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="branch"
                          value={formData.branch}
                          onChange={handleInputChange}
                          placeholder="e.g., Computer Science, Electrical"
                          maxLength="50"
                          className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* City and State (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                        City <span className="text-xs text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city name"
                        maxLength="50"
                        className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                        State <span className="text-xs text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Enter state name"
                        maxLength="50"
                        className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className={`block text-sm font-semibold ${text.primary} mb-2`}>
                    Skills ({formData.skills.length}/10) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSkill()
                        }
                      }}
                      placeholder="Add a skill"
                      className={`flex-1 px-4 py-2 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                      disabled={formData.skills.length >= 10}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={formData.skills.length >= 10 || !newSkill.trim()}
                      className={`px-6 py-2 ${button.primary} rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className={`px-4 py-2 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'} rounded-full text-sm font-medium flex items-center gap-2`}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          className="hover:text-red-500 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setError('')
                      setSuccess('')
                      setPhotoFile(null)
                      setPhotoPreview(null)
                      if (user) {
                        setFormData({
                          photourl: user.photourl || '',
                          about: user.about || '',
                          gender: user.gender || '',
                          age: user.age || '',
                          skills: user.skills || [],
                          college: user.college || '',
                          course: user.course || '',
                          branch: user.branch || '',
                          city: user.city || '',
                          state: user.state || '',
                          interestedToConnectWith: user.interestedToConnectWith || ''
                        })
                        setPhotoPreview(user.photourl || null)
                      }
                    }}
                    className={`flex-1 px-6 py-3 ${button.secondary} rounded-xl font-semibold transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-6 py-3 ${button.primary} rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none`}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile